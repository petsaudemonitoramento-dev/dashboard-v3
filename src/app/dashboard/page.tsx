import {
  Activity,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  LogOut,
  MapPinned,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type TeamRow = {
  id: number;
  competency: string;
  team_id: string;
  ine: string;
  team_name: string | null;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  district_id: number | null;
  district_code: string | null;
  district_name: string;
  denominator: number;
  points_total: number;
  official_ratio: number | null;
  is_pilot: boolean;
  pilot_stratum: string | null;
};

type DirectoryRow = {
  team_id: string;
  ine: string;
  team_name: string | null;
  establishment_id: string | null;
  cnes: string | null;
  establishment_name: string | null;
  district_code: string | null;
  district_name: string;
  is_pilot: boolean;
  pilot_stratum: string | null;
};

type PracticeRow = {
  team_id: string;
  practice_code: string;
  fulfilled: number;
  denominator: number;
};

const practiceLabels: Record<string, string> = {
  A: "1ª consulta até a 12ª semana",
  B: "7 consultas de pré-natal",
  C: "7 aferições de pressão arterial",
  D: "7 registros de peso e altura",
  E: "3 visitas domiciliares",
  F: "Vacina dTpa",
  G: "Exames do 1º trimestre",
  H: "Exames do 3º trimestre",
  I: "Consulta puerperal",
  J: "Visita domiciliar no puerpério",
  K: "Saúde bucal na gestação",
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function monthLabel(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function classify(value: number | null) {
  if (value == null) return { label: "Sem população elegível", tone: "neutral" };
  if (value > 75) return { label: "Ótimo", tone: "great" };
  if (value > 50) return { label: "Bom", tone: "good" };
  if (value > 25) return { label: "Suficiente", tone: "enough" };
  return { label: "Regular", tone: "regular" };
}

function polyline(values: number[], width = 500, height = 128) {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - 12 - ((value - min) / span) * (height - 24);
      return x.toFixed(1) + "," + y.toFixed(1);
    })
    .join(" ");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: claimData } = await supabase.auth.getClaims();
  if (!claimData?.claims) redirect("/login");

  const competencyResult = await supabase
    .from("dashboard_competencies")
    .select("*")
    .order("competency");

  const directoryResult = await supabase
    .from("dashboard_team_directory")
    .select("*")
    .order("establishment_name")
    .order("team_name");

  if (competencyResult.error || directoryResult.error) {
    throw new Error(
      competencyResult.error?.message ??
        directoryResult.error?.message ??
        "Falha ao carregar o painel.",
    );
  }

  const competencies = (competencyResult.data ?? []) as Array<{
    competency: string;
    teams: number;
    establishments: number;
    gestantes_puerperas: number;
    c3_municipal: number;
  }>;
  const directory = (directoryResult.data ?? []) as DirectoryRow[];

  const latestCompetency = competencies.at(-1)?.competency;
  const selectedCompetency = scalar(params.competencia) ?? latestCompetency;
  const selectedDistrict = scalar(params.distrito) ?? "";
  const selectedCnes = scalar(params.ubs) ?? "";
  const selectedIne = scalar(params.equipe) ?? "";
  const selectedScope = scalar(params.escopo) === "piloto" ? "piloto" : "todas";

  if (!selectedCompetency) {
    return <main className="empty-state">Nenhuma competência publicada.</main>;
  }

  let teamQuery = supabase
    .from("dashboard_c3_team_monthly")
    .select("*")
    .eq("competency", selectedCompetency)
    .order("official_ratio", { ascending: true });

  if (selectedScope === "piloto") teamQuery = teamQuery.eq("is_pilot", true);

  if (selectedDistrict) {
    teamQuery =
      selectedDistrict === "__sem_distrito"
        ? teamQuery.is("district_code", null)
        : teamQuery.eq("district_code", selectedDistrict);
  }

  if (selectedCnes) teamQuery = teamQuery.eq("cnes", selectedCnes);
  if (selectedIne) teamQuery = teamQuery.eq("ine", selectedIne);

  const teamResult = await teamQuery;
  if (teamResult.error) throw new Error(teamResult.error.message);

  const rows = (teamResult.data ?? []) as TeamRow[];
  const selectedTeamIds = new Set(rows.map((row) => row.team_id));

  const practicesResult = await supabase
    .from("dashboard_c3_practices")
    .select("team_id,practice_code,fulfilled,denominator")
    .eq("competency", selectedCompetency);

  if (practicesResult.error) throw new Error(practicesResult.error.message);

  const practiceRows = ((practicesResult.data ?? []) as PracticeRow[]).filter(
    (row) => selectedTeamIds.has(row.team_id),
  );

  const denominator = rows.reduce(
    (sum, row) => sum + Number(row.denominator ?? 0),
    0,
  );
  const points = rows.reduce(
    (sum, row) => sum + Number(row.points_total ?? 0),
    0,
  );
  const c3 = denominator > 0 ? points / denominator : null;
  const classification = classify(c3);
  const establishmentCount = new Set(rows.map((row) => row.establishment_id)).size;

  const practiceSummary = Object.keys(practiceLabels).map((code) => {
    const matching = practiceRows.filter((row) => row.practice_code === code);
    const fulfilled = matching.reduce(
      (sum, row) => sum + Number(row.fulfilled ?? 0),
      0,
    );
    const eligible = matching.reduce(
      (sum, row) => sum + Number(row.denominator ?? 0),
      0,
    );

    return {
      code,
      label: practiceLabels[code],
      fulfilled,
      eligible,
      pct: eligible > 0 ? (fulfilled / eligible) * 100 : null,
    };
  });

  const weakestPractices = [...practiceSummary]
    .filter((item) => item.pct != null)
    .sort((a, b) => Number(a.pct) - Number(b.pct))
    .slice(0, 4);

  const districtMap = new Map<string, string>();
  directory.forEach((row) => {
    if (row.district_code) districtMap.set(row.district_code, row.district_name);
  });
  const districts = Array.from(districtMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const establishmentMap = new Map<string, string>();
  directory.forEach((row) => {
    if (!row.cnes || !row.establishment_name) return;
    if (
      selectedDistrict &&
      selectedDistrict !== "__sem_distrito" &&
      row.district_code !== selectedDistrict
    )
      return;
    if (selectedDistrict === "__sem_distrito" && row.district_code != null) return;
    establishmentMap.set(row.cnes, row.establishment_name);
  });
  const establishments = Array.from(establishmentMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  const teams = directory
    .filter((row) => (!selectedCnes ? true : row.cnes === selectedCnes))
    .sort((a, b) => (a.team_name ?? "").localeCompare(b.team_name ?? ""));

  const unknownDistrictTeams = directory.filter(
    (row) => row.district_code == null,
  ).length;

  const trendValues = competencies.map((item) => Number(item.c3_municipal));
  const trendPoints = polyline(trendValues);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="mark">CG</div>
          <div>
            <strong>Cuidado na Gestação na APS</strong>
            <span>Painel da Gestão • Campina Grande</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="status-pill">
            <ShieldCheck size={16} />
            Dados oficiais SIAPS
          </div>
          <form action={signOut}>
            <button className="icon-button" title="Sair" type="submit">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Visão geral da gestão</p>
            <h1>Indicador C3 — Gestação e Puerpério</h1>
            <p className="muted">
              Acompanhe o resultado oficial e investigue onde estão as principais
              fragilidades do cuidado.
            </p>
          </div>

          <div className="competency-badge">
            <CalendarDays size={18} />
            <div>
              <span>Competência</span>
              <strong>{monthLabel(selectedCompetency)}</strong>
            </div>
          </div>
        </div>

        {unknownDistrictTeams > 0 ? (
          <div className="info-banner">
            <CircleAlert size={18} />
            <div>
              <strong>Referência distrital ainda parcial</strong>
              <span>
                {unknownDistrictTeams} equipes estão cadastradas como “Não informado”.
                Elas continuam incluídas nos resultados municipais.
              </span>
            </div>
          </div>
        ) : null}

        <form className="filter-bar" method="get">
          <label>
            <span>Competência</span>
            <div className="select-wrap">
              <select name="competencia" defaultValue={selectedCompetency}>
                {competencies.map((item) => (
                  <option key={item.competency} value={item.competency}>
                    {monthLabel(item.competency)}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label>
            <span>Escopo</span>
            <div className="select-wrap">
              <select name="escopo" defaultValue={selectedScope}>
                <option value="todas">Todas as equipes</option>
                <option value="piloto">Piloto 2026</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label>
            <span>Distrito</span>
            <div className="select-wrap">
              <select name="distrito" defaultValue={selectedDistrict}>
                <option value="">Todos</option>
                {districts.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
                <option value="__sem_distrito">Não informado</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label>
            <span>UBS</span>
            <div className="select-wrap">
              <select name="ubs" defaultValue={selectedCnes}>
                <option value="">Todas</option>
                {establishments.map(([cnes, name]) => (
                  <option key={cnes} value={cnes}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <label>
            <span>Equipe</span>
            <div className="select-wrap">
              <select name="equipe" defaultValue={selectedIne}>
                <option value="">Todas</option>
                {teams.map((team) => (
                  <option key={team.ine} value={team.ine}>
                    {team.team_name ?? team.ine}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>

          <button className="filter-button" type="submit">
            Aplicar filtros
          </button>
        </form>

        <section className="kpi-grid">
          <article className="kpi-card primary-kpi">
            <div className="kpi-icon">
              <Activity size={21} />
            </div>
            <span>C3 do escopo</span>
            <strong>{formatDecimal(c3)}</strong>
            <div className={["classification", classification.tone].join(" ")}>
              {classification.label}
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon">
              <UsersRound size={21} />
            </div>
            <span>Gestantes e puérperas</span>
            <strong>{formatInteger(denominator)}</strong>
            <small>denominador oficial</small>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon">
              <Stethoscope size={21} />
            </div>
            <span>Equipes no recorte</span>
            <strong>{formatInteger(rows.length)}</strong>
            <small>
              {selectedScope === "piloto"
                ? "coorte piloto"
                : "equipes da competência"}
            </small>
          </article>

          <article className="kpi-card">
            <div className="kpi-icon">
              <Building2 size={21} />
            </div>
            <span>Estabelecimentos</span>
            <strong>{formatInteger(establishmentCount)}</strong>
            <small>CNES com dados no recorte</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel trend-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Série municipal</p>
                <h2>Evolução do C3</h2>
              </div>
              <span className="mini-pill">JAN–JUN/26</span>
            </div>

            <div className="trend-chart">
              <svg
                viewBox="0 0 500 128"
                role="img"
                aria-label="Tendência municipal do C3"
              >
                <polyline
                  points={trendPoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="trend-labels">
                {competencies.map((item) => (
                  <div key={item.competency}>
                    <span>{monthLabel(item.competency).split("/")[0]}</span>
                    <strong>{formatDecimal(Number(item.c3_municipal))}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="panel weak-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Boas práticas</p>
                <h2>Maiores fragilidades</h2>
              </div>
              <ClipboardCheck size={20} />
            </div>

            <div className="weak-list">
              {weakestPractices.map((item) => (
                <div className="weak-item" key={item.code}>
                  <div className="practice-code">{item.code}</div>
                  <div className="weak-copy">
                    <div>
                      <span>{item.label}</span>
                      <strong>{formatDecimal(item.pct)}%</strong>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width:
                            String(Math.max(0, Math.min(Number(item.pct ?? 0), 100))) +
                            "%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Componentes A–K</p>
                <h2>Cobertura das boas práticas</h2>
              </div>
              <span className="mini-pill">{rows.length} equipes</span>
            </div>

            <div className="practice-grid">
              {practiceSummary.map((item) => (
                <div className="practice-card" key={item.code}>
                  <div>
                    <span className="practice-code">{item.code}</span>
                    <strong>{formatDecimal(item.pct)}%</strong>
                  </div>
                  <p>{item.label}</p>
                  <div className="progress">
                    <span
                      style={{
                        width:
                          String(Math.max(0, Math.min(Number(item.pct ?? 0), 100))) +
                          "%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel attention-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Priorização</p>
                <h2>Equipes que exigem atenção</h2>
              </div>
              <MapPinned size={20} />
            </div>

            <div className="attention-list">
              {rows.slice(0, 8).map((row, index) => {
                const itemClass = classify(row.official_ratio);
                return (
                  <div className="attention-row" key={row.id}>
                    <span className="rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="attention-copy">
                      <strong>{row.team_name ?? row.ine}</strong>
                      <span>
                        {row.establishment_name} • {row.district_name}
                      </span>
                    </div>
                    <div className="attention-score">
                      <strong>{formatDecimal(row.official_ratio)}</strong>
                      <span
                        className={["classification", itemClass.tone].join(" ")}
                      >
                        {itemClass.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {rows.length === 0 ? (
                <p className="muted">Nenhuma equipe encontrada para este filtro.</p>
              ) : null}
            </div>
          </article>
        </section>

        <footer className="dashboard-footer">
          <span>Fonte: SIAPS • Relatório Qualidade • Visão por Competência</span>
          <span>Desenvolvido por Lucca Araújo • V3</span>
        </footer>
      </section>
    </main>
  );
}
