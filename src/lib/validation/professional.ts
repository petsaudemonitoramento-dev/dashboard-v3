import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime());
  }, "Data inexistente.");

export const manualPatientSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, "Informe o nome da gestante.")
    .max(160, "Nome muito longo."),
  birthDate: isoDate.optional(),
  prenatalStartDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  riskLevel: z.enum(["habitual", "alto"]).optional(),
});

export const encounterSchema = z.object({
  patientPublicId: z.uuid(),
  occurredOn: isoDate,
  kind: z.enum([
    "consulta_prenatal",
    "consulta_puerperal",
    "visita_domiciliar",
    "odontologica",
    "outra",
  ]),
  notes: z.string().trim().max(500).optional(),
});

export const examSchema = z.object({
  patientPublicId: z.uuid(),
  examType: z.enum(["sifilis", "hiv", "hepatite_b", "hepatite_c", "outro"]),
  collectedOn: isoDate.optional(),
  result: z
    .enum(["nao_reagente", "reagente", "indeterminado", "realizado"])
    .optional(),
});

export const vaccinationSchema = z.object({
  patientPublicId: z.uuid(),
  vaccine: z.enum(["dtpa", "influenza", "hepatite_b", "covid19", "outra"]),
  appliedOn: isoDate.optional(),
});

export const riskAssessmentSchema = z.object({
  patientPublicId: z.uuid(),
  level: z.enum(["habitual", "alto"]),
  factors: z.array(z.string().trim().max(120)).max(20).optional(),
});

export const ENCOUNTER_LABEL: Record<string, string> = {
  consulta_prenatal: "Consulta de pré-natal",
  consulta_puerperal: "Consulta puerperal",
  visita_domiciliar: "Visita domiciliar",
  odontologica: "Atendimento odontológico",
  outra: "Outro atendimento",
};

export const EXAM_LABEL: Record<string, string> = {
  sifilis: "Sífilis",
  hiv: "HIV",
  hepatite_b: "Hepatite B",
  hepatite_c: "Hepatite C",
  outro: "Outro exame",
};

export const VACCINE_LABEL: Record<string, string> = {
  dtpa: "dTpa",
  influenza: "Influenza",
  hepatite_b: "Hepatite B",
  covid19: "COVID-19",
  outra: "Outra",
};
