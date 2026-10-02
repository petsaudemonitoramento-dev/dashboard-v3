import Link from "next/link";
import { MapPin, PencilLine, ShieldAlert, Wrench } from "lucide-react";

import { SubmitButton } from "@/components/forms/submit-button";
import { TerritoryDialog } from "@/components/territory/territory-dialog";
import { requireTerritoryAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";
import { updateEstablishmentIdentityAction, updateTerritoryAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TerritoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await enforceRouteGuard(() => requireTerritoryAdministrator());
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
  const teamsByEstablishment = new Map<string, NonNullable<typeof teamsResult.data>>();
  for (const link of linksResult.data ?? []) {
    const team = teams.get(link.team_id);
    if (!team) continue;
    teamsByEstablishment.set(
      link.establishment_id,
      [...(teamsByEstablishment.get(link.establishment_id) ?? []), team],
    );
  }
  const query = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const districtFilter = params.distrito ?? "all";
  const rows = (establishmentsResult.data ?? []).filter((item) => {
    const history = histories.get(item.id);
    if (districtFilter === "unknown" && history) return false;
    if (districtFilter !== "all" && districtFilter !== "unknown" && history?.district_id !== Number(districtFilter)) return false;
    return !query || `${item.name} ${item.cnes}`.toLocaleLowerCase("pt-BR").includes(query);
  });
  const editing = (establishmentsResult.data ?? []).find((item) => item.id === params.editar);
  const editingIdentity = (establishmentsResult.data ?? []).find((item) => item.id === params.cadastro);
  const current = editing ? histories.get(editing.id) : null;
  const returnParams = new URLSearchParams();
  if (params.busca) returnParams.set("busca", params.busca);
  if (districtFilter !== "all") returnParams.set("distrito", districtFilter);
  const backQuery = returnParams.toString();
  const closeHref = backQuery ? `/sistema/territorio?${backQuery}` : "/sistema/territorio";
  const editorHref = (kind: "editar" | "cadastro", id: string) => {
    const next = new URLSearchParams(returnParams);
    next.set(kind, id);
    return `/sistema/territorio?${next.toString()}`;
  };

  return <div className="space-y-6">
    <section className="hero-panel"><div><span className="eyebrow">Organização territorial</span><h1>Território</h1><p>Organize vínculos das UBS e, quando necessário, faça correções cadastrais controladas de nome e CNES.</p></div><MapPin aria-hidden="true" className="size-16 text-cyan-300" /></section>
    <form className="filter-bar" method="get"><label className="md:col-span-2">Busca<input className="field" name="busca" defaultValue={params.busca} placeholder="UBS ou CNES" /></label><label>Distrito<select name="distrito" defaultValue={districtFilter}><option value="all">Todos</option><option value="unknown">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" type="submit">Filtrar</button></form>
    {params.erro === "territorio" && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">Não foi possível salvar a alteração territorial. Revise os dados e tente novamente.</p>}
    {params.salvo === "territorio" && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">Alteração territorial salva e registrada na auditoria.</p>}
    <section className="panel">
      <div className="panel-heading"><span className="eyebrow">{rows.length} estabelecimentos</span><h2>UBS e equipes vinculadas</h2></div>
      <div aria-label="Lista de UBS e equipes vinculadas" className="table-scroll" role="region" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">UBS, distrito atual, equipes e ações administrativas</caption>
          <thead><tr><th scope="col">UBS</th><th scope="col">CNES</th><th scope="col">Distrito atual</th><th scope="col">Equipes</th><th scope="col">Ações</th></tr></thead>
          <tbody>{rows.map((item) => {
            const linked = teamsByEstablishment.get(item.id) ?? [];
            const history = histories.get(item.id);
            return <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.cnes}</td><td>{history ? districtNames.get(history.district_id) : <span className="badge bg-amber-100! text-amber-800!">Não informado</span>}</td><td><strong>{linked.length}</strong>{linked.slice(0, 3).map((team) => <small className="block text-slate-500" key={team.id}>{team.name || team.ine}</small>)}</td><td><div className="flex flex-col items-start gap-2"><Link className="inline-flex items-center gap-1 font-bold text-sky-700" href={editorHref("editar", item.id)}><PencilLine aria-hidden="true" className="size-4"/>Editar território</Link><Link className="inline-flex items-center gap-1 text-sm font-bold text-amber-700" href={editorHref("cadastro", item.id)}><Wrench aria-hidden="true" className="size-4"/>Ajustar cadastro</Link></div></td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    {editing && (
      <TerritoryDialog
        closeHref={closeHref}
        description={`CNES ${editing.cnes}`}
        eyebrow="Editar território"
        title={editing.name}
      >
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">
          <span className="block text-slate-600">Distrito atual</span>
          <strong>{current ? districtNames.get(current.district_id) : "Não informado"}</strong>
          {current && <span className="mt-1 block text-slate-600">Vigente desde {new Date(`${current.valid_from}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>}
        </div>
        <form action={updateTerritoryAction} className="mt-6 grid gap-5">
          <input type="hidden" name="establishmentId" value={editing.id}/>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Novo distrito<select className="field" name="districtId" defaultValue={current?.district_id ?? ""}><option value="">Não informado</option>{districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Data inicial de validade<input className="field" name="validFrom" type="date" required /></label>
          <label className="flex items-start gap-2 text-sm text-slate-700"><input className="mt-1" name="confirmation" type="checkbox" value="true" required/>Confirmo a alteração territorial e sua vigência histórica.</label>
          <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">O período anterior será encerrado no dia anterior. Competências anteriores não serão sobrescritas e a alteração será auditada.</p>
          <SubmitButton label="Salvar novo período" />
        </form>
      </TerritoryDialog>
    )}

    {editingIdentity && (
      <TerritoryDialog
        closeHref={closeHref}
        description="Use somente para corrigir cadastro incorreto."
        eyebrow="Ajuste cadastral restrito"
        title="Nome e CNES da UBS"
      >
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><div><strong className="block">Ação de risco — alteração auditada</strong><span>O UUID interno e os fatos históricos são preservados, mas mudar o CNES altera a identificação usada nas próximas importações. Faça a correção apenas após conferir a fonte oficial.</span></div></div>
        {params.erro && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{params.erro}</p>}
        <form action={updateEstablishmentIdentityAction} className="mt-6 grid gap-5">
          <input type="hidden" name="establishmentId" value={editingIdentity.id}/>
          <input type="hidden" name="returnQuery" value={backQuery}/>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Nome oficial da UBS<input className="field" name="name" defaultValue={editingIdentity.name} maxLength={200} minLength={3} required /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">CNES<input className="field" name="cnes" defaultValue={editingIdentity.cnes} inputMode="numeric" pattern="[0-9]{7}" maxLength={7} minLength={7} required /><small className="font-normal text-slate-500">Exatamente 7 dígitos.</small></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><input className="mt-1 size-4" type="checkbox" name="confirmOfficial" required /><span><strong className="block text-slate-900">Conferi os dados em fonte oficial.</strong>Confirmo que o nome e o CNES acima correspondem ao estabelecimento correto.</span></label>
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950"><input className="mt-1 size-4" type="checkbox" name="confirmRisk" required /><span><strong className="block">Entendo o impacto desta alteração.</strong>Se o CNES for alterado, futuras planilhas devem utilizar o código corrigido para evitar novo cadastro indevido.</span></label>
          <SubmitButton label="Confirmar ajuste cadastral" pendingLabel="Salvando ajuste..." className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60" />
        </form>
      </TerritoryDialog>
    )}
  </div>;
}
