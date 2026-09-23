import { ShieldCheck } from "lucide-react";

import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { manageProfileAction } from "./actions";

export const dynamic = "force-dynamic";

type ProfileRow = { user_id: string; email: string; role: "admin" | "gestao" | "leitura"; active: boolean };

export default async function AdministrationPage() {
  await enforceRouteGuard(() => requireAdministrator());
  let rows: Array<{ id: string; email: string; createdAt: string; profile: ProfileRow | null }> = [];
  let configurationError: string | null = null;
  try {
    const privileged = createPrivilegedClient();
    const [usersResult, profilesResult] = await Promise.all([
      privileged.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      privileged.schema("app").from("profiles").select("user_id, email, role, active").order("email"),
    ]);
    if (usersResult.error || profilesResult.error) throw new Error(usersResult.error?.message ?? profilesResult.error?.message);
    const profiles = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((item) => [item.user_id, item]));
    rows = usersResult.data.users.map((user) => ({ id: user.id, email: user.email ?? "Sem e-mail", createdAt: user.created_at, profile: profiles.get(user.id) ?? null }));
  } catch (error) {
    configurationError = error instanceof Error ? error.message : "Cliente administrativo indisponível.";
  }

  return <div className="space-y-6"><section className="hero-panel"><div><span className="eyebrow">Acesso restrito</span><h1>Administração</h1><p>Gerencie os papéis e o estado dos perfis autenticados com auditoria.</p></div><ShieldCheck className="size-16 text-cyan-300" /></section>
    {configurationError ? <section className="panel border-amber-200! bg-amber-50! text-amber-900"><h2 className="font-bold">Configuração server-side necessária</h2><p className="mt-2 text-sm">{configurationError}</p><p className="mt-2 text-sm">Configure <code>SUPABASE_SECRET_KEY</code> apenas no ambiente do servidor. Nenhuma chave privilegiada é enviada ao navegador.</p></section> : <section className="panel"><div className="panel-heading"><span className="eyebrow">{rows.length} usuários autenticados</span><h2>Usuários e perfis</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>E-mail</th><th>Cadastro</th><th>Papel</th><th>Ativo</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.email}</strong>{!row.profile && <small className="block text-amber-700">Sem perfil provisionado</small>}</td><td>{new Date(row.createdAt).toLocaleDateString("pt-BR")}</td><td colSpan={3}><form action={manageProfileAction} className="flex flex-wrap items-center gap-3"><input type="hidden" name="userId" value={row.id}/><select className="field" name="role" defaultValue={row.profile?.role ?? "leitura"}><option value="admin">admin</option><option value="gestao">gestao</option><option value="leitura">leitura</option></select><label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="active" type="checkbox" value="true" defaultChecked={row.profile?.active ?? false}/>Ativo</label><button className="primary-button" type="submit">Salvar</button></form></td></tr>)}</tbody></table></div></section>}
  </div>;
}
