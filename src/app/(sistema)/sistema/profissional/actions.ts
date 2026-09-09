"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireProfessional } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  FIELD_LABEL,
  type PecField,
} from "@/lib/professional/pec/columns";
import {
  PecParseError,
  normalizeName,
  parsePecMatrix,
  type PecIssue,
  type PecRow,
} from "@/lib/professional/pec/parse";
import { PEC_UPLOAD_LIMITS, readPecFile } from "@/lib/professional/pec/workbook";
import {
  encounterSchema,
  examSchema,
  manualPatientSchema,
  riskAssessmentSchema,
  vaccinationSchema,
} from "@/lib/validation/professional";

export type ImportPreview = {
  filename: string;
  sha256: string;
  parserVersion: string;
  headerRow: number;
  recognizedFields: { field: PecField; label: string }[];
  unmappedHeaders: string[];
  totalRows: number;
  duplicatesInFile: number;
  issues: PecIssue[];
  sample: PecRow[];
};

export type PecImportState = {
  status: "idle" | "preview" | "imported" | "error";
  message: string;
  preview?: ImportPreview;
  result?: { rowsRead: number; rowsCreated: number; rowsUpdated: number };
};

const INITIAL_ERROR = (message: string): PecImportState => ({
  status: "error",
  message,
});

/**
 * Lê e valida o arquivo sem gravar nada. O profissional confirma depois.
 *
 * O parsing acontece inteiramente no servidor: o navegador nunca interpreta a
 * planilha, e nenhum dado clínico transita por log.
 */
export async function previewPecImportAction(
  _state: PecImportState,
  formData: FormData,
): Promise<PecImportState> {
  await requireProfessional();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return INITIAL_ERROR("Selecione o arquivo exportado do PEC.");
  }
  if (file.size > PEC_UPLOAD_LIMITS.maxBytes) {
    return INITIAL_ERROR("O arquivo excede o limite de 10 MB.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const matriz = await readPecFile(buffer, file.name);
    const parsed = parsePecMatrix(matriz);

    return {
      status: "preview",
      message: `${parsed.rows.length} gestante(s) prontas para importar.`,
      preview: {
        filename: file.name,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        parserVersion: parsed.parserVersion,
        headerRow: parsed.headerRow,
        recognizedFields: parsed.recognition.recognized.map((field) => ({
          field,
          label: FIELD_LABEL[field],
        })),
        unmappedHeaders: parsed.recognition.unmapped,
        totalRows: parsed.rows.length,
        duplicatesInFile: parsed.duplicatesInFile,
        issues: parsed.issues.slice(0, 50),
        // Amostra curta apenas para conferência visual antes de gravar.
        sample: parsed.rows.slice(0, 5),
      },
    };
  } catch (error) {
    return INITIAL_ERROR(describeParseError(error));
  }
}

/**
 * Grava o lote. O arquivo é reenviado e reprocessado no servidor em vez de
 * confiarmos nas linhas vindas do cliente: aceitar o resultado do preview
 * permitiria forjar registros que nunca estiveram na planilha.
 */
export async function confirmPecImportAction(
  _state: PecImportState,
  formData: FormData,
): Promise<PecImportState> {
  await requireProfessional();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return INITIAL_ERROR("Reenvie o arquivo para confirmar a importação.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const matriz = await readPecFile(buffer, file.name);
    const parsed = parsePecMatrix(matriz);
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const supabase = await createClient();
    const result = await supabase.schema("professional").rpc("import_pec_batch", {
      p_filename: file.name,
      p_sha256: sha256,
      p_parser_version: parsed.parserVersion,
      p_rows: parsed.rows.map((row) => ({
        displayName: row.displayName,
        birthDate: row.birthDate,
        dedupKey: row.dedupKey,
        prenatalStartDate: row.prenatalStartDate,
        dueDate: row.dueDate,
        riskLevel: row.riskLevel,
      })),
    });

    if (result.error) {
      if (result.error.message.includes("already imported")) {
        return INITIAL_ERROR(
          "Este arquivo já foi importado anteriormente. Nada foi duplicado.",
        );
      }
      return INITIAL_ERROR("Não foi possível concluir a importação.");
    }

    const data = result.data as {
      rowsRead: number;
      rowsCreated: number;
      rowsUpdated: number;
    };

    revalidatePath("/sistema/profissional");
    revalidatePath("/sistema/profissional/gestantes");

    return {
      status: "imported",
      message: `Importação concluída: ${data.rowsCreated} nova(s), ${data.rowsUpdated} atualizada(s).`,
      result: data,
    };
  } catch (error) {
    return INITIAL_ERROR(describeParseError(error));
  }
}

export type ManualPatientState = { ok: boolean; message: string };

export async function createPatientAction(
  _state: ManualPatientState,
  formData: FormData,
): Promise<ManualPatientState> {
  await requireProfessional();

  const parsed = manualPatientSchema.safeParse({
    displayName: formData.get("displayName"),
    birthDate: formData.get("birthDate") || undefined,
    prenatalStartDate: formData.get("prenatalStartDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    riskLevel: formData.get("riskLevel") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  const ownerId = auth.data.user?.id;
  if (!ownerId) {
    return { ok: false, message: "Sessão expirada." };
  }

  const { displayName, birthDate } = parsed.data;
  const result = await supabase
    .schema("professional")
    .from("patients")
    .insert({
      // O RLS exige que este valor seja o próprio auth.uid(); enviá-lo aqui é
      // apenas o que o PostgREST precisa, não uma escolha do cliente.
      owner_user_id: ownerId,
      display_name: displayName,
      birth_date: birthDate ?? null,
      prenatal_start_date: parsed.data.prenatalStartDate ?? null,
      due_date: parsed.data.dueDate ?? null,
      risk_level: parsed.data.riskLevel ?? null,
      source: "manual",
      dedup_key: birthDate
        ? `${normalizeName(displayName)}|${birthDate}`
        : null,
    });

  if (result.error) {
    if (result.error.code === "23505") {
      return { ok: false, message: "Já existe uma gestante com esse nome e data de nascimento na sua carteira." };
    }
    return { ok: false, message: "Não foi possível cadastrar a gestante." };
  }

  revalidatePath("/sistema/profissional/gestantes");
  return { ok: true, message: "Gestante cadastrada." };
}

/** Mensagens de erro nunca carregam conteúdo do arquivo nem dado pessoal. */
function describeParseError(error: unknown) {
  if (error instanceof PecParseError) {
    return error.message;
  }
  return "Não foi possível ler o arquivo enviado.";
}

export type ClinicalRecordState = { ok: boolean; message: string };

/**
 * Resolve a paciente pelo identificador público. A consulta passa pelo RLS: se
 * o `public_id` for de outra carteira, simplesmente não retorna — não existe
 * caminho para escrever no prontuário alheio.
 */
async function resolvePatientId(publicId: string) {
  const supabase = await createClient();
  const result = await supabase
    .schema("professional")
    .from("patients")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }
  return (result.data as { id: number }).id;
}

async function insertClinical(
  table: "encounters" | "exams" | "vaccinations" | "risk_assessments",
  publicId: string,
  payload: Record<string, unknown>,
): Promise<ClinicalRecordState> {
  const patientId = await resolvePatientId(publicId);
  if (patientId === null) {
    return { ok: false, message: "Gestante não encontrada na sua carteira." };
  }

  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  const ownerId = auth.data.user?.id;
  if (!ownerId) {
    return { ok: false, message: "Sessão expirada." };
  }

  // owner_user_id é reescrito pelo gatilho `inherit_owner` a partir da
  // paciente; enviá-lo aqui atende ao NOT NULL sem ser a fonte da verdade.
  const result = await supabase
    .schema("professional")
    .from(table)
    .insert({ patient_id: patientId, owner_user_id: ownerId, ...payload });

  if (result.error) {
    return { ok: false, message: "Não foi possível salvar o registro." };
  }

  revalidatePath(`/sistema/profissional/gestantes/${publicId}`);
  revalidatePath("/sistema/profissional");
  return { ok: true, message: "Registro adicionado." };
}

export async function addEncounterAction(
  _state: ClinicalRecordState,
  formData: FormData,
): Promise<ClinicalRecordState> {
  await requireProfessional();
  const parsed = encounterSchema.safeParse({
    patientPublicId: formData.get("patientPublicId"),
    occurredOn: formData.get("occurredOn"),
    kind: formData.get("kind"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return insertClinical("encounters", parsed.data.patientPublicId, {
    occurred_on: parsed.data.occurredOn,
    kind: parsed.data.kind,
    notes: parsed.data.notes ?? null,
  });
}

export async function addExamAction(
  _state: ClinicalRecordState,
  formData: FormData,
): Promise<ClinicalRecordState> {
  await requireProfessional();
  const parsed = examSchema.safeParse({
    patientPublicId: formData.get("patientPublicId"),
    examType: formData.get("examType"),
    collectedOn: formData.get("collectedOn") || undefined,
    result: formData.get("result") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return insertClinical("exams", parsed.data.patientPublicId, {
    exam_type: parsed.data.examType,
    collected_on: parsed.data.collectedOn ?? null,
    result: parsed.data.result ?? null,
  });
}

export async function addVaccinationAction(
  _state: ClinicalRecordState,
  formData: FormData,
): Promise<ClinicalRecordState> {
  await requireProfessional();
  const parsed = vaccinationSchema.safeParse({
    patientPublicId: formData.get("patientPublicId"),
    vaccine: formData.get("vaccine"),
    appliedOn: formData.get("appliedOn") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return insertClinical("vaccinations", parsed.data.patientPublicId, {
    vaccine: parsed.data.vaccine,
    applied_on: parsed.data.appliedOn ?? null,
  });
}

export async function addRiskAssessmentAction(
  _state: ClinicalRecordState,
  formData: FormData,
): Promise<ClinicalRecordState> {
  await requireProfessional();
  const parsed = riskAssessmentSchema.safeParse({
    patientPublicId: formData.get("patientPublicId"),
    level: formData.get("level"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const state = await insertClinical("risk_assessments", parsed.data.patientPublicId, {
    level: parsed.data.level,
  });
  if (!state.ok) return state;

  // A classificação corrente também fica na paciente, para a listagem e os
  // alertas não precisarem de subconsulta.
  const supabase = await createClient();
  await supabase
    .schema("professional")
    .from("patients")
    .update({ risk_level: parsed.data.level })
    .eq("public_id", parsed.data.patientPublicId);

  revalidatePath("/sistema/profissional/gestantes");
  return state;
}
