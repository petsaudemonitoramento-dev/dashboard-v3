import { requireProfessional } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function ProfessionalPage() {
  await enforceRouteGuard(() => requireProfessional());
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
        Área Profissional
      </span>
      <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">
        Seu espaço privado
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        O diário clínico será entregue em fase posterior. O isolamento por
        proprietário já está definido e testado no banco.
      </p>
    </section>
  );
}
