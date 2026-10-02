"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorBoundary({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <main className="grid min-h-[65svh] place-items-center p-6"><section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="eyebrow">Erro inesperado</span><h1 className="mt-3 text-3xl font-semibold text-[#071d35]">Não foi possível concluir esta operação</h1><p className="mt-4 text-slate-600">Tente novamente. Se o problema continuar, informe a administração.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold" onClick={() => window.location.reload()} type="button">Tentar novamente</button><Link className="rounded-xl bg-[#0d4d80] px-5 py-3 font-bold text-white" href="/sistema">Página inicial</Link></div></section></main>;
}
