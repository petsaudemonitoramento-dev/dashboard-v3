import Link from "next/link";

import { requireMunicipalManagement } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { listImports } from "@/lib/gestao/queries";

import { SiapsImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function SiapsImportPage() {
  await enforceRouteGuard(() => requireMunicipalManagement());
  const imports = await listImports(20);

  return (
    <section className="grid gap-6">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
          Gestão Municipal
        </span>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          Importar relatório do SIAPS
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Fonte oficial do painel institucional. Os dados do módulo Profissional
          não participam deste indicador.
        </p>
      </header>

      <SiapsImportForm />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-[#071d35]">
          Histórico de importações
        </h2>
        {imports.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Nenhuma importação registrada.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {imports.map((item) => (
              <li
                className="rounded-lg border border-slate-200 px-3 py-2"
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-800">{item.filename}</strong>
                  {item.is_current ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                      vigente
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {item.status}
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  {item.competency ?? "—"} · {item.rows_eligible ?? 0} elegíveis
                  de {item.rows_total ?? 0} ·{" "}
                  {new Date(item.imported_at).toLocaleString("pt-BR")}
                </p>
                {item.publication_block ? (
                  <p className="mt-1 text-xs text-rose-800">
                    Bloqueio: {item.publication_block}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link className="text-sm font-bold text-[#0d4d80]" href="/sistema/gestao">
        ← Voltar para o painel
      </Link>
    </section>
  );
}
