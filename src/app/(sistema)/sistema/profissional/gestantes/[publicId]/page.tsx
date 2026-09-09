import Link from "next/link";
import { notFound } from "next/navigation";

import { requireProfessional } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import {
  getPatientByPublicId,
  listClinicalRecords,
} from "@/lib/professional/queries";
import {
  ENCOUNTER_LABEL,
  EXAM_LABEL,
  VACCINE_LABEL,
} from "@/lib/validation/professional";

import {
  AddEncounterForm,
  AddExamForm,
  AddRiskForm,
  AddVaccinationForm,
} from "./clinical-forms";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  return value ? new Date(value + "T00:00:00Z").toLocaleDateString("pt-BR") : "—";
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await enforceRouteGuard(() => requireProfessional());

  const { publicId } = await params;
  const patient = await getPatientByPublicId(publicId);
  // O RLS já garante que só a própria carteira retorna. Um `public_id` de
  // outro profissional cai aqui como inexistente, sem revelar que existe.
  if (!patient) {
    notFound();
  }

  const records = await listClinicalRecords(patient.id);

  return (
    <section className="grid gap-6">
      <header>
        <Link
          className="text-sm font-bold text-[#0d4d80]"
          href="/sistema/profissional/gestantes"
        >
          ← Gestantes
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          {patient.display_name}
        </h1>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nascimento" value={formatDate(patient.birth_date)} />
          <Field label="Início do pré-natal" value={formatDate(patient.prenatal_start_date)} />
          <Field label="Data provável do parto" value={formatDate(patient.due_date)} />
          <Field
            label="Risco"
            value={
              patient.risk_level === "alto"
                ? "Alto"
                : patient.risk_level === "habitual"
                  ? "Habitual"
                  : "Não classificado"
            }
          />
        </dl>
      </header>

      <Panel title={`Atendimentos (${records.encounters.length})`}>
        <AddEncounterForm publicId={patient.public_id} />
        <RecordList
          empty="Nenhum atendimento registrado."
          items={records.encounters.map((item) => ({
            id: `e${item.id}`,
            primary: ENCOUNTER_LABEL[item.kind] ?? item.kind,
            secondary: formatDate(item.occurred_on),
            extra: item.notes,
          }))}
        />
      </Panel>

      <Panel title={`Exames (${records.exams.length})`}>
        <AddExamForm publicId={patient.public_id} />
        <RecordList
          empty="Nenhum exame registrado."
          items={records.exams.map((item) => ({
            id: `x${item.id}`,
            primary: EXAM_LABEL[item.exam_type] ?? item.exam_type,
            secondary: formatDate(item.collected_on),
            extra: item.result,
          }))}
        />
      </Panel>

      <Panel title={`Vacinas (${records.vaccinations.length})`}>
        <AddVaccinationForm publicId={patient.public_id} />
        <RecordList
          empty="Nenhuma vacina registrada."
          items={records.vaccinations.map((item) => ({
            id: `v${item.id}`,
            primary: VACCINE_LABEL[item.vaccine] ?? item.vaccine,
            secondary: formatDate(item.applied_on),
          }))}
        />
      </Panel>

      <Panel title={`Classificação de risco (${records.risks.length})`}>
        <AddRiskForm publicId={patient.public_id} />
        <RecordList
          empty="Nenhuma classificação registrada."
          items={records.risks.map((item) => ({
            id: `r${item.id}`,
            primary: item.level === "alto" ? "Alto risco" : "Risco habitual",
            secondary: formatDate(item.assessed_on),
          }))}
        />
      </Panel>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-[#071d35]">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function RecordList({
  items,
  empty,
}: {
  items: {
    id: string;
    primary: string;
    secondary: string;
    extra?: string | null;
  }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{empty}</p>;
  }
  return (
    <ul className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
      {items.map((item) => (
        <li
          className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
          key={item.id}
        >
          <span className="font-semibold text-slate-800">{item.primary}</span>
          <span className="text-slate-600">
            {item.secondary}
            {item.extra ? ` · ${item.extra}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
