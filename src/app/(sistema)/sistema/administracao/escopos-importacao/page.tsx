import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { manageImportScopeAction } from "./actions";

export const dynamic = "force-dynamic";

type Editor = { user_id: string; email: string; active: boolean; role: string };
type Grant = { id: string; user_id: string; scope_kind: string; ine: string | null; granted_at: string };

export default async function ImportScopesPage({
  searchParams,
}: { searchParams: Promise<{ result?: string }> }) {
  await enforceRouteGuard(() => requireAdministrator());
  const result = (await searchParams).result ?? "";
  const privileged = createPrivilegedClient();
  const [users, permissions] = await Promise.all([
    privileged.schema("app").from("profiles").select("user_id,email,active,role").eq("role","gestao").eq("active",true).order("email").limit(300),
    privileged.schema("siaps").from("c3_editor_scopes").select("id,user_id,scope_kind,ine,granted_at").eq("municipality_ibge","250400").limit(1500),
  ]);
  if (users.error || permissions.error) {
    return <section className="panel" role="alert">
      <h1>Escopos de importação indisponíveis</h1>
      <p>O Importador V2 ainda não está configurado no banco. Nenhuma permissão foi modificada.</p>
      <Link href="/sistema/administracao">Voltar à administração</Link>
    </section>;
  }
  const editors = (users.data ?? []) as Editor[];
  const grants = (permissions.data ?? []) as Grant[];

  return <div className="space-y-6">
    <section className="hero-panel">
      <div>
        <span className="eyebrow">Administração · SIAPS C3</span>
        <h1>Permissões de importação</h1>
        <p>Defina explicitamente quais equipes cada editor pode publicar. O envio para análise não concede permissão de escrita.</p>
      </div>
      <ShieldCheck aria-hidden="true" className="size-12" />
    </section>
    {result && <p role={result === "salvo" ? "status" : "alert"}
      className={`rounded-xl border p-4 text-sm ${result === "salvo" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
      {result === "salvo" ? "Permissão conferida e operação auditada." :
       result === "confirmar-municipio" ? "Para liberar todas as equipes, confirme explicitamente a abrangência municipal." :
       result === "ine-invalido" ? "O código INE precisa conter exatamente 10 dígitos." :
       "Não foi possível alterar a permissão. Confirme o perfil e a configuração do banco."}
    </p>}
    <section className="panel">
      <div className="panel-heading">
        <span className="eyebrow">Princípio do menor privilégio</span>
        <h2>Escopos dos editores</h2>
        <p>Sem escopo concedido, o editor não pode publicar. Escopo municipal exige confirmação específica.</p>
      </div>
      <div className="mt-4 space-y-5">
        {editors.map(editor => {
          const assigned = grants.filter(item => item.user_id === editor.user_id);
          return <article key={editor.user_id} className="rounded-xl border p-4 space-y-3">
            <div><h3 className="font-bold">{editor.email}</h3>
              <small className="text-slate-500">{assigned.length} permissão(ões) vigente(s)</small></div>
            <div className="flex flex-wrap gap-2">
              {assigned.map(item => <form key={item.id} action={manageImportScopeAction} className="flex items-center gap-2 rounded-lg border p-2">
                <span className="text-xs font-semibold">{item.scope_kind === "municipio" ? "Município inteiro" : `INE ${item.ine}`}</span>
                <input type="hidden" name="action" value="revoke"/>
                <input type="hidden" name="target" value={editor.user_id}/>
                <input type="hidden" name="scope" value={item.scope_kind}/>
                {item.ine && <input type="hidden" name="ine" value={item.ine}/>}
                <button type="submit" className="text-xs font-semibold text-red-700 underline">Revogar</button>
              </form>)}
              {!assigned.length && <span className="text-xs text-slate-500">Nenhuma equipe autorizada.</span>}
            </div>
            <form action={manageImportScopeAction} className="flex flex-wrap items-end gap-3 border-t pt-3">
              <input type="hidden" name="action" value="grant"/>
              <input type="hidden" name="target" value={editor.user_id}/>
              <div>
                <label htmlFor={`scope-${editor.user_id}`} className="block text-xs font-bold">Abrangência</label>
                <select id={`scope-${editor.user_id}`} name="scope" className="field mt-1">
                  <option value="equipe">Uma equipe por INE</option>
                  <option value="municipio">Município inteiro</option>
                </select>
              </div>
              <div>
                <label htmlFor={`ine-${editor.user_id}`} className="block text-xs font-bold">INE (para equipe)</label>
                <input className="field mt-1" id={`ine-${editor.user_id}`} name="ine"
                  inputMode="numeric" maxLength={10} placeholder="10 dígitos"/>
              </div>
              <label className="flex items-center gap-2 text-xs max-w-56">
                <input type="checkbox" name="confirmMunicipality" value="yes"/>
                Confirmo se escolher acesso ao município inteiro.
              </label>
              <button className="primary-button" type="submit">Conceder acesso</button>
            </form>
          </article>;
        })}
        {!editors.length && <p>Nenhum editor de Gestão ativo cadastrado.</p>}
      </div>
    </section>
    <Link href="/sistema/administracao" className="underline">Voltar à administração</Link>
  </div>;
}
