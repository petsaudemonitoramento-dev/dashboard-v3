import Link from "next/link";

import { requireProfessional } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { listAlerts, listImports, listPatients } from "@/lib/professional/queries";

export const dynamic = "force-dynamic";

export default async function ProfessionalDashboardPage() {
  await enforceRouteGuard(() => requireProfessional());

  const [patients, alerts, imports] = await Promise.all([
    listPatients(),
    listAlerts(),
    listImports(5),
  ]);

  const altoRisco = patients.filter((p) => p.risk_level === "alto").length;
  const semDtpa = patients.filter((p) => !p.has_dtpa).length;
  const criticos = alerts.filter((a) => a.severity === "critico").length;

  return (
    <section className="grid gap-6">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
          Área Profissional
        </span>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          Sua carteira
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Este espaço é privado. Nenhum outro profissional, a gestão ou a
          administração técnica têm acesso a estes registros, e eles não
          alimentam o indicador oficial do município.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gestantes acompanhadas" value={patients.length} />
        <Metric label="Alto risco" value={altoRisco} warn={altoRisco > 0} />
        <Metric label="Sem dTpa registrada" value={semDtpa} warn={semDtpa > 0} />
        <Metric label="Alertas críticos" value={criticos} warn={criticos > 0} />
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white"
          href="/sistema/profissional/gestantes"
        >
          Ver gestantes
        </Link>
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800"
          href="/sistema/profissional/importar"
        >
          Importar planilha do PEC
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Alertas ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Nenhum alerta no momento.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {alerts.slice(0, 12).map((alert) => (
                <li
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  key={`${alert.patient_id}-${alert.code}`}
                >
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      alert.severity === "critico"
                        ? "bg-rose-100 text-rose-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {alert.severity === "critico" ? "crítico" : "atenção"}
                  </span>
                  <Link
                    className="font-semibold text-[#0d4d80] underline-offset-2 hover:underline"
                    href={`/sistema/profissional/gestantes/${alert.public_id}`}
                  >
                    {alert.display_name}
                  </Link>
                  <span className="text-slate-600"> — {alert.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Últimas importações
          </h2>
          {imports.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Nenhuma importação registrada.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 text-sm">
              {imports.map((item) => (
                <li
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  key={item.id}
                >
                  <strong className="text-slate-800">{item.filename}</strong>
                  <p className="text-slate-600">
                    {item.rows_created} nova(s), {item.rows_updated}{" "}
                    atualizada(s) ·{" "}
                    {new Date(item.imported_at).toLocaleDateString("pt-BR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold text-[#071d35]">{value}</dd>
    </div>
  );
}
