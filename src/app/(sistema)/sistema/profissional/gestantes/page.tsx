import Link from "next/link";

import { requireProfessional } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { listPatients } from "@/lib/professional/queries";

import { NewPatientForm } from "./new-patient-form";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  return value ? new Date(value + "T00:00:00Z").toLocaleDateString("pt-BR") : "—";
}

export default async function PatientsPage() {
  await enforceRouteGuard(() => requireProfessional());
  const patients = await listPatients();

  return (
    <section className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
            Área Profissional
          </span>
          <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
            Gestantes ({patients.length})
          </h1>
        </div>
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800"
          href="/sistema/profissional/importar"
        >
          Importar do PEC
        </Link>
      </header>

      <NewPatientForm />

      {patients.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
          Nenhuma gestante na sua carteira. Cadastre manualmente acima ou
          importe a planilha exportada do PEC.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Gestante</th>
                <th className="px-4 py-3">Nascimento</th>
                <th className="px-4 py-3">DPP</th>
                <th className="px-4 py-3">Risco</th>
                <th className="px-4 py-3">Consultas</th>
                <th className="px-4 py-3">dTpa</th>
                <th className="px-4 py-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr className="border-t border-slate-100" key={patient.public_id}>
                  <td className="px-4 py-3">
                    <Link
                      className="font-semibold text-[#0d4d80] underline-offset-2 hover:underline"
                      href={`/sistema/profissional/gestantes/${patient.public_id}`}
                    >
                      {patient.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(patient.birth_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(patient.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    {patient.risk_level === "alto" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-900">
                        Alto
                      </span>
                    ) : patient.risk_level === "habitual" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                        Habitual
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {patient.prenatal_visits}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {patient.has_dtpa ? "Sim" : "Não"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {patient.source === "pec" ? "PEC" : "Manual"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
