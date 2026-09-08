import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-[#071d35]">
          Não foi possível validar o acesso
        </h1>
        <p className="mt-4 text-slate-600">
          Tente novamente ou contate a administração.
        </p>
        <Link className="mt-6 inline-block font-bold text-[#0d4d80]" href="/entrar">
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
