import Link from "next/link";

import { requireMunicipalManagement } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import {
  getDataState,
  getMunicipality,
  getMunicipalitySeries,
  listCompetencies,
  listDistricts,
  listEstablishments,
  listPractices,
  listTeams,
} from "@/lib/gestao/queries";

export const dynamic = "force-dynamic";

const PRACTICE_LABEL: Record<string, string> = {
  A: "1ª consulta até a 12ª semana",
  B: "7 ou mais consultas",
  C: "7 ou mais aferições de pressão",
  D: "7 ou mais registros de peso e altura",
  E: "3 ou mais visitas ACS/TACS",
  F: "dTpa a partir da 20ª semana",
  G: "Sífilis, HIV e hepatites no 1º trimestre",
  H: "Sífilis e HIV no 3º trimestre",
  I: "Consulta puerperal",
  J: "Visita puerperal",
  K: "Saúde bucal na gestação",
};

function competencyLabel(iso: string) {
  const [year, month] = iso.split("-");
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${months[Number(month) - 1]}/${year.slice(2)}`;
}

function fmt(value: number | null, digits = 2) {
  return value === null || value === undefined
    ? "—"
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}

const CLASSIFICATION_STYLE: Record<string, string> = {
  "Ótimo": "bg-emerald-100 text-emerald-900",
  Bom: "bg-sky-100 text-sky-900",
  Suficiente: "bg-amber-100 text-amber-900",
  Regular: "bg-rose-100 text-rose-900",
};

export default async function ManagementDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    competencia?: string;
    distrito?: string;
    cnes?: string;
    tipo?: string;
  }>;
}) {
  await enforceRouteGuard(() => requireMunicipalManagement());

  const params = await searchParams;
  const [competencies, dataState] = await Promise.all([
    listCompetencies(),
    getDataState(),
  ]);

  if (competencies.length === 0) {
    return <EmptyState />;
  }

  const competency =
    params.competencia && competencies.includes(params.competencia)
      ? params.competencia
      : competencies[0];

  const [municipality, series, districts, establishments, practices, teams] =
    await Promise.all([
      getMunicipality(competency),
      getMunicipalitySeries(),
      listDistricts(competency),
      listEstablishments(competency),
      listPractices(competency),
      listTeams({
        competency,
        districtId: params.distrito,
        cnes: params.cnes,
        teamType: params.tipo,
      }),
    ]);

  const weakest = [...practices].sort((a, b) => b.points_lost - a.points_lost);
  const teamsAtRisk = teams
    .filter((team) => team.result !== null)
    .slice(0, 10);
  const teamTypes = Array.from(
    new Set(teams.map((team) => team.team_type).filter(Boolean)),
  ) as string[];

  return (
    <section className="grid gap-6">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
          Gestão Municipal · Campina Grande - PB
        </span>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          C3 — Cuidado na Gestação e Puerpério
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Competência {competencyLabel(competency)}
          {dataState?.latest_source_status
            ? ` · dado ${dataState.latest_source_status}`
            : ""}
          {dataState?.last_import_at
            ? ` · importado em ${new Date(dataState.last_import_at).toLocaleDateString("pt-BR")}`
            : ""}
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Filter label="Competência" name="competencia" value={competency}>
          {competencies.map((item) => (
            <option key={item} value={item}>
              {competencyLabel(item)}
            </option>
          ))}
        </Filter>
        <Filter label="Distrito" name="distrito" value={params.distrito ?? ""}>
          <option value="">Todos</option>
          {districts
            .filter((d) => d.district_id)
            .map((d) => (
              <option key={d.district_id!} value={d.district_id!}>
                {d.district_name}
              </option>
            ))}
        </Filter>
        <Filter label="UBS" name="cnes" value={params.cnes ?? ""}>
          <option value="">Todas</option>
          {establishments.map((e) => (
            <option key={e.cnes} value={e.cnes}>
              {e.establishment_name ?? e.cnes}
            </option>
          ))}
        </Filter>
        <Filter label="Tipo de equipe" name="tipo" value={params.tipo ?? ""}>
          <option value="">Todos</option>
          {teamTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Filter>
        <button
          className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white"
          type="submit"
        >
          Aplicar
        </button>
      </form>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="C3 municipal"
          value={fmt(municipality?.result ?? null)}
          badge={municipality?.classification ?? undefined}
        />
        <Metric
          label="Gestantes e puérperas"
          value={(municipality?.denominator ?? 0).toLocaleString("pt-BR")}
        />
        <Metric
          label="Pontos somados"
          value={(municipality?.points_total ?? 0).toLocaleString("pt-BR")}
        />
        <Metric
          label="Equipes avaliadas"
          value={`${municipality?.teams_evaluated ?? 0} de ${municipality?.teams_total ?? 0}`}
        />
      </dl>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-[#071d35]">
          Boas práticas — onde os pontos são perdidos
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          A soma dos onze pesos é 100. A coluna final mostra quantos pontos cada
          prática deixa na mesa no município.
        </p>
        <ul className="mt-4 grid gap-2">
          {weakest.map((practice) => (
            <li key={practice.practice_code}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-800">
                  {practice.practice_code} · {PRACTICE_LABEL[practice.practice_code]}
                </span>
                <span className="text-slate-600">
                  {fmt(practice.fulfillment_rate, 1)}% ·{" "}
                  {fmt(practice.contribution, 1)} de {practice.weight} pts ·{" "}
                  <strong className="text-rose-800">
                    −{fmt(practice.points_lost, 1)}
                  </strong>
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0d4d80]"
                  style={{ width: `${Math.min(practice.fulfillment_rate ?? 0, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Evolução mensal">
          <ul className="grid gap-2 text-sm">
            {series.map((item) => (
              <li
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                key={item.competency}
              >
                <span className="font-semibold text-slate-800">
                  {competencyLabel(item.competency)}
                </span>
                <span className="text-slate-600">
                  {fmt(item.result)} · {item.denominator.toLocaleString("pt-BR")}{" "}
                  gestantes
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Distritos">
          <ul className="grid gap-2 text-sm">
            {districts.map((district) => (
              <li
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                key={district.district_id ?? district.district_name}
              >
                <span className="font-semibold text-slate-800">
                  {district.district_name}
                </span>
                <span className="text-slate-600">
                  {fmt(district.result)} · {district.teams_evaluated} equipes
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-[#071d35]">
          Equipes que exigem atenção ({teams.length} no filtro)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Equipe</th>
                <th className="py-2">UBS</th>
                <th className="py-2">Distrito</th>
                <th className="py-2">Gestantes</th>
                <th className="py-2">C3</th>
                <th className="py-2">Classificação</th>
              </tr>
            </thead>
            <tbody>
              {teamsAtRisk.map((team) => (
                <tr className="border-t border-slate-100" key={team.ine}>
                  <td className="py-2 font-semibold text-slate-800">
                    {team.team_name ?? team.ine}
                  </td>
                  <td className="py-2 text-slate-700">{team.establishment_name ?? "—"}</td>
                  <td className="py-2 text-slate-700">{team.district_name ?? "—"}</td>
                  <td className="py-2 text-slate-700">{team.denominator}</td>
                  <td className="py-2 text-slate-700">{fmt(team.result)}</td>
                  <td className="py-2">
                    {team.classification ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          CLASSIFICATION_STYLE[team.classification] ?? ""
                        }`}
                      >
                        {team.classification}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">{team.situation}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {teams.some((team) => team.result === null) ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Equipes sem população elegível aparecem como “Sem população
            elegível”, não como Regular: ausência de gestantes vinculadas não é
            desempenho ruim.
          </p>
        ) : null}
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
        <p>
          Fonte: SIAPS — Relatório Qualidade, Visão por Competência. Resultados
          recompostos por SUM(pontos)/SUM(denominador) em todos os níveis.
        </p>
        <p className="mt-1">
          Cuidado na Gestação na APS · PET Saúde + UFCG · Campina Grande - PB ·
          Desenvolvido por Lucca Araújo
        </p>
        <Link
          className="mt-2 inline-block font-bold text-[#0d4d80]"
          href="/sistema/gestao/importar"
        >
          Importar relatório do SIAPS →
        </Link>
      </footer>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-3xl font-semibold text-[#071d35]">
        Painel de Gestão
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Nenhuma competência publicada ainda. Importe o relatório Qualidade —
        Visão por Competência do SIAPS para que o painel seja construído.
      </p>
      <Link
        className="mt-5 inline-block rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white"
        href="/sistema/gestao/importar"
      >
        Importar relatório do SIAPS
      </Link>
    </section>
  );
}

function Metric({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-[#071d35]">{value}</span>
        {badge ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              CLASSIFICATION_STYLE[badge] ?? ""
            }`}
          >
            {badge}
          </span>
        ) : null}
      </dd>
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
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Filter({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-slate-600">
      {label}
      <select
        className="rounded-lg border border-slate-300 p-2 text-sm font-normal text-slate-800"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}
