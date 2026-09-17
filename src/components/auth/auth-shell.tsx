import { HeartPulse } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-svh bg-white md:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden min-h-svh overflow-hidden bg-[radial-gradient(circle_at_18%_14%,rgba(45,180,178,.32),transparent_31%),linear-gradient(145deg,#071d35,#08385a)] p-12 text-white md:flex md:flex-col md:justify-between xl:p-20">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em]">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/40 bg-white/10">
            <HeartPulse size={23} aria-hidden="true" />
          </span>
          <span>PET Saúde · UFCG</span>
        </div>
        <div>
          <h1 className="max-w-[9ch] text-5xl font-semibold leading-[0.96] tracking-[-0.055em] xl:text-7xl">
            Cuidado na Gestação na APS
          </h1>
          <p className="mt-6 max-w-lg leading-7 text-white/75">
            Informação segura para fortalecer o cuidado longitudinal e a gestão
            municipal na Atenção Primária à Saúde.
          </p>
        </div>
        <small className="text-white/60">Campina Grande · Paraíba</small>
      </section>

      <section className="grid min-h-svh place-items-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0d4d80]">
            {eyebrow}
          </span>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#071d35]">
            {title}
          </h2>
          <p className="mb-8 mt-3 leading-7 text-slate-500">{description}</p>
          {children}
          <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            Acesso restrito a usuários autorizados. As ações privilegiadas são
            protegidas e auditadas.
          </p>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
            <span>Desenvolvido por Lucca Araújo</span>
            <span>Versão 3.0 | Desing by: Kethilly Nayara</span>
          </div>
        </div>
      </section>
    </main>
  );
}
