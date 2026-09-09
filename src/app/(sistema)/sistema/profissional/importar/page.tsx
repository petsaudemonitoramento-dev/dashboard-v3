import Link from "next/link";

import { requireProfessional } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { listImports } from "@/lib/professional/queries";

import { PecImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function PecImportPage() {
  await enforceRouteGuard(() => requireProfessional());
  const imports = await listImports(10);

  return (
    <section className="grid gap-6">
      <header>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">
          Área Profissional
        </span>
        <h1 className="mt-2 text-3xl font-semibold text-[#071d35]">
          Importar planilha do PEC
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          As gestantes importadas entram apenas na sua carteira. Esses dados não
          alimentam o indicador oficial do município, que vem exclusivamente do
          SIAPS.
        </p>
      </header>

      <PecImportForm />

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
              <li className="rounded-lg border border-slate-200 px-3 py-2" key={item.id}>
                <strong className="text-slate-800">{item.filename}</strong>
                <p className="text-slate-600">
                  {item.rows_read} linha(s) lida(s) · {item.rows_created} nova(s) ·{" "}
                  {item.rows_updated} atualizada(s) ·{" "}
                  {new Date(item.imported_at).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        className="text-sm font-bold text-[#0d4d80]"
        href="/sistema/profissional"
      >
        ← Voltar para a carteira
      </Link>
    </section>
  );
}
