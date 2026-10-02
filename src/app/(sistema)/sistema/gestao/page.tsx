import Link from "next/link";
import type { EChartsOption } from "echarts";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CircleHelp,
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
import { ManagementDashboardFilters } from "@/components/dashboard/dashboard-filters";
import { aggregateC3, C3_COMPONENTS, classifyC3, type C3Fact } from "@/lib/analytics/c3";
import { loadDashboardPracticeTotalsForPeriod } from "@/lib/analytics/dashboard-data";
import {
  managementDashboardHref,
  normalizeDashboardPeriodFilters,
  type DashboardSearchParams,
} from "@/lib/analytics/dashboard-filters";
import { requireDashboardAccess } from "@/lib/auth/guards";
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

const PRACTICE_FACTS_PER_REQUEST = 90;

const CLASSIFICATION_CODES = {
  all: "Todas",
  otimo: "Ótimo",
  bom: "Bom",
  suficiente: "Suficiente",
  regular: "Regular",
  invalido: "Valor inválido",
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
  if (value === "Valor inválido") return "invalido";
  return "sem";
}

function DashboardHelp({ text }: { text: string }) {
  return (
    <span
      aria-label={`Como é calculado: ${text}`}
      className="dashboard-help"
      data-tooltip={text}
      role="img"
      tabIndex={0}
    >
      <CircleHelp aria-hidden="true" />
    </span>
  );
}

function attentionBand(rate: number) {
  if (rate <= 25) return { className: "critical", label: "Alta prioridade" };
  if (rate <= 50) return { className: "warning", label: "Atenção" };
  return { className: "watch", label: "Monitorar" };
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  help,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
  help: string;
}) {
  return (
    <article className={`dashboard-kpi ${tone}`}>
      <div className="dashboard-kpi-icon"><Icon aria-hidden="true" className="size-6" /></div>
      <div>
        <div className="dashboard-kpi-title">
          <span>{title}</span>
          <DashboardHelp text={help} />
        </div>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </article>
  );
}

export default async function ManagementDashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { profile } = await enforceRouteGuard(() => requireDashboardAccess());
  // Somente a Gestão importa dados e lê o histórico de importações (RLS).
  const canImport = profile.role === "gestao";
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

  const establishmentMap = new Map(establishments.map((item) => [item.id, item]));
  const teamMap = new Map(teams.map((item) => [item.id, item]));

  const competencies = [...new Set(facts.map((fact) => fact.competency.slice(0, 7)))].sort();
  const filters = normalizeDashboardPeriodFilters({
    competencies,
    facts,
    searchParams: params,
  });
  if (filters.needsRedirect) {
    redirect(managementDashboardHref(filters));
  }
  const {
    start,
    end,
    periodMonths,
    district,
    establishmentId,
    teamId,
    classification,
  } = filters;
  const query = filters.query.toLocaleLowerCase("pt-BR");

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

  const componentTotals: Record<string, number> = Object.fromEntries(Object.keys(C3_COMPONENTS).map((code) => [code, 0]));
  const componentTotalsByMonth = new Map(
    periodMonths.map((month) => [
      month,
      Object.fromEntries(Object.keys(C3_COMPONENTS).map((code) => [code, 0])) as Record<string, number>,
    ]),
  );

  if (!query && classification === "all") {
    // O caminho comum usa a RPC agregada: cada competência transfere no máximo
    // onze linhas, sem depender do limite de 1.000 linhas do PostgREST.
    const totals = await loadDashboardPracticeTotalsForPeriod(supabase, {
      months: periodMonths,
      district,
      establishmentId,
      teamId,
    });
    for (const row of totals) {
      componentTotals[row.practice_code] = (componentTotals[row.practice_code] ?? 0) + row.fulfilled;
      const monthly = componentTotalsByMonth.get(row.month);
      if (monthly) monthly[row.practice_code] = row.fulfilled;
    }
  } else {
    // Busca e classificação são filtros sobre equipes já calculadas. Neste caso,
    // os lotes preservam o recorte exato e permanecem abaixo de 1.000 linhas.
    const factMonthById = new Map(selectedFacts.map((fact) => [fact.id, fact.competency.slice(0, 7)]));
    const practiceRows: PracticeRow[] = [];
    for (let index = 0; index < selectedFacts.length; index += PRACTICE_FACTS_PER_REQUEST) {
      const ids = selectedFacts.slice(index, index + PRACTICE_FACTS_PER_REQUEST).map((fact) => fact.id);
      if (!ids.length) continue;
      const result = await supabase
        .schema("analytics")
        .from("c3_practice_counts")
        .select("fact_id, practice_code, fulfilled", { count: "exact" })
        .in("fact_id", ids)
        .order("fact_id")
        .order("practice_code");
      if (result.error) throw new Error("Não foi possível consultar as práticas A–K.");
      const rows = (result.data ?? []) as PracticeRow[];
      if (result.count !== rows.length) throw new Error("Consulta parcial das práticas A–K.");
      practiceRows.push(...rows);
    }
    for (const row of practiceRows) {
      componentTotals[row.practice_code] = (componentTotals[row.practice_code] ?? 0) + row.fulfilled;
      const month = factMonthById.get(row.fact_id);
      const monthly = month ? componentTotalsByMonth.get(month) : undefined;
      if (monthly) {
        monthly[row.practice_code] = (monthly[row.practice_code] ?? 0) + row.fulfilled;
      }
    }
  }

  const practiceRate = (code: string) =>
    summary.denominator > 0 ? ((componentTotals[code] ?? 0) / summary.denominator) * 100 : null;

  const evolution = periodMonths.map((month) => {
    const monthFacts = selectedFacts.filter((fact) => fact.competency.startsWith(month));
    const monthSummary = ratio(monthFacts);
    const monthlyTotal = (code: string) => componentTotalsByMonth.get(month)?.[code] ?? 0;
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
    "Valor inválido": 0,
    "Sem população elegível": 0,
  };
  for (const group of teamClassificationGroups.values()) {
    classificationCounts[classifyC3(ratio(group).c3)] += 1;
  }

  const comparisonMode = establishmentId !== "all" ? "team" : "ubs";
  const comparisonGroups = new Map<string, { name: string; facts: FactRow[]; id: string }>();
  for (const fact of selectedFacts) {
    const id = comparisonMode === "team" ? fact.team_id : fact.establishment_id;
    const establishment = comparisonMode === "ubs" ? establishmentMap.get(id) : undefined;
    const name = comparisonMode === "team"
      ? (teamMap.get(id)?.name || teamMap.get(id)?.ine || "Equipe")
      : [establishment?.name || "UBS", establishment?.cnes || id].join(" · ");
    const current: { name: string; facts: FactRow[]; id: string } =
      comparisonGroups.get(id) ?? { name, facts: [] as FactRow[], id };
    current.facts.push(fact);
    comparisonGroups.set(id, current);
  }
  const comparison = [...comparisonGroups.values()]
    .map((item) => ({ id: item.id, name: item.name, value: ratio(item.facts).c3 ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const comparisonDrilldown = comparisonMode === "ubs"
    ? Object.fromEntries(comparison.map((item) => [
        item.name,
        managementDashboardHref({
          start,
          end,
          district,
          establishmentId: item.id,
          teamId: "all",
          classification,
          query: filters.query,
        }),
      ]))
    : undefined;

  const practiceRanking = Object.keys(C3_COMPONENTS)
    .map((code) => ({ code, label: PRACTICE_SHORT[code], rate: practiceRate(code) }))
    .filter((item): item is { code: string; label: string; rate: number } => item.rate !== null)
    .sort((a, b) => a.rate - b.rate);

  const lowestPractice = practiceRanking.at(0);
  const highestPractice = practiceRanking.at(-1);
  const attentionPractices = practiceRanking.filter((item) => item.rate < 75).slice(0, 4);
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

  const visibleDistricts = districts.filter((item) => filters.districtIds.has(String(item.id)));
  const visibleEstablishments = establishments.filter((item) =>
    filters.availableEstablishmentIds.has(item.id));
  const visibleTeams = teams.filter((item) => filters.availableTeamIds.has(item.id));

  const baseAxis = {
    axisLine: { lineStyle: { color: "#d8e2ef" } },
    axisLabel: { color: "#667892", fontSize: 11 },
    splitLine: { lineStyle: { color: "#eef3f8" } },
  };

  const evolutionOption: EChartsOption = {
    color: ["#1479e8", "#ff6d1f", "#7357e8"],
    tooltip: { trigger: "axis", confine: true },
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
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true },
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
    title: {
      text: `${teamCount}\nequipes`,
      left: "50%",
      top: "34%",
      textAlign: "center",
      textStyle: {
        color: "#143154",
        fontSize: 18,
        fontWeight: 800,
        lineHeight: 23,
      },
    },
    legend: {
      orient: "horizontal",
      left: "center",
      bottom: 4,
      itemWidth: 13,
      itemHeight: 13,
      itemGap: 18,
      textStyle: { color: "#526477", fontSize: 11 },
    },
    series: [{
      type: "pie",
      radius: ["39%", "66%"],
      center: ["50%", "44%"],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: [
        { name: "Ótimo", value: classificationCounts["Ótimo"], itemStyle: { color: "#22b36f" } },
        { name: "Bom", value: classificationCounts["Bom"], itemStyle: { color: "#1682ed" } },
        { name: "Suficiente", value: classificationCounts["Suficiente"], itemStyle: { color: "#f4a62a" } },
        { name: "Regular", value: classificationCounts["Regular"], itemStyle: { color: "#ef5350" } },
        { name: "Valor inválido", value: classificationCounts["Valor inválido"], itemStyle: { color: "#7f1d1d" } },
        { name: "Sem elegíveis", value: classificationCounts["Sem população elegível"], itemStyle: { color: "#a9b5c5" } },
      ],
    }],
  };

  const componentsOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
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

  const evolutionAccessibleData = evolution.flatMap((item) => [
    {
      id: `${item.month}-c3`,
      label: `${monthLabel(item.month)} · C3`,
      value: formatPercent(item.c3),
    },
    {
      id: `${item.month}-a`,
      label: `${monthLabel(item.month)} · 1ª consulta até 12 semanas`,
      value: formatPercent(item.a),
    },
    {
      id: `${item.month}-b`,
      label: `${monthLabel(item.month)} · 7+ consultas`,
      value: formatPercent(item.b),
    },
  ]);
  const comparisonAccessibleData = comparison.map((item) => ({
    id: item.id,
    label: item.name,
    value: formatC3(item.value),
    href: comparisonDrilldown?.[item.name],
  }));
  const classificationAccessibleData = Object.entries(classificationCounts).map(([label, value]) => ({
    id: label,
    label,
    value: `${formatNumber(value)} equipes`,
  }));
  const componentsAccessibleData = Object.keys(C3_COMPONENTS).map((code) => ({
    id: code,
    label: `${code} · ${PRACTICE_SHORT[code]}`,
    value: formatPercent(practiceRate(code)),
    description: C3_COMPONENTS[code as keyof typeof C3_COMPONENTS],
  }));

  const heroPeriod = start && end
    ? `${monthLabel(start)} – ${monthLabel(end)}`
    : "Sem dados";

  return (
    <div className="management-dashboard">
      <section className="dashboard-welcome">
        <div>
          <h1>Olá, Gestão de Saúde</h1>
          <p>Área de análise consolidada dos dados do SIAPS sobre o cuidado na gestação.</p>
        </div>
        <div className="dashboard-date-block">
          <strong>{currentDate}</strong>
          <span>
            {canImport
              ? `Última atualização: ${lastUpdate}`
              : `Competência mais recente: ${competencies.length ? longMonthLabel(competencies.at(-1)!) : "Sem dados"}`}
          </span>
          <small>Período analisado: {heroPeriod}</small>
        </div>
      </section>

      <section className={canImport ? "dashboard-filter-zone" : "dashboard-filter-zone no-import"}>
        <ManagementDashboardFilters
          classifications={Object.entries(CLASSIFICATION_CODES).map(([value, label]) => ({ value, label }))}
          competencies={competencies.map((item) => ({ value: item, label: longMonthLabel(item) }))}
          districts={visibleDistricts.map((item) => ({ value: String(item.id), label: item.name }))}
          establishments={visibleEstablishments.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.cnes}`,
          }))}
          selection={{
            start,
            end,
            district,
            establishmentId,
            teamId,
            classification,
            query: filters.query,
          }}
          showUnknownDistrict={filters.hasUnknownDistrict}
          teams={visibleTeams.map((item) => ({
            value: item.id,
            label: `${item.name || "Equipe"} · ${item.ine}`,
          }))}
        />

        {canImport && (
          <Link href="/sistema/importar" className="dashboard-import-cta">
            <span className="dashboard-import-icon"><FileSpreadsheet aria-hidden="true" className="size-8" /></span>
            <span>
              <strong>Importar planilha do SIAPS</strong>
              <small>Atualize os dados do sistema oficial</small>
            </span>
          </Link>
        )}
      </section>

      <section id="indicadores" className="dashboard-kpi-grid">
        <MetricCard
          title="Registros elegíveis"
          value={formatNumber(summary.denominator)}
          subtitle="denominador acumulado no período"
          icon={Users}
          tone="tone-blue"
          help="Soma do denominador elegível das competências incluídas no recorte. Não é contagem de pessoas únicas quando o período possui mais de uma competência."
        />
        <MetricCard
          title="C3 consolidado"
          value={formatC3(summary.c3)}
          subtitle={classifyC3(summary.c3)}
          icon={BarChart3}
          tone="tone-orange"
          help="C3 consolidado = soma dos pontos C3 das equipes dividida pela soma do denominador elegível do recorte. O resultado varia de 0 a 100."
        />
        <MetricCard
          title="1ª consulta até 12 semanas"
          value={formatPercent(practiceRate("A"))}
          subtitle={`${formatNumber(componentTotals.A ?? 0)} registros com a prática`}
          icon={CalendarDays}
          tone="tone-violet"
          help="Cobertura A = registros que cumpriram a primeira consulta até a 12ª semana divididos pelo denominador elegível acumulado, multiplicado por 100."
        />
        <MetricCard
          title="Saúde bucal"
          value={formatPercent(practiceRate("K"))}
          subtitle={`${formatNumber(componentTotals.K ?? 0)} registros com a prática`}
          icon={Stethoscope}
          tone="tone-green"
          help="Cobertura K = registros com ao menos uma atividade de saúde bucal durante a gestação divididos pelo denominador elegível acumulado, multiplicado por 100."
        />
        <MetricCard
          title="Testes do 1º trimestre"
          value={formatPercent(practiceRate("G"))}
          subtitle={`${formatNumber(componentTotals.G ?? 0)} registros com a prática`}
          icon={CheckCircle2}
          tone="tone-pink"
          help="Cobertura G = registros com testes ou exames previstos no primeiro trimestre divididos pelo denominador elegível acumulado, multiplicado por 100."
        />
        <MetricCard
          title="Visitas domiciliares"
          value={formatPercent(practiceRate("E"))}
          subtitle={`${formatNumber(componentTotals.E ?? 0)} registros com a prática`}
          icon={Home}
          tone="tone-orange"
          help="Cobertura E = registros com pelo menos três visitas domiciliares após a primeira consulta de pré-natal divididos pelo denominador elegível acumulado, multiplicado por 100."
        />
      </section>

      <section id="ubs-equipes" className="dashboard-chart-row">
        <article className="dashboard-card dashboard-chart-large">
          <div className="dashboard-card-heading">
            <div>
              <span>Evolução temporal</span>
              <div className="dashboard-heading-title">
                <h2>Evolução mensal dos principais indicadores</h2>
                <DashboardHelp text="C3 mensal = soma dos pontos das equipes dividida pela soma do denominador elegível da competência. As linhas A e B representam registros que cumpriram cada prática divididos pelo denominador do mês, multiplicados por 100." />
              </div>
            </div>
            <span className="dashboard-card-pill">Percentual (%)</span>
          </div>
          {evolution.length ? (
            <MaeChart
              accessibleData={evolutionAccessibleData}
              option={evolutionOption}
              ariaLabel="Evolução mensal do C3, primeira consulta e sete consultas"
              height={290}
            />
          ) : <p className="empty-state">Sem dados no recorte.</p>}
        </article>

        <article className="dashboard-card dashboard-chart-medium">
          <div className="dashboard-card-heading">
            <div>
              <span>{comparisonMode === "ubs" ? "Por UBS" : "Por equipe"}</span>
              <div className="dashboard-heading-title">
                <h2>C3 por {comparisonMode === "ubs" ? "UBS" : "equipe"}</h2>
                <DashboardHelp text="Para cada UBS ou equipe, o C3 é calculado pela soma dos pontos do grupo dividida pela soma do denominador elegível do mesmo grupo, respeitando todos os filtros selecionados." />
              </div>
            </div>
            <span className="dashboard-card-pill">Comparativo</span>
          </div>
          {comparison.length ? (
            <MaeChart
              accessibleData={comparisonAccessibleData}
              option={comparisonOption}
              ariaLabel="Comparação do C3 por território"
              drilldown={comparisonDrilldown}
              height={290}
            />
          ) : <p className="empty-state">Sem dados no recorte.</p>}
        </article>
      </section>

      <section id="comparativos" className="dashboard-secondary-charts">
        <article className="dashboard-card dashboard-chart-donut">
          <div className="dashboard-card-heading">
            <div>
              <span>Distribuição</span>
              <div className="dashboard-heading-title">
                <h2>Equipes por classificação C3</h2>
                <DashboardHelp text="A classificação usa o C3 agregado de cada equipe no recorte: acima de 75 = Ótimo; acima de 50 = Bom; acima de 25 = Suficiente; até 25 = Regular. Valores fora de 0–100 são sinalizados como inválidos." />
              </div>
            </div>
          </div>
          <MaeChart
            accessibleData={classificationAccessibleData}
            option={classificationOption}
            ariaLabel="Distribuição das equipes por classificação C3"
            height={270}
          />
        </article>

        <article className="dashboard-card dashboard-components-card">
          <div className="dashboard-card-heading">
            <div>
              <span>Práticas A–K</span>
              <div className="dashboard-heading-title">
                <h2>Cobertura dos componentes do indicador C3</h2>
                <DashboardHelp text="Cobertura de cada prática A–K = total de registros que cumprem a prática dividido pelo denominador elegível acumulado do recorte, multiplicado por 100." />
              </div>
              <p>Leitura detalhada das práticas oficiais que compõem o C3.</p>
            </div>
            <span className="dashboard-card-pill">A–K</span>
          </div>
          <MaeChart
            accessibleData={componentsAccessibleData}
            option={componentsOption}
            ariaLabel="Cobertura percentual das práticas A a K"
            componentDescriptions={C3_COMPONENTS}
            height={270}
          />
          <div className="practice-legend">
            {Object.keys(C3_COMPONENTS).map((code) => (
              <span key={code}><strong>{code}</strong>{PRACTICE_SHORT[code]}</span>
            ))}
          </div>
        </article>
      </section>

      <section id="resumo" className="dashboard-bottom-grid">
        <article className="dashboard-card dashboard-attention">
          <div className="dashboard-card-heading">
            <div>
              <span>Monitoramento gerencial</span>
              <div className="dashboard-heading-title">
                <h2>Indicadores que precisam de atenção</h2>
                <DashboardHelp text="O painel destaca práticas com cobertura inferior a 75% para priorização gerencial. As faixas são usadas apenas como sinalização visual do MAE APS e não substituem metas ou critérios normativos oficiais." />
              </div>
            </div>
            <Link href="/sistema/gestao/indicadores">Ver todos →</Link>
          </div>

          <div className="attention-list">
            {attentionPractices.map((item) => {
              const band = attentionBand(item.rate);
              return (
                <div key={item.code}>
                  <span className={`attention-dot ${band.className}`} />
                  <div>
                    <strong>{item.code} · {item.label}</strong>
                    <small>{C3_COMPONENTS[item.code as keyof typeof C3_COMPONENTS]}</small>
                  </div>
                  <span className={`attention-badge ${band.className}`}>
                    {band.label} · {formatPercent(item.rate)}
                  </span>
                </div>
              );
            })}
            {!attentionPractices.length ? (
              <div className="attention-ok">
                <CheckCircle2 aria-hidden="true" />
                <span>Nenhuma prática está abaixo do limiar gerencial de 75% neste recorte.</span>
              </div>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <span>Rastreabilidade</span>
              <h2>{canImport ? "Últimas importações do SIAPS" : "Competências publicadas"}</h2>
            </div>
            {canImport && <Link href="/sistema/importar">Ver histórico →</Link>}
          </div>

          {!canImport ? (
            <p className="empty-mini">
              {competencies.length
                ? `${competencies.length} competências oficiais disponíveis, de ${longMonthLabel(competencies[0])} a ${longMonthLabel(competencies.at(-1)!)}. O histórico de arquivos importados é restrito ao perfil Gestão.`
                : "Nenhuma competência publicada."}
            </p>
          ) : (
            <div className="dashboard-import-table">
              <div className="dashboard-import-row header">
                <span>Data</span><span>Competência</span><span>Registros</span><span>Status</span>
              </div>
              {recentImports.map((item) => (
                <div className="dashboard-import-row" key={item.id}>
                  <span>{new Date(item.uploaded_at).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}</span>
                  <span title={item.filename}>{longMonthLabel(item.competency)}</span>
                  <span>{formatNumber(item.rows_total)}</span>
                  <span><b className="status-ok">{item.status}</b></span>
                </div>
              ))}
              {!recentImports.length && <p className="empty-mini">Nenhuma importação registrada.</p>}
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-analysis">
          <div className="dashboard-card-heading">
            <div>
              <span>Visão municipal</span>
              <h2>Análise consolidada da gestão</h2>
            </div>
            <Info className="size-5 text-blue-500" aria-hidden="true" />
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
          <div className="analysis-note">
            <Sparkles className="size-4" aria-hidden="true" />
            Use filtros e comparativos para localizar diferenças entre territórios antes de aprofundar a análise.
          </div>
          <p className="analysis-motto">Dados oficiais para apoiar uma gestão mais eficiente e um cuidado materno mais seguro.</p>
        </article>
      </section>

      <div className="dashboard-data-note">
        <ClipboardList className="size-4" aria-hidden="true" />
        <span>Os percentuais apresentados são derivados exclusivamente dos dados oficiais carregados no MAE APS; não são utilizados valores simulados no Dashboard.</span>
      </div>
    </div>
  );
}
