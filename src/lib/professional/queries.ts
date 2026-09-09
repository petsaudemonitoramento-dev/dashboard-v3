import { createClient } from "@/lib/supabase/server";

/**
 * Acesso de leitura do módulo Profissional.
 *
 * Nenhuma destas consultas filtra por proprietário explicitamente: quem faz
 * isso é o RLS, com `owner_user_id = auth.uid()`. Filtrar também aqui daria a
 * impressão de que a segurança depende do código da aplicação — e um dia
 * alguém removeria o filtro achando que é redundante.
 */

export type PatientOverview = {
  id: number;
  public_id: string;
  display_name: string;
  birth_date: string | null;
  prenatal_start_date: string | null;
  due_date: string | null;
  risk_level: "habitual" | "alto" | null;
  source: string;
  prenatal_visits: number;
  last_encounter_on: string | null;
  exam_count: number;
  vaccination_count: number;
  has_dtpa: boolean;
};

export type PatientAlert = {
  patient_id: number;
  public_id: string;
  display_name: string;
  code: string;
  severity: "atencao" | "critico";
  message: string;
};

export async function listPatients(): Promise<PatientOverview[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("professional")
    .from("vw_patient_overview")
    .select(
      "id, public_id, display_name, birth_date, prenatal_start_date, due_date, risk_level, source, prenatal_visits, last_encounter_on, exam_count, vaccination_count, has_dtpa",
    )
    .is("archived_at", null)
    .order("display_name", { ascending: true });

  if (result.error) {
    throw new Error("Não foi possível carregar a carteira.");
  }
  return (result.data ?? []) as PatientOverview[];
}

export async function getPatientByPublicId(
  publicId: string,
): Promise<PatientOverview | null> {
  const supabase = await createClient();
  const result = await supabase
    .schema("professional")
    .from("vw_patient_overview")
    .select(
      "id, public_id, display_name, birth_date, prenatal_start_date, due_date, risk_level, source, prenatal_visits, last_encounter_on, exam_count, vaccination_count, has_dtpa",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (result.error) {
    throw new Error("Não foi possível carregar a gestante.");
  }
  return (result.data as PatientOverview | null) ?? null;
}

export async function listAlerts(): Promise<PatientAlert[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("professional")
    .from("vw_patient_alerts")
    .select("patient_id, public_id, display_name, code, severity, message")
    .order("severity", { ascending: true });

  if (result.error) {
    throw new Error("Não foi possível carregar os alertas.");
  }
  return (result.data ?? []) as PatientAlert[];
}

export type ImportSummary = {
  id: string;
  filename: string;
  rows_read: number;
  rows_created: number;
  rows_updated: number;
  imported_at: string;
};

export async function listImports(limit = 10): Promise<ImportSummary[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("professional")
    .from("pec_imports")
    .select("id, filename, rows_read, rows_created, rows_updated, imported_at")
    .order("imported_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw new Error("Não foi possível carregar o histórico de importações.");
  }
  return (result.data ?? []) as ImportSummary[];
}

export type ClinicalRecords = {
  encounters: {
    id: number;
    occurred_on: string;
    kind: string;
    notes: string | null;
  }[];
  exams: {
    id: number;
    exam_type: string;
    collected_on: string | null;
    result: string | null;
  }[];
  vaccinations: { id: number; vaccine: string; applied_on: string | null }[];
  risks: { id: number; assessed_on: string; level: string }[];
};

export async function listClinicalRecords(
  patientId: number,
): Promise<ClinicalRecords> {
  const supabase = await createClient();
  const professional = supabase.schema("professional");

  const [encounters, exams, vaccinations, risks] = await Promise.all([
    professional
      .from("encounters")
      .select("id, occurred_on, kind, notes")
      .eq("patient_id", patientId)
      .order("occurred_on", { ascending: false }),
    professional
      .from("exams")
      .select("id, exam_type, collected_on, result")
      .eq("patient_id", patientId)
      .order("collected_on", { ascending: false }),
    professional
      .from("vaccinations")
      .select("id, vaccine, applied_on")
      .eq("patient_id", patientId)
      .order("applied_on", { ascending: false }),
    professional
      .from("risk_assessments")
      .select("id, assessed_on, level")
      .eq("patient_id", patientId)
      .order("assessed_on", { ascending: false }),
  ]);

  return {
    encounters: (encounters.data ?? []) as ClinicalRecords["encounters"],
    exams: (exams.data ?? []) as ClinicalRecords["exams"],
    vaccinations: (vaccinations.data ?? []) as ClinicalRecords["vaccinations"],
    risks: (risks.data ?? []) as ClinicalRecords["risks"],
  };
}
