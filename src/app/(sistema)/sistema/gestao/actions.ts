"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireMunicipalManagement } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  SiapsParseError,
  parseSiapsMatrix,
  recomposeC3,
  type SiapsIssue,
} from "@/lib/siaps/parse";
import { SIAPS_UPLOAD_LIMITS, readSiapsFile } from "@/lib/siaps/workbook";

export type SiapsImportState = {
  status: "idle" | "preview" | "ingested" | "error";
  message: string;
  preview?: {
    filename: string;
    competencyLabel: string;
    competency: string;
    municipality: string;
    sourceStatus: string | null;
    generatedAt: string | null;
    teamTypeFilter: string | null;
    teamsTotal: number;
    denominator: number;
    pointsTotal: number;
    recomposedC3: number | null;
    checksumFailures: number;
    issues: SiapsIssue[];
  };
  ingest?: {
    importId: string;
    rowsTotal: number;
    rowsEligible: number;
    rowsExcluded: number;
    rowsUnclassified: number;
    publicationBlock: string | null;
  };
};

const fail = (message: string): SiapsImportState => ({
  status: "error",
  message,
});

/** Lê e confere o relatório sem gravar nada. */
export async function previewSiapsAction(
  _state: SiapsImportState,
  formData: FormData,
): Promise<SiapsImportState> {
  await requireMunicipalManagement();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Selecione o relatório XLSX exportado do SIAPS.");
  }
  if (file.size > SIAPS_UPLOAD_LIMITS.maxBytes) {
    return fail("O arquivo excede o limite de 25 MB.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseSiapsMatrix(await readSiapsFile(buffer, file.name));

    const denominator = parsed.rows.reduce((t, r) => t + r.denominator, 0);
    const pointsTotal = parsed.rows.reduce((t, r) => t + r.pointsTotal, 0);

    return {
      status: "preview",
      message: `${parsed.rows.length} equipe(s) reconhecidas em ${parsed.metadata.competencyLabel}.`,
      preview: {
        filename: file.name,
        competencyLabel: parsed.metadata.competencyLabel,
        competency: parsed.metadata.competency,
        municipality: `${parsed.metadata.municipalityIbge} / ${parsed.metadata.municipalityName}`,
        sourceStatus: parsed.metadata.sourceStatus,
        generatedAt: parsed.metadata.generatedAt,
        teamTypeFilter: parsed.metadata.teamTypeFilter,
        teamsTotal: parsed.rows.length,
        denominator,
        pointsTotal,
        // Prévia informativa: o número oficial é o que a camada analítica
        // recompõe depois da resolução territorial e do escopo.
        recomposedC3: recomposeC3(parsed.rows),
        checksumFailures: parsed.checksumFailures,
        issues: parsed.issues.slice(0, 50),
      },
    };
  } catch (error) {
    return fail(describeError(error));
  }
}

/**
 * Grava o relatório. O arquivo é reprocessado no servidor em vez de confiarmos
 * nas linhas devolvidas ao navegador: aceitar o resultado do preview
 * permitiria forjar um indicador oficial.
 */
export async function ingestSiapsAction(
  _state: SiapsImportState,
  formData: FormData,
): Promise<SiapsImportState> {
  await requireMunicipalManagement();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Reenvie o arquivo para confirmar a importação.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseSiapsMatrix(await readSiapsFile(buffer, file.name));
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const supabase = await createClient();
    const result = await supabase.schema("siaps").rpc("ingest_quality_report", {
      p_metadata: {
        filename: file.name,
        sha256,
        indicatorCode: "C3",
        competency: parsed.metadata.competency,
        municipalityIbge: parsed.metadata.municipalityIbge,
        uf: parsed.metadata.uf,
        generatedAt: parsed.metadata.generatedAt,
        sourceStatus: parsed.metadata.sourceStatus,
        scopeSignature: parsed.metadata.scopeSignature,
        sourceFilters: parsed.metadata.rawFilters,
        parserVersion: parsed.parserVersion,
      },
      p_rows: parsed.rows,
    });

    if (result.error) {
      if (result.error.message.includes("already imported")) {
        return fail("Este arquivo já foi importado. Nada foi duplicado.");
      }
      if (result.error.message.includes("official series start")) {
        return fail("A série oficial começa em JAN/2026.");
      }
      return fail("Não foi possível concluir a importação.");
    }

    const data = result.data as NonNullable<SiapsImportState["ingest"]>;
    revalidatePath("/sistema/gestao");
    revalidatePath("/sistema/gestao/importar");

    return {
      status: "ingested",
      message: data.publicationBlock
        ? "Importação registrada, mas a publicação está bloqueada."
        : "Importação validada. Publique para que entre no painel.",
      ingest: data,
    };
  } catch (error) {
    return fail(describeError(error));
  }
}

export type PublishState = { ok: boolean; message: string };

export async function publishImportAction(
  _state: PublishState,
  formData: FormData,
): Promise<PublishState> {
  await requireMunicipalManagement();

  const importId = formData.get("importId");
  if (typeof importId !== "string" || importId === "") {
    return { ok: false, message: "Importação inválida." };
  }

  const supabase = await createClient();
  const result = await supabase.schema("siaps").rpc("publish_import", {
    p_import_id: importId,
  });

  if (result.error) {
    const message = result.error.message;
    if (message.includes("scope signature differs")) {
      return {
        ok: false,
        message:
          "O escopo de filtros difere da versão publicada. Revise antes de substituir.",
      };
    }
    if (message.includes("generated more recently")) {
      return {
        ok: false,
        message:
          "A versão publicada foi gerada mais recentemente no SIAPS. O horário do upload não decide a versão.",
      };
    }
    if (message.includes("publication blocked")) {
      return { ok: false, message: "Publicação bloqueada por pendência de validação." };
    }
    return { ok: false, message: "Não foi possível publicar a competência." };
  }

  revalidatePath("/sistema/gestao");
  revalidatePath("/sistema/gestao/importar");
  return { ok: true, message: "Competência publicada no painel." };
}

function describeError(error: unknown) {
  if (error instanceof SiapsParseError) {
    return error.message;
  }
  return "Não foi possível ler o arquivo enviado.";
}
