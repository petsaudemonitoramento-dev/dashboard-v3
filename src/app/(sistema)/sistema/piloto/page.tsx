import type { EChartsOption } from "echarts";

import { MaeChart } from "@/components/charts/mae-chart";
import { aggregateC3, C3_COMPONENTS, type C3Fact } from "@/lib/analytics/c3";
import { requireManagementAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Fact = { id: number; competency: string; team_id: string; district_id: number | null; denominator: number; points_total: number | string };

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)).replace(" de ", "/").toUpperCase();
}

export default async function PilotPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await enforceRouteGuard(() => requireManagementAccess());
  const params = await searchParams;
  const supabase = await createClient();
  const cohortResult = await supabase.schema("study").from("cohorts").select("id, name, description").eq("code", "piloto_2026_c3").eq("active", true).maybeSingle();
  if (cohortResult.error || !cohortResult.data) throw new Error("A coorte piloto_2026_c3 não foi encontrada.");
  const [membersResult, teamsResult, districtsResult] = await Promise.all([
    supabase.schema("study").from("cohort_members").select("team_id, district_id, stratum, notes").eq("cohort_id", cohortResult.data.id),
    supabase.schema("core").from("teams").select("id, ine, name").eq("active", true),
    supabase.schema("core").from("districts").select("id, name").eq("active", true).order("name"),
  ]);
  if (membersResult.error || teamsResult.error || districtsResult.error) throw new Error("Não foi possível carregar a coorte piloto.");
  const members = membersResult.data ?? [];
  const memberIds = members.map((item) => item.team_id);
  const factsResult = memberIds.length ? await supabase.schema("analytics").from("c3_team_monthly").select("id, competency, team_id, district_id, denominator, points_total").eq("is_current", true).in("team_id", memberIds).order("competency") : { data: [], error: null };
  if (factsResult.error) throw new Error("Não foi possível carregar os fatos do piloto.");
  const facts = (factsResult.data ?? []) as Fact[];
  const competencies = [...new Set(facts.map((fact) => fact.competency.slice(0, 7)))].sort();
  const competency = competencies.includes(params.competencia ?? "") ? params.competencia! : competencies.at(-1) ?? "";
  const district = params.distrito ?? "all";
  const team = params.equipe ?? "all";
  const teams = new Map((teamsResult.data ?? []).map((item) => [item.id, item]));
  const districts = districtsResult.data ?? [];
  const districtNames = new Map(districts.map((item) => [item.id, item.name]));
  const selectedMembers = members.filter((member) => (district === "all" || String(member.district_id ?? "unknown") === district) && (team === "all" || member.team_id === team));
  const selectedIds = new Set(selectedMembers.map((item) => item.team_id));
  const selectedFacts = facts.filter((fact) => fact.competency.startsWith(competency) && selectedIds.has(fact.team_id));
  const asAggregate = (rows: Fact[]) => aggregateC3(rows.map((fact): C3Fact => ({ pointsTotal: Number(fact.points_total), denominator: fact.denominator, districtId: fact.district_id })));
  const summary = asAggregate(selectedFacts);
  const evolution = competencies.map((month) => asAggregate(facts.filter((fact) => fact.competency.startsWith(month) && selectedIds.has(fact.team_id))).c3);
  const totals = Object.fromEntries(Object.keys(C3_COMPONENTS).map((code) => [code, 0])) as Record<string, number>;
  const ids = selectedFacts.map((fact) => fact.id);
  if (ids.length) {
    const practices = await supabase.schema("analytics").from("c3_practice_counts").select("practice_code, fulfilled").in("fact_id", ids);
    if (practices.error) throw new Error("Não foi possível carregar A–K do piloto.");
    for (const item of practices.data ?? []) totals[item.practice_code] += item.fulfilled;
  }
  const lineOption: EChartsOption = { tooltip: { trigger: "axis" }, grid: { left: 48, right: 25, top: 24, bottom: 42 }, xAxis: { type: "category", data: competencies.map((item) => monthLabel(`${item}-01`)) }, yAxis: { type: "value", min: 0, max: 100 }, series: [{ type: "line", smooth: true, data: evolution, lineStyle: { color: "#0b72e7", width: 4 }, itemStyle: { color: "#16b8b1" }, areaStyle: { color: "rgba(22,184,177,.10)" } }] };
  const barOption: EChartsOption = { grid: { left: 48, right: 25, top: 24, bottom: 36 }, xAxis: { type: "category", data: Object.keys(totals) }, yAxis: { type: "value" }, series: [{ type: "bar", data: Object.values(totals), itemStyle: { color: "#ff9f43", borderRadius: [6, 6, 0, 0] } }] };

  return <div className="space-y-6"><section className="hero-panel"><div><span className="eyebrow">Coorte analítica</span><h1>Piloto 2026 · C3</h1><p>{cohortResult.data.description || "Acompanhamento da coorte metodológica sem limitar a ingestão municipal."}</p></div><div className="rounded-2xl bg-white/10 p-4 text-center"><strong className="block text-3xl">{members.length}</strong><span className="text-xs text-white/70">equipes na coorte</span></div></section>
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><strong>Nota metodológica:</strong> os rótulos “boa” e “ruim” são estratos metodológicos externos recebidos com a coorte. Não representam avaliação, ranking ou classificação calculada pelo C3.</div>
    <form className="filter-bar" method="get"><label>Período<select name="competencia" defaultValue={competency}>{competencies.map((item) => <option key={item} value={item}>{monthLabel(`${item}-01`)}</option>)}</select></label><label>Distrito<select name="distrito" defaultValue={district}><option value="all">Todos</option><option value="unknown">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="md:col-span-2">Equipe<select name="equipe" defaultValue={team}><option value="all">Todas as equipes</option>{members.map((item) => { const value = teams.get(item.team_id); return <option key={item.team_id} value={item.team_id}>{value?.name || value?.ine}</option>; })}</select></label><button className="primary-button" type="submit">Aplicar</button></form>
    <section className="metric-grid"><article className="metric-card accent-blue"><span>C3 consolidado</span><strong>{summary.c3 === null ? "—" : summary.c3.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></article><article className="metric-card accent-green"><span>Equipes no recorte</span><strong>{summary.teams}</strong></article><article className="metric-card accent-orange"><span>Denominador</span><strong>{summary.denominator.toLocaleString("pt-BR")}</strong></article><article className="metric-card accent-aqua"><span>Competência</span><strong className="text-2xl">{competency ? monthLabel(`${competency}-01`) : "—"}</strong></article></section>
    <section className="chart-grid"><article className="panel lg:col-span-2"><div className="panel-heading"><span className="eyebrow">Série histórica</span><h2>Evolução C3 da coorte</h2></div><MaeChart option={lineOption} ariaLabel="Evolução C3 das equipes do piloto" /></article><article className="panel"><div className="panel-heading"><span className="eyebrow">Práticas</span><h2>Componentes A–K</h2></div><MaeChart option={barOption} componentDescriptions={C3_COMPONENTS} ariaLabel="Componentes A a K do piloto" /></article></section>
    <section className="panel"><div className="panel-heading"><span className="eyebrow">{selectedMembers.length} equipes</span><h2>Composição da coorte</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Equipe</th><th>INE</th><th>Distrito</th><th>Estrato metodológico externo</th></tr></thead><tbody>{selectedMembers.map((member) => { const item = teams.get(member.team_id); return <tr key={member.team_id}><td><strong>{item?.name || "Equipe sem nome"}</strong></td><td>{item?.ine}</td><td>{member.district_id ? districtNames.get(member.district_id) : "Não informado"}</td><td>{member.stratum ? <span className="badge">{member.stratum}</span> : "—"}</td></tr>; })}</tbody></table></div></section>
  </div>;
}
