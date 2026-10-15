import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_at_top_left,#e8daf9_0%,#fffdfa_55%,#f1e6f9_100%)] p-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-[#280063]">
          Não foi possível validar o acesso
        </h1>
        <p className="mt-4 text-slate-600">
          Tente novamente ou contate a administração.
        </p>
        <Link className="mt-6 inline-block font-bold text-[#49218a]" href="/entrar">
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
