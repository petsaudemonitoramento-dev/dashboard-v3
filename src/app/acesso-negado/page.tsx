import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_at_top_left,#e8daf9_0%,#fffdfa_55%,#f1e6f9_100%)] p-6">
      <section className="max-w-lg rounded-3xl border border-[#e4d6f2] bg-white p-8 text-center shadow-[0_16px_55px_rgba(40,0,99,0.11)]">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Acesso negado
        </span>
        <h1 className="mt-3 text-3xl font-semibold text-[#280063]">
          Seu perfil não acessa esta área
        </h1>
        <p className="mt-4 text-slate-600">
          A autorização é validada no servidor e no banco de dados.
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-[#49218a] px-5 py-3 font-bold text-white"
          href="/sistema"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
