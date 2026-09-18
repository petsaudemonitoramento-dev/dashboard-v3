import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function AdministrationPage() {
  const { profile } = await enforceRouteGuard(() => requireAdministrator());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
        Administração da Gestão
      </span>
      <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">
        Acesso administrativo
      </h1>
      <p className="mt-3 text-slate-600">
        Sessão ativa de {profile.email}. A arquitetura atual mantém perfis em
        app.profiles e permite ao navegador apenas a leitura do próprio perfil.
        O provisionamento e a ativação de outros usuários exigem o processo
        institucional controlado no Supabase; esta interface não realiza
        alterações privilegiadas sem uma API auditada.
      </p>
    </section>
  );
}
