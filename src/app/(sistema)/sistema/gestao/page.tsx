import Link from "next/link";
import type { EChartsOption } from "echarts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSpreadsheet,
  Home,
  Info,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";

import { MaeChart } from "@/components/charts/mae-chart";
import { aggregateC3, C3_COMPONENTS, classifyC3, type C3Fact } from "@/lib/analytics/c3";
import { requireManagementAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FactRow = {
  id: number;
  competency: string;
  team_id: string;
  establishment_id: string;
  district_id: number | null;
  denominator: number;
  points_total: number | string;
};

type PracticeRow = {
  fact_id: number;
  practice_code: string;
  fulfilled: number;
};

type ImportRow = {
  id: string;
  filename: string;
  competency: string;
  status: string;
  rows_total: number;
  uploaded_at: string;
};

const PRACTICE_SHORT: Record<string, string> = {
  A: "1ª consulta até 12 semanas",
  B: "7+ consultas de pré-natal",
  C: "Aferições de pressão arterial",
  D: "Peso e altura registrados",
  E: "Visitas domiciliares",
  F: "Vacina dTpa",
  G: "Testes do 1º trimestre",
  H: "Sífilis/HIV no 3º trimestre",
  I: "Consulta no puerpério",
  J: "Visita no puerpério",
  K: "Saúde bucal",
};

const CLASSIFICATION_CODES = {
  all: "Todas",
  otimo: "Ótimo",
  bom: "Bom",
  suficiente: "Suficiente",
  regular: "Regular",
  sem: "Sem população elegível",
} as const;

async function fetchFacts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: FactRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabase
      .schema("analytics")
      .from("c3_team_monthly")
      .select("id, competency, team_id, establishment_id, district_id, denominator, points_total")
      .eq("is_current", true)
      .order("id")
      .range(offset, offset + 499);
    if (result.error) throw new Error("Não foi possível consultar os fatos C3.");
    rows.push(...((result.data ?? []) as FactRow[]));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return rows;
}

function ratio(facts: FactRow[]) {
  return aggregateC3(
    facts.map((fact): C3Fact => ({
      pointsTotal: Number(fact.points_total),
      denominator: fact.denominator,
      districtId: fact.district_id,
    })),
  );
}

function monthLabel(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`));
  return label.replace(".", "").replace(" de ", "/").replace(/^./, (char) => char.toUpperCase());
}

function longMonthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`));
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatC3(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function codeForClassification(value: ReturnType<typeof classifyC3>) {
  if (value === "Ótimo") return "otimo";
  if (value === "Bom") return "bom";
  if (value === "Suficiente") return "suficiente";
  if (value === "Regular") return "regular";
  return "sem";
}

function dashboardHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value);
  });
  const query = search.toString();
  return `/sistema/gestao${query ? `?${query}` : ""}`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className={`dashboard-kpi ${tone}`}>
      <div className="dashboard-kpi-icon"><Icon className="size-6" /></div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  );
}

export default async function ManagementDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await enforceRouteGuard(() => requireManagementAccess());
  const params = await searchParams;
  const supabase = await createClient();

  const [facts, districtsResult, establishmentsResult, teamsResult, importsResult] = await Promise.all([
    fetchFacts(supabase),
    supabase.schema("core").from("districts").select("id, name").eq("active", true).order("name"),
    supabase.schema("core").from("establishments").select("id, cnes, name").eq("active", true).order("name"),
    supabase.schema("core").from("teams").select("id, ine, name").eq("active", true).order("name"),
    supabase
      .schema("siaps")
      .from("imports")
      .select("id, filename, competency, status, rows_total, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(5),
  ]);

  if (districtsResult.error || establishmentsResult.error || teamsResult.error || importsResult.error) {
    throw new Error("Não foi possível carregar as informações consolidadas do Dashboard.");
  }

  const districts = districtsResult.data ?? [];
  const establishments = establishmentsResult.data ?? [];
  const teams = teamsResult.data ?? [];
  const recentImports = (importsResult.data ?? []) as ImportRow[];

  const districtNames = new Map(districts.map((item) => [item.id, item.name]));
  const establishmentMap = new Map(establishments.map((item) => [item.id, item]));
  const teamMap = new Map(teams.map((item) => [item.id, item]));

  const competencies = [...new Set(facts.map((fact) => fact.competency.slice(0, 7)))].sort();
  const validMonth = (value: string | undefined) => Boolean(value && /^\d{4}-\d{2}$/.test(value) && competencies.includes(value));
  let start = validMonth(params.inicio) ? params.inicio! : competencies.at(0) ?? "";
  let end = validMonth(params.fim) ? params.fim! : competencies.at(-1) ?? "";
  if (competencies.indexOf(start) > competencies.indexOf(end)) [start, end] = [end, start];

  const startIndex = Math.max(0, competencies.indexOf(start));
  const endIndex = Math.max(startIndex, competencies.indexOf(end));
  const periodMonths = competencies.slice(startIndex, endIndex + 1);

  const district = params.distrito ?? "all";
  const establishmentId = params.ubs ?? "all";
  const teamId = params.equipe ?? "all";
  const classification = Object.hasOwn(CLASSIFICATION_CODES, params.classificacao ?? "")
    ? (params.classificacao as keyof typeof CLASSIFICATION_CODES)
    : "all";
  const query = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");

  const baseScopeFacts = facts.filter((fact) => {
    if (!periodMonths.includes(fact.competency.slice(0, 7))) return false;
    if (district === "unknown" && fact.district_id !== null) return false;
    if (district !== "all" && district !== "unknown" && fact.district_id !== Number(district)) return false;
    if (establishmentId !== "all" && fact.establishment_id !== establishmentId) return false;
    if (teamId !== "all" && fact.team_id !== teamId) return false;

    if (query) {
      const establishment = establishmentMap.get(fact.establishment_id);
      const team = teamMap.get(fact.team_id);
      const haystack = `${establishment?.name ?? ""} ${establishment?.cnes ?? ""} ${team?.name ?? ""} ${team?.ine ?? ""}`
        .toLocaleLowerCase("pt-BR");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const teamGroupsForFilter = new Map<string, FactRow[]>();
  for (const fact of baseScopeFacts) {
    teamGroupsForFilter.set(fact.team_id, [...(teamGroupsForFilter.get(fact.team_id) ?? []), fact]);
  }
  const teamsMatchingClassification = new Set(
    [...teamGroupsForFilter.entries()]
      .filter(([, group]) => classification === "all" || codeForClassification(classifyC3(ratio(group).c3)) === classification)
      .map(([id]) => id),
  );

  const selectedFacts = baseScopeFacts.filter((fact) => teamsMatchingClassification.has(fact.team_id));
  const summary = ratio(selectedFacts);
  const teamCount = new Set(selectedFacts.map((fact) => fact.team_id)).size;
  const ubsCount = new Set(selectedFacts.map((fact) => fact.establishment_id)).size;

  const practiceRows: PracticeRow[] = [];
  for (let index = 0; index < selectedFacts.length; index += 100) {
    const ids = selectedFacts.slice(index, index + 100).map((fact) => fact.id);
    if (!ids.length) continue;
    const result = await supabase
      .schema("analytics")
      .from("c3_practice_counts")
      .select("fact_id, practice_code, fulfilled")
      .in("fact_id", ids);
    if (result.error) throw new Error("Não foi possível consultar as práticas A–K.");
    practiceRows.push(...((result.data ?? []) as PracticeRow[]));
  }

  const practicesByFact = new Map<number, Record<string, number>>();
  const componentTotals: Record<string, number> = Object.fromEntries(Object.keys(C3_COMPONENTS).map((code) => [code, 0]));
  for (const row of practiceRows) {
    componentTotals[row.practice_code] = (componentTotals[row.practice_code] ?? 0) + row.fulfilled;
    const current = practicesByFact.get(row.fact_id) ?? {};
    current[row.practice_code] = row.fulfilled;
    practicesByFact.set(row.fact_id, current);
  }

  const practiceRate = (code: string) =>
    summary.denominator > 0 ? ((componentTotals[code] ?? 0) / summary.denominator) * 100 : null;

  const evolution = periodMonths.map((month) => {
    const monthFacts = selectedFacts.filter((fact) => fact.competency.startsWith(month));
    const monthSummary = ratio(monthFacts);
    const monthlyTotal = (code: string) =>
      monthFacts.reduce((sum, fact) => sum + (practicesByFact.get(fact.id)?.[code] ?? 0), 0);
    return {
      month,
      c3: monthSummary.c3,
      a: monthSummary.denominator > 0 ? (monthlyTotal("A") / monthSummary.denominator) * 100 : null,
      b: monthSummary.denominator > 0 ? (monthlyTotal("B") / monthSummary.denominator) * 100 : null,
    };
  });

  const teamClassificationGroups = new Map<string, FactRow[]>();
  for (const fact of selectedFacts) {
    teamClassificationGroups.set(fact.team_id, [...(teamClassificationGroups.get(fact.team_id) ?? []), fact]);
  }
  const classificationCounts = {
    "Ótimo": 0,
    "Bom": 0,
    "Suficiente": 0,
    "Regular": 0,
    "Sem população elegível": 0,
  };
  for (const group of teamClassificationGroups.values()) {
    classificationCounts[classifyC3(ratio(group).c3)] += 1;
  }

  const comparisonMode = establishmentId !== "all" ? "team" : "ubs";
  const comparisonGroups = new Map<string, { name: string; facts: FactRow[]; id: string }>();
  for (const fact of selectedFacts) {
    const id = comparisonMode === "team" ? fact.team_id : fact.establishment_id;
    const name = comparisonMode === "team"
      ? (teamMap.get(id)?.name || teamMap.get(id)?.ine || "Equipe")
      : (establishmentMap.get(id)?.name || "UBS");
    const current: { name: string; facts: FactRow[]; id: string } =
      comparisonGroups.get(id) ?? { name, facts: [] as FactRow[], id };
    current.facts.push(fact);
    comparisonGroups.set(id, current);
  }
  const comparison = [...comparisonGroups.values()]
    .map((item) => ({ id: item.id, name: item.name, value: ratio(item.facts).c3 ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const baseParams = {
    inicio: start,
    fim: end,
    distrito: district,
    classificacao: classification,
    busca: params.busca,
  };
  const comparisonDrilldown = comparisonMode === "ubs"
    ? Object.fromEntries(comparison.map((item) => [
        item.name,
        dashboardHref({ ...baseParams, ubs: item.id }),
      ]))
    : undefined;

  const practiceRanking = Object.keys(C3_COMPONENTS)
    .map((code) => ({ code, label: PRACTICE_SHORT[code], rate: practiceRate(code) }))
    .filter((item): item is { code: string; label: string; rate: number } => item.rate !== null)
    .sort((a, b) => a.rate - b.rate);

  const lowestPractice = practiceRanking.at(0);
  const highestPractice = practiceRanking.at(-1);
  const lastUpdate = recentImports.at(0)?.uploaded_at
    ? new Date(recentImports[0].uploaded_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Fortaleza",
      })
    : "Sem importações";
  const currentDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Fortaleza",
  }).format(new Date()).replace(/^./, (char) => char.toUpperCase());

  const visibleEstablishmentIds = new Set(
    facts
      .filter((fact) => district === "all" || district === "unknown"
        ? true
        : fact.district_id === Number(district))
      .map((fact) => fact.establishment_id),
  );
  const visibleEstablishments = district === "all" || district === "unknown"
    ? establishments
    : establishments.filter((item) => visibleEstablishmentIds.has(item.id));
  const visibleTeamIds = new Set(
    facts
      .filter((fact) => establishmentId === "all" || fact.establishment_id === establishmentId)
      .map((fact) => fact.team_id),
  );
  const visibleTeams = establishmentId === "all"
    ? teams
    : teams.filter((item) => visibleTeamIds.has(item.id));

  const baseAxis = {
    axisLine: { lineStyle: { color: "#d8e2ef" } },
    axisLabel: { color: "#667892", fontSize: 11 },
    splitLine: { lineStyle: { color: "#eef3f8" } },
  };

  const evolutionOption: EChartsOption = {
    color: ["#1479e8", "#18a66a", "#7357e8"],
    tooltip: { trigger: "axis", confine: true, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    legend: { top: 0, textStyle: { color: "#53657c", fontSize: 11 } },
    grid: { left: 42, right: 18, top: 42, bottom: 34 },
    xAxis: { type: "category", data: evolution.map((item) => monthLabel(item.month)), ...baseAxis },
    yAxis: { type: "value", min: 0, max: 100, ...baseAxis },
    series: [
      { name: "C3", type: "line", smooth: true, symbolSize: 7, lineStyle: { width: 3 }, data: evolution.map((item) => item.c3) },
      { name: "1ª consulta ≤12 sem", type: "line", smooth: true, symbolSize: 6, lineStyle: { width: 2.5 }, data: evolution.map((item) => item.a) },
      { name: "7+ consultas", type: "line", smooth: true, symbolSize: 6, lineStyle: { width: 2.5 }, data: evolution.map((item) => item.b) },
    ],
  };

  const comparisonOption: EChartsOption = {
    color: ["#1682ed"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, valueFormatter: (value) => Number(value).toFixed(2) },
    grid: { left: 46, right: 14, top: 20, bottom: 72 },
    xAxis: {
      type: "category",
      data: comparison.map((item) => item.name),
      axisLabel: { color: "#667892", interval: 0, rotate: comparison.length > 6 ? 28 : 0, width: 90, overflow: "truncate" },
      axisLine: { lineStyle: { color: "#d8e2ef" } },
    },
    yAxis: { type: "value", min: 0, max: 100, ...baseAxis },
    series: [{
      type: "bar",
      barMaxWidth: 34,
      data: comparison.map((item) => ({
        value: item.value,
        itemStyle: {
          color: item.value > 75 ? "#22b36f" : item.value > 50 ? "#1682ed" : item.value > 25 ? "#f4a62a" : "#ef5350",
          borderRadius: [7, 7, 0, 0],
        },
      })),
    }],
  };

  const classificationOption: EChartsOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} equipes ({d}%)" },
    legend: { orient: "vertical", right: 0, top: "middle", textStyle: { color: "#526477", fontSize: 11 } },
    series: [{
      type: "pie",
      radius: ["50%", "76%"],
      center: ["34%", "52%"],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: [
        { name: "Ótimo", value: classificationCounts["Ótimo"], itemStyle: { color: "#22b36f" } },
        { name: "Bom", value: classificationCounts["Bom"], itemStyle: { color: "#1682ed" } },
        { name: "Suficiente", value: classificationCounts["Suficiente"], itemStyle: { color: "#f4a62a" } },
        { name: "Regular", value: classificationCounts["Regular"], itemStyle: { color: "#ef5350" } },
        { name: "Sem elegíveis", value: classificationCounts["Sem população elegível"], itemStyle: { color: "#a9b5c5" } },
      ],
    }],
    graphic: [{
      type: "text",
      left: "26%",
      top: "46%",
      style: {
        text: `${teamCount}\nequipes`,
        align: "center",
        fill: "#143154",
        fontSize: 18,
        fontWeight: 800,
        lineHeight: 22,
      },
    }],
  };

  const componentsOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
      formatter(params: unknown) {
        const item = Array.isArray(params) ? params[0] as { axisValue?: string; value?: number } : null;
        const code = item?.axisValue ?? "";
        return `<strong>${code} · ${PRACTICE_SHORT[code] ?? ""}</strong><br/>${Number(item?.value ?? 0).toFixed(1)}% de cobertura no recorte`;
      },
    },
    grid: { left: 42, right: 18, top: 20, bottom: 40 },
    xAxis: { type: "category", data: Object.keys(C3_COMPONENTS), ...baseAxis },
    yAxis: { type: "value", min: 0, max: 100, ...baseAxis },
    series: [{
      type: "bar",
      barMaxWidth: 36,
      data: Object.keys(C3_COMPONENTS).map((code) => {
        const value = practiceRate(code) ?? 0;
        return {
          value,
          itemStyle: {
            color: value >= 75 ? "#22b36f" : value >= 50 ? "#1682ed" : value >= 25 ? "#f4a62a" : "#ef5350",
            borderRadius: [7, 7, 0, 0],
          },
        };
      }),
    }],
  };

  const heroPeriod = start && end
    ? `${monthLabel(start)} – ${monthLabel(end)}`
    : "Sem dados";

  return (
    <div className="management-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-overline">Visão consolidada · C3 Gestação e Puerpério</span>
          <h1>Olá, Gestão de Saúde</h1>
          <p>Acompanhe indicadores oficiais do SIAPS com filtros territoriais, comparativos e detalhamento das práticas A–K.</p>
          <div className="dashboard-scope-chips">
            <span><Building2 className="size-4" /> {ubsCount} UBS</span>
            <span><Users className="size-4" /> {teamCount} equipes</span>
            <span><CalendarDays className="size-4" /> {periodMonths.length} competências</span>
          </div>
        </div>
        <div className="dashboard-date-block">
          <strong>{currentDate}</strong>
          <span>Última atualização: {lastUpdate}</span>
          <small>Período analisado: {heroPeriod}</small>
        </div>
      </section>

      <section className="dashboard-filter-zone">
        <form method="get" className="dashboard-filter-grid">
          <label>Início
            <select name="inicio" defaultValue={start}>{competencies.map((item) => <option key={item} value={item}>{longMonthLabel(item)}</option>)}</select>
          </label>
          <label>Fim
            <select name="fim" defaultValue={end}>{competencies.map((item) => <option key={item} value={item}>{longMonthLabel(item)}</option>)}</select>
          </label>
          <label>Distrito
            <select name="distrito" defaultValue={district}>
              <option value="all">Todos os distritos</option>
              <option value="unknown">Não informado</option>
              {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>UBS
            <select name="ubs" defaultValue={establishmentId}>
              <option value="all">Todas as UBS</option>
              {visibleEstablishments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.cnes}</option>)}
            </select>
          </label>
          <label>Equipe
            <select name="equipe" defaultValue={teamId}>
              <option value="all">Todas as equipes</option>
              {visibleTeams.map((item) => <option key={item.id} value={item.id}>{item.name || item.ine}</option>)}
            </select>
          </label>
          <label>Classificação C3
            <select name="classificacao" defaultValue={classification}>
              {Object.entries(CLASSIFICATION_CODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="dashboard-search-filter">Busca
            <input name="busca" defaultValue={params.busca} placeholder="Nome, CNES ou INE" />
          </label>
          <div className="dashboard-filter-actions">
            <button type="submit"><Activity className="size-4" /> Aplicar filtros</button>
            <Link href="/sistema/gestao">Limpar</Link>
          </div>
        </form>

        <Link href="/sistema/importar" className="dashboard-import-cta">
          <span className="dashboard-import-icon"><FileSpreadsheet className="size-8" /></span>
          <span><strong>Importar planilha SIAPS</strong><small>Atualize os dados oficiais da Gestão</small></span>
          <TrendingUp className="size-5" />
        </Link>
      </section>

      <section id="indicadores" className="dashboard-kpi-grid">
        <MetricCard title="C3 consolidado" value={formatC3(summary.c3)} subtitle={classifyC3(summary.c3)} icon={BarChart3} tone="tone-blue" />
        <MetricCard title="Denominador acumulado" value={formatNumber(summary.denominator)} subtitle="registros elegíveis no período" icon={Users} tone="tone-cyan" />
        <MetricCard title="1ª consulta até 12 semanas" value={formatPercent(practiceRate("A"))} subtitle={`${formatNumber(componentTotals.A ?? 0)} registros`} icon={CalendarDays} tone="tone-violet" />
        <MetricCard title="7+ consultas de pré-natal" value={formatPercent(practiceRate("B"))} subtitle={`${formatNumber(componentTotals.B ?? 0)} registros`} icon={Stethoscope} tone="tone-green" />
        <MetricCard title="Visitas domiciliares" value={formatPercent(practiceRate("E"))} subtitle={`${formatNumber(componentTotals.E ?? 0)} registros`} icon={Home} tone="tone-orange" />
        <MetricCard title="Saúde bucal" value={formatPercent(practiceRate("K"))} subtitle={`${formatNumber(componentTotals.K ?? 0)} registros`} icon={CheckCircle2} tone="tone-pink" />
        <MetricCard title="Equipes analisadas" value={formatNumber(teamCount)} subtitle={`${ubsCount} UBS no recorte`} icon={Building2} tone="tone-sky" />
      </section>

      <section id="ubs-equipes" className="dashboard-chart-row">
        <article className="dashboard-card dashboard-chart-large">
          <div className="dashboard-card-heading">
            <div><span>Evolução temporal</span><h2>Evolução mensal dos principais indicadores</h2></div>
            <span className="dashboard-card-pill">Percentual (%)</span>
          </div>
          {evolution.length ? <MaeChart option={evolutionOption} ariaLabel="Evolução mensal do C3, primeira consulta e sete consultas" height={300} /> : <p className="empty-state">Sem dados no recorte.</p>}
        </article>

        <article className="dashboard-card dashboard-chart-medium">
          <div className="dashboard-card-heading">
            <div><span>{comparisonMode === "ubs" ? "Por UBS" : "Por equipe"}</span><h2>C3 por {comparisonMode === "ubs" ? "UBS" : "equipe"}</h2></div>
            <span className="dashboard-card-pill">Clique para detalhar</span>
          </div>
          {comparison.length ? <MaeChart option={comparisonOption} ariaLabel="Comparação do C3 por território" drilldown={comparisonDrilldown} height={300} /> : <p className="empty-state">Sem dados no recorte.</p>}
        </article>

        <article className="dashboard-card dashboard-chart-donut">
          <div className="dashboard-card-heading">
            <div><span>Distribuição</span><h2>Equipes por classificação C3</h2></div>
          </div>
          <MaeChart option={classificationOption} ariaLabel="Distribuição das equipes por classificação C3" height={300} />
        </article>
      </section>

      <section id="comparativos" className="dashboard-card dashboard-components-card">
        <div className="dashboard-card-heading">
          <div>
            <span>Práticas A–K</span>
            <h2>Cobertura dos componentes do indicador C3</h2>
            <p>Percentual calculado a partir das contagens oficiais e do denominador agregado do recorte selecionado.</p>
          </div>
          <span className="dashboard-card-pill">A–K</span>
        </div>
        <MaeChart option={componentsOption} ariaLabel="Cobertura percentual das práticas A a K" height={280} />
        <div className="practice-legend">
          {Object.keys(C3_COMPONENTS).map((code) => <span key={code}><strong>{code}</strong>{PRACTICE_SHORT[code]}</span>)}
        </div>
      </section>

      <section id="resumo" className="dashboard-bottom-grid">
        <article className="dashboard-card dashboard-attention">
          <div className="dashboard-card-heading">
            <div><span>Leitura rápida</span><h2>Práticas com menor cobertura</h2></div>
            <AlertTriangle className="size-5 text-amber-500" />
          </div>
          <div className="attention-list">
            {practiceRanking.slice(0, 4).map((item, index) => (
              <div key={item.code}>
                <span className={index < 2 ? "attention-dot critical" : "attention-dot"} />
                <div><strong>{item.code} · {item.label}</strong><small>{C3_COMPONENTS[item.code as keyof typeof C3_COMPONENTS]}</small></div>
                <b>{formatPercent(item.rate)}</b>
              </div>
            ))}
            {!practiceRanking.length && <p className="empty-mini">Sem dados de práticas para o recorte.</p>}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span>Rastreabilidade</span><h2>Últimas importações SIAPS</h2></div>
            <Link href="/sistema/importar">Ver histórico →</Link>
          </div>
          <div className="dashboard-import-table">
            <div className="dashboard-import-row header"><span>Data</span><span>Arquivo</span><span>Registros</span><span>Status</span></div>
            {recentImports.map((item) => (
              <div className="dashboard-import-row" key={item.id}>
                <span>{new Date(item.uploaded_at).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</span>
                <span title={item.filename}>{item.filename}</span>
                <span>{formatNumber(item.rows_total)}</span>
                <span><b className="status-ok">{item.status}</b></span>
              </div>
            ))}
            {!recentImports.length && <p className="empty-mini">Nenhuma importação registrada.</p>}
          </div>
        </article>

        <article className="dashboard-card dashboard-analysis">
          <div className="dashboard-card-heading">
            <div><span>Análise consolidada</span><h2>Resumo da Gestão</h2></div>
            <Info className="size-5 text-blue-500" />
          </div>
          <div className="analysis-icon"><Database className="size-8" /></div>
          <p>
            No recorte selecionado, o C3 consolidado é <strong>{formatC3(summary.c3)}</strong> ({classifyC3(summary.c3)}),
            com <strong>{formatNumber(summary.denominator)}</strong> registros elegíveis distribuídos em <strong>{teamCount}</strong> equipes e <strong>{ubsCount}</strong> UBS.
          </p>
          {lowestPractice && highestPractice && (
            <p>
              Entre as práticas A–K, <strong>{lowestPractice.code} · {lowestPractice.label}</strong> apresenta a menor cobertura ({formatPercent(lowestPractice.rate)}),
              enquanto <strong>{highestPractice.code} · {highestPractice.label}</strong> apresenta a maior ({formatPercent(highestPractice.rate)}).
            </p>
          )}
          <div className="analysis-note"><Sparkles className="size-4" /> Use os filtros e comparativos para localizar diferenças entre territórios antes de aprofundar a análise.</div>
        </article>
      </section>

      <div className="dashboard-data-note">
        <ClipboardList className="size-4" />
        <span>Os percentuais apresentados são derivados exclusivamente dos dados oficiais carregados no MAE APS; não são utilizados valores simulados no Dashboard.</span>
      </div>
    </div>
  );
}
