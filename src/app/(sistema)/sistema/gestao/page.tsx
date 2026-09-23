import Link from "next/link";
import type { EChartsOption } from "echarts";

import { MaeChart } from "@/components/charts/mae-chart";
import { aggregateC3, C3_COMPONENTS, classifyC3, districtLabel, type C3Fact } from "@/lib/analytics/c3";
import { requireManagementAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FactRow = { id: number; competency: string; team_id: string; establishment_id: string; district_id: number | null; denominator: number; points_total: number | string };

async function fetchFacts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: FactRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.schema("analytics").from("c3_team_monthly")
      .select("id, competency, team_id, establishment_id, district_id, denominator, points_total")
      .eq("is_current", true).order("id").range(offset, offset + 499);
    if (result.error) throw new Error("Não foi possível consultar os fatos C3.");
    rows.push(...((result.data ?? []) as FactRow[]));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return rows;
}

function ratio(facts: FactRow[]) {
  return aggregateC3(facts.map((fact): C3Fact => ({ pointsTotal: Number(fact.points_total), denominator: fact.denominator, districtId: fact.district_id })));
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(`${value.slice(0, 10)}T00:00:00Z`)).replace(" de ", "/").toUpperCase();
}

function formatC3(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dashboardHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  return `/sistema/gestao?${search}`;
}

export default async function ManagementDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await enforceRouteGuard(() => requireManagementAccess());
  const params = await searchParams;
  const supabase = await createClient();
  const [facts, districtsResult, establishmentsResult, teamsResult] = await Promise.all([
    fetchFacts(supabase),
    supabase.schema("core").from("districts").select("id, name").eq("active", true).order("name"),
    supabase.schema("core").from("establishments").select("id, cnes, name").eq("active", true).order("name"),
    supabase.schema("core").from("teams").select("id, ine, name").eq("active", true).order("name"),
  ]);
  if (districtsResult.error || establishmentsResult.error || teamsResult.error) throw new Error("Não foi possível carregar as dimensões territoriais.");

  const competencies = [...new Set(facts.map((fact) => fact.competency.slice(0, 7)))].sort();
  const competency = /^\d{4}-\d{2}$/.test(params.competencia ?? "") && competencies.includes(params.competencia!) ? params.competencia! : competencies.at(-1) ?? "";
  const district = params.distrito ?? "all";
  const establishmentId = params.ubs ?? "all";
  const teamId = params.equipe ?? "all";
  const districts = districtsResult.data ?? [];
  const establishments = establishmentsResult.data ?? [];
  const teams = teamsResult.data ?? [];
  const districtNames = new Map(districts.map((item) => [item.id, item.name]));
  const establishmentNames = new Map(establishments.map((item) => [item.id, item.name]));
  const teamNames = new Map(teams.map((item) => [item.id, item.name || item.ine]));

  const matchesScope = (fact: FactRow) => {
    if (district === "unknown" && fact.district_id !== null) return false;
    if (district !== "all" && district !== "unknown" && fact.district_id !== Number(district)) return false;
    if (establishmentId !== "all" && fact.establishment_id !== establishmentId) return false;
    return teamId === "all" || fact.team_id === teamId;
  };
  const selectedFacts = facts.filter((fact) => fact.competency.startsWith(competency) && matchesScope(fact));
  const summary = ratio(selectedFacts);
  const ubsCount = new Set(selectedFacts.map((fact) => fact.establishment_id)).size;
  const evolution = competencies.map((month) => ({ month, value: ratio(facts.filter((fact) => fact.competency.startsWith(month) && matchesScope(fact))).c3 }));

  const componentTotals = Object.fromEntries(Object.keys(C3_COMPONENTS).map((code) => [code, 0])) as Record<string, number>;
  for (let index = 0; index < selectedFacts.length; index += 100) {
    const ids = selectedFacts.slice(index, index + 100).map((fact) => fact.id);
    const practices = await supabase.schema("analytics").from("c3_practice_counts").select("practice_code, fulfilled").in("fact_id", ids);
    if (practices.error) throw new Error("Não foi possível consultar os componentes A–K.");
    for (const practice of practices.data ?? []) componentTotals[practice.practice_code] += practice.fulfilled;
  }

  const groupMode = establishmentId !== "all" || teamId !== "all" ? "team" : district !== "all" ? "ubs" : "district";
  const grouped = new Map<string, FactRow[]>();
  for (const fact of selectedFacts) {
    const key = groupMode === "team" ? (teamNames.get(fact.team_id) ?? "Equipe")
      : groupMode === "ubs" ? (establishmentNames.get(fact.establishment_id) ?? "UBS")
        : districtLabel(fact.district_id === null ? null : districtNames.get(fact.district_id));
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }
  const comparison = [...grouped.entries()].map(([name, group]) => ({ name, value: ratio(group).c3 ?? 0 })).sort((a, b) => b.value - a.value).slice(0, 18);
  const drilldown = groupMode === "district"
    ? Object.fromEntries(districts.map((item) => [item.name, dashboardHref({ competencia: competency, distrito: String(item.id) })]))
    : groupMode === "ubs"
      ? Object.fromEntries(establishments.map((item) => [item.name, dashboardHref({ competencia: competency, distrito: district, ubs: item.id })]))
      : {};

  const baseAxis = { axisLine: { lineStyle: { color: "#cbd5e1" } }, axisLabel: { color: "#526477" } };
  const evolutionOption: EChartsOption = {
    tooltip: { trigger: "axis" }, grid: { left: 48, right: 24, top: 30, bottom: 44 },
    xAxis: { type: "category", data: evolution.map((item) => monthLabel(item.month)), ...baseAxis }, yAxis: { type: "value", min: 0, max: 100, ...baseAxis },
    series: [{ type: "line", smooth: true, symbolSize: 9, data: evolution.map((item) => item.value), lineStyle: { width: 4, color: "#0b72e7" }, itemStyle: { color: "#17b6b2" }, areaStyle: { color: "rgba(11,114,231,.10)" }, animationDuration: 650 }],
  };
  const componentsOption: EChartsOption = {
    grid: { left: 48, right: 24, top: 28, bottom: 38 }, xAxis: { type: "category", data: Object.keys(C3_COMPONENTS), ...baseAxis }, yAxis: { type: "value", ...baseAxis },
    series: [{ type: "bar", data: Object.values(componentTotals), itemStyle: { color: "#16a6a1", borderRadius: [6, 6, 0, 0] }, animationDuration: 650 }],
  };
  const comparisonOption: EChartsOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } }, grid: { left: 150, right: 28, top: 16, bottom: 28 },
    xAxis: { type: "value", min: 0, max: 100, ...baseAxis }, yAxis: { type: "category", data: comparison.map((item) => item.name), axisLabel: { width: 130, overflow: "truncate", color: "#526477" } },
    series: [{ type: "bar", data: comparison.map((item) => item.value), itemStyle: { color: "#ff9f43", borderRadius: [0, 6, 6, 0] }, animationDuration: 650 }],
  };

  return <div className="space-y-6">
    <section className="hero-panel"><div><span className="eyebrow">Monitoramento C3</span><h1>Dashboard institucional</h1><p>Visão consolidada da Gestação e Puerpério com dados oficiais SIAPS.</p></div><div className="rounded-2xl bg-white/10 px-5 py-4 text-right"><span className="block text-xs text-white/70">Competência mais recente</span><strong className="text-xl">{competency ? monthLabel(`${competency}-01`) : "Sem dados"}</strong></div></section>
    <form className="filter-bar" method="get">
      <label>Período<select name="competencia" defaultValue={competency}>{competencies.map((item) => <option key={item} value={item}>{monthLabel(`${item}-01`)}</option>)}</select></label>
      <label>Distrito<select name="distrito" defaultValue={district}><option value="all">Município inteiro</option><option value="unknown">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>UBS<select name="ubs" defaultValue={establishmentId}><option value="all">Todas as UBS</option>{establishments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.cnes}</option>)}</select></label>
      <label>Equipe<select name="equipe" defaultValue={teamId}><option value="all">Todas as equipes</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name || item.ine}</option>)}</select></label>
      <button className="primary-button" type="submit">Aplicar</button>
    </form>
    <nav className="breadcrumbs" aria-label="Drill-down territorial"><Link href={dashboardHref({ competencia: competency })}>Município</Link><span>›</span><span>{district === "all" ? "Todos os distritos" : district === "unknown" ? "Não informado" : districtNames.get(Number(district))}</span>{establishmentId !== "all" && <><span>›</span><span>{establishmentNames.get(establishmentId)}</span></>}{teamId !== "all" && <><span>›</span><span>{teamNames.get(teamId)}</span></>}</nav>
    <section className="metric-grid">
      <article className="metric-card accent-blue"><span>C3 consolidado</span><strong>{formatC3(summary.c3)}</strong><small>razão das somas</small></article>
      <article className="metric-card accent-aqua"><span>Classificação</span><strong className="text-2xl">{classifyC3(summary.c3)}</strong><small>faixa oficial</small></article>
      <article className="metric-card accent-orange"><span>Denominador</span><strong>{summary.denominator.toLocaleString("pt-BR")}</strong><small>população elegível</small></article>
      <article className="metric-card accent-green"><span>Equipes</span><strong>{summary.teams}</strong><small>{ubsCount} UBS</small></article>
    </section>
    <section className="chart-grid">
      <article className="panel lg:col-span-2"><div className="panel-heading"><div><span className="eyebrow">Série histórica</span><h2>Evolução mensal do C3</h2></div></div><MaeChart option={evolutionOption} ariaLabel="Evolução mensal do C3" /></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Práticas</span><h2>Componentes A–K</h2></div></div><MaeChart option={componentsOption} ariaLabel="Contagens dos componentes A a K" componentDescriptions={C3_COMPONENTS} /></article>
      <article className="panel lg:col-span-3"><div className="panel-heading"><div><span className="eyebrow">Comparação</span><h2>Distribuição territorial</h2><p>Clique nas barras para aprofundar quando houver outro nível territorial.</p></div></div>{comparison.length ? <MaeChart option={comparisonOption} ariaLabel="Comparação do C3 entre recortes territoriais" drilldown={drilldown} /> : <p className="empty-state">Não há dados para o recorte selecionado.</p>}</article>
    </section>
  </div>;
}
