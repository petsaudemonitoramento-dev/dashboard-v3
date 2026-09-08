import { updateProfileByAdministratorAction } from "@/app/(auth)/actions";
import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "administrador" | "gestao_municipal" | "profissional";
  approval_status: "pendente" | "aprovado" | "rejeitado";
  is_active: boolean;
  blocked_at: string | null;
};

export default async function AdministrationPage() {
  await enforceRouteGuard(() => requireAdministrator());
  const supabase = await createClient();
  const result = await supabase
    .schema("core")
    .from("profiles")
    .select("user_id, email, full_name, role, approval_status, is_active, blocked_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error("Não foi possível listar os perfis.");
  }
  const profiles = (result.data ?? []) as ProfileRow[];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
        Administração
      </span>
      <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">
        Aprovação de usuários
      </h1>
      <p className="mt-3 text-slate-600">
        Alterações de papel, aprovação e bloqueio são validadas no servidor e
        registradas na auditoria.
      </p>

      <div className="mt-8 grid gap-4">
        {profiles.map((profile) => (
          <form
            action={updateProfileByAdministratorAction}
            className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]"
            key={profile.user_id}
          >
            <input name="userId" type="hidden" value={profile.user_id} />
            <div>
              <strong>{profile.full_name ?? "Cadastro incompleto"}</strong>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Papel
              <select
                className="rounded-lg border border-slate-200 p-2"
                defaultValue={profile.role}
                name="role"
              >
                <option value="profissional">Profissional</option>
                <option value="gestao_municipal">Gestão Municipal</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Aprovação
              <select
                className="rounded-lg border border-slate-200 p-2"
                defaultValue={profile.approval_status}
                name="approvalStatus"
              >
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Ativo
              <select
                className="rounded-lg border border-slate-200 p-2"
                defaultValue={String(profile.is_active)}
                name="isActive"
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Bloqueado
              <select
                className="rounded-lg border border-slate-200 p-2"
                defaultValue={String(Boolean(profile.blocked_at))}
                name="isBlocked"
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </label>
            <button
              className="rounded-lg bg-[#0d4d80] px-4 py-2 font-bold text-white"
              type="submit"
            >
              Salvar
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
