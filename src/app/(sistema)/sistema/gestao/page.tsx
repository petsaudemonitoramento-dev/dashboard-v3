import { requireMunicipalManagement } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function MunicipalManagementPage() {
  await enforceRouteGuard(() => requireMunicipalManagement());
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
        Gestão Municipal
      </span>
      <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">
        Fundação segura concluída
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        A ingestão SIAPS e o dashboard analítico serão implementados nas fases
        próprias. Esta rota já exige perfil municipal aprovado no servidor.
      </p>
    </section>
  );
}
