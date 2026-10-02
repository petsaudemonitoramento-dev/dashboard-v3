import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Acesso negado
        </span>
        <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">
          Seu perfil não acessa esta área
        </h1>
        <p className="mt-4 text-slate-600">
          A autorização é validada no servidor e no banco de dados.
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-[#0d4d80] px-5 py-3 font-bold text-white"
          href="/sistema"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
