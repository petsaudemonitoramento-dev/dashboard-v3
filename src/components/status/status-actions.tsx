"use client";

import Link from "next/link";

export function StatusActions({ homeHref = "/sistema" }: { homeHref?: string }) {
  return <div className="mt-6 flex flex-wrap justify-center gap-3"><button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800" onClick={() => history.back()} type="button">Voltar</button><Link className="rounded-xl bg-[#0d4d80] px-5 py-3 font-bold text-white" href={homeHref}>Página inicial</Link></div>;
}
