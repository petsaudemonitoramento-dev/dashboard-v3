import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";
import { situationOf, type AdminProfileRow } from "@/lib/admin/status";

import { UserCard } from "./user-card";

export const dynamic = "force-dynamic";

const COLUMNS =
  "user_id, email, full_name, role, approval_status, is_active, completed_at, blocked_at, created_at";

export default async function AdministrationPage() {
  // A leitura da lista completa só é possível porque a política
  // `profiles_select_own_or_administrator` autoriza o administrador. Sem o
  // papel, o RLS devolveria apenas o próprio perfil — a página não depende de
  // esconder elementos para proteger nada.
  const context = await enforceRouteGuard(() => requireAdministrator());

  const supabase = await createClient();
  const result = await supabase
    .schema("core")
    .from("profiles")
    .select(COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (result.error) {
    throw new Error("Não foi possível listar os perfis.");
  }

  const profiles = (result.data ?? []) as AdminProfileRow[];
  const pendentes = profiles.filter((p) => {
    const s = situationOf(p);
    return s === "pendente" || s === "incompleto";
  });
  const ativos = profiles.filter((p) => situationOf(p) === "ativo");
  const administradores = ativos.filter((p) => p.role === "administrador");

  return (
    <section className="grid gap-6">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
          Administração técnica
        </span>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          Usuários e acessos
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Aprovação, papel e bloqueio são validados no servidor e no banco, e
          toda alteração fica registrada na auditoria. Este perfil é técnico:
          não concede acesso a dados clínicos do módulo Profissional.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Metric label="Aguardando decisão" value={pendentes.length} highlight />
        <Metric label="Ativos" value={ativos.length} />
        <Metric label="Administradores ativos" value={administradores.length} />
      </dl>

      {administradores.length === 1 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Existe apenas um administrador ativo. O banco recusa qualquer operação
          que deixe o sistema sem administrador — promova outra pessoa antes de
          alterar este acesso.
        </p>
      ) : null}

      {pendentes.length > 0 ? (
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Aguardando decisão
          </h2>
          {pendentes.map((profile) => (
            <UserCard
              isSelf={profile.user_id === context.user.id}
              key={profile.user_id}
              profile={profile}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold text-[#071d35]">
          Todos os usuários ({profiles.length})
        </h2>
        {profiles.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            Nenhum usuário cadastrado ainda.
          </p>
        ) : (
          profiles.map((profile) => (
            <UserCard
              isSelf={profile.user_id === context.user.id}
              key={profile.user_id}
              profile={profile}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight && value > 0
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold text-[#071d35]">{value}</dd>
    </div>
  );
}
