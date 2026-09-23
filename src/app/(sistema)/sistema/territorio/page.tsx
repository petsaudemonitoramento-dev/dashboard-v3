import Link from "next/link";
import { MapPin, PencilLine } from "lucide-react";

import { requireManagementAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";
import { updateTerritoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TerritoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await enforceRouteGuard(() => requireManagementAccess());
  const params = await searchParams;
  const supabase = await createClient();
  const [establishmentsResult, districtsResult, historiesResult, linksResult, teamsResult] = await Promise.all([
    supabase.schema("core").from("establishments").select("id, cnes, name").eq("active", true).order("name"),
    supabase.schema("core").from("districts").select("id, name").eq("active", true).order("name"),
    supabase.schema("core").from("establishment_district_history").select("id, establishment_id, district_id, valid_from, valid_to").is("valid_to", null),
    supabase.schema("core").from("team_establishment_history").select("team_id, establishment_id").is("valid_to", null),
    supabase.schema("core").from("teams").select("id, ine, name").eq("active", true),
  ]);
  if ([establishmentsResult, districtsResult, historiesResult, linksResult, teamsResult].some((result) => result.error)) throw new Error("Não foi possível carregar o território.");
  const districts = districtsResult.data ?? [];
  const districtNames = new Map(districts.map((item) => [item.id, item.name]));
  const histories = new Map((historiesResult.data ?? []).map((item) => [item.establishment_id, item]));
  const teams = new Map((teamsResult.data ?? []).map((item) => [item.id, item]));
  const teamsByEstablishment = new Map<string, typeof teamsResult.data>();
  for (const link of linksResult.data ?? []) teamsByEstablishment.set(link.establishment_id, [...(teamsByEstablishment.get(link.establishment_id) ?? []), teams.get(link.team_id)!]);
  const query = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const districtFilter = params.distrito ?? "all";
  const rows = (establishmentsResult.data ?? []).filter((item) => {
    const history = histories.get(item.id);
    if (districtFilter === "unknown" && history) return false;
    if (districtFilter !== "all" && districtFilter !== "unknown" && history?.district_id !== Number(districtFilter)) return false;
    return !query || `${item.name} ${item.cnes}`.toLocaleLowerCase("pt-BR").includes(query);
  });
  const editing = (establishmentsResult.data ?? []).find((item) => item.id === params.editar);
  const current = editing ? histories.get(editing.id) : null;

  return <div className="space-y-6">
    <section className="hero-panel"><div><span className="eyebrow">Organização territorial</span><h1>Território</h1><p>Complete e corrija vínculos de UBS preservando todo o histórico de vigência.</p></div><MapPin className="size-16 text-cyan-300" /></section>
    <form className="filter-bar" method="get"><label className="md:col-span-2">Busca<input className="field" name="busca" defaultValue={params.busca} placeholder="UBS ou CNES" /></label><label>Distrito<select name="distrito" defaultValue={districtFilter}><option value="all">Todos</option><option value="unknown">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" type="submit">Filtrar</button></form>
    <section className="panel"><div className="panel-heading"><span className="eyebrow">{rows.length} estabelecimentos</span><h2>UBS e equipes vinculadas</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>UBS</th><th>CNES</th><th>Distrito atual</th><th>Equipes</th><th></th></tr></thead><tbody>{rows.map((item) => { const linked = teamsByEstablishment.get(item.id) ?? []; const history = histories.get(item.id); return <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.cnes}</td><td>{history ? districtNames.get(history.district_id) : <span className="badge bg-amber-100! text-amber-800!">Não informado</span>}</td><td><strong>{linked.length}</strong>{linked.slice(0, 3).map((team) => <small className="block text-slate-500" key={team.id}>{team.name || team.ine}</small>)}</td><td>{profile.role !== "leitura" && <Link className="inline-flex items-center gap-1 font-bold text-sky-700" href={`/sistema/territorio?editar=${item.id}&busca=${encodeURIComponent(params.busca ?? "")}&distrito=${districtFilter}`}><PencilLine className="size-4"/>Editar território</Link>}</td></tr>; })}</tbody></table></div></section>
    {editing && profile.role !== "leitura" && <aside className="fixed inset-0 z-40 flex justify-end bg-slate-950/35"><div className="h-full w-full max-w-md overflow-y-auto bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><span className="eyebrow">Editar território</span><h2 className="mt-2 text-2xl font-bold text-slate-900">{editing.name}</h2><p className="text-sm text-slate-500">CNES {editing.cnes}</p></div><Link className="text-2xl text-slate-500" href="/sistema/territorio" aria-label="Fechar">×</Link></div><div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm"><span className="block text-slate-500">Distrito atual</span><strong>{current ? districtNames.get(current.district_id) : "Não informado"}</strong>{current && <span className="mt-1 block text-slate-500">Vigente desde {new Date(`${current.valid_from}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>}</div><form action={updateTerritoryAction} className="mt-6 grid gap-5"><input type="hidden" name="establishmentId" value={editing.id}/><label className="grid gap-2 text-sm font-bold text-slate-700">Novo distrito<select className="field" name="districtId" defaultValue={current?.district_id ?? ""}><option value="">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-slate-700">Data inicial de validade<input className="field" name="validFrom" type="date" required /></label><p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">O período anterior será encerrado no dia anterior. Competências anteriores não serão sobrescritas e a alteração será auditada.</p><button className="primary-button" type="submit">Salvar novo período</button></form></div></aside>}
  </div>;
}
