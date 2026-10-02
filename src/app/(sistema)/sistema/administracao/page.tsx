import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { manageProfileAction } from "./actions";
import { DeleteProfileForm } from "./delete-profile-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  administrationHref,
  parseAdministrationPage,
  parseAdministrationStatus,
} from "@/lib/administration/pagination";
import { loadAdministrationUsersFromSupabase } from "@/lib/administration/supabase-users";
import { requireAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { isPreviewEnvironment } from "@/lib/observability/environment";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdministrationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await enforceRouteGuard(() => requireAdministrator());
  const params = await searchParams;
  const parsedPage = parseAdministrationPage(params.page);
  const status = parseAdministrationStatus(params.status);
  if (parsedPage.needsRedirect) {
    redirect(administrationHref({ page: parsedPage.page, status }));
  }

  let pageData: Awaited<ReturnType<typeof loadAdministrationUsersFromSupabase>> | null = null;
  let configurationError = false;
  try {
    pageData = await loadAdministrationUsersFromSupabase(parsedPage.page);
  } catch {
    console.error("Falha ao carregar a área administrativa.");
    configurationError = true;
  }
  if (pageData?.redirectPage) {
    redirect(administrationHref({ page: pageData.redirectPage, status }));
  }

  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const currentPage = pageData?.currentPage ?? 1;
  const lastPage = pageData?.lastPage ?? 1;

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Acesso restrito</span>
          <h1>Administração</h1>
          <p>Gerencie papéis, estado e exclusão de perfis não administrativos com auditoria.</p>
        </div>
        <ShieldCheck aria-hidden="true" className="size-16 text-cyan-300" />
      </section>

      {isPreviewEnvironment() ? (
        <section className="panel border-sky-200! bg-sky-50!">
          <span className="eyebrow">Somente Preview</span>
          <h2 className="mt-2 font-bold text-slate-900">Diagnóstico do Sentry</h2>
          <p className="mt-2 text-sm text-slate-700">
            Envia um erro sintético sanitizado para confirmar a observabilidade.
            Esta ação é bloqueada fora do Preview e exige sessão de administrador.
          </p>
          <form
            action="/api/diagnostics/sentry?confirm=sentry-preview"
            className="mt-4"
            method="post"
            target="_blank"
          >
            <button className="primary-button" type="submit">
              Enviar erro sintético ao Sentry
            </button>
          </form>
        </section>
      ) : null}

      {status === "salvo" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
          Perfil atualizado e registrado na auditoria.
        </p>
      ) : null}
      {status === "excluido" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
          Perfil e conta de acesso excluídos. O registro foi removido da lista.
        </p>
      ) : null}
      {status === "admin-protegido" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="alert">
          Perfis de administrador não podem ser excluídos pela interface. Essa operação só pode ser feita diretamente no Supabase.
        </p>
      ) : null}
      {status === "erro" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          Não foi possível concluir a operação administrativa.
        </p>
      ) : null}

      {configurationError ? (
        <section className="panel border-amber-200! bg-amber-50! text-amber-900">
          <h2 className="font-bold">Serviço administrativo indisponível</h2>
          <p className="mt-2 text-sm">Não foi possível consultar usuários e perfis.</p>
          <p className="mt-2 text-sm">
            Confirme que <code>SUPABASE_SECRET_KEY</code> está configurada somente no servidor.
            Nenhuma chave privilegiada é enviada ao navegador.
          </p>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <span className="eyebrow">{total} usuários autenticados</span>
            <h2>Usuários e perfis</h2>
          </div>
          <div
            aria-label="Usuários e perfis autenticados"
            className="table-scroll mt-4"
            role="region"
            tabIndex={0}
          >
            <table className="data-table">
              <caption className="sr-only">Usuários autenticados e configuração de acesso</caption>
              <thead>
                <tr>
                  <th scope="col">E-mail</th>
                  <th scope="col">Cadastro</th>
                  <th scope="col">Configuração de acesso</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.email}</strong>
                      {!row.profile ? <small className="block text-amber-700">Sem perfil provisionado</small> : null}
                    </td>
                    <td>{new Date(row.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <form action={manageProfileAction} className="flex flex-wrap items-center gap-3">
                        <input name="userId" type="hidden" value={row.id} />
                        <input name="page" type="hidden" value={currentPage} />
                        <label className="sr-only" htmlFor={`role-${row.id}`}>Papel de {row.email}</label>
                        <select
                          className="field"
                          defaultValue={row.profile?.role ?? "leitura"}
                          id={`role-${row.id}`}
                          name="role"
                        >
                          <option value="admin">admin</option>
                          <option value="gestao">gestao</option>
                          <option value="leitura">leitura</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input
                            defaultChecked={row.profile?.active ?? false}
                            name="active"
                            type="checkbox"
                            value="true"
                          />
                          Ativo
                        </label>
                        <SubmitButton label="Salvar" />
                      </form>
                    </td>
                    <td>
                      {row.profile?.role === "admin" ? (
                        <span className="text-xs font-semibold text-slate-500">
                          Exclusão somente pelo Supabase
                        </span>
                      ) : (
                        <DeleteProfileForm email={row.email} page={currentPage} userId={row.id} />
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr><td className="text-slate-600" colSpan={4}>Nenhum usuário nesta página.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginação de usuários" className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {currentPage > 1 ? (
              <Link className="rounded-lg border border-slate-400 px-4 py-2 font-bold text-sky-800" href={administrationHref({ page: currentPage - 1 })} rel="prev">
                Anterior
              </Link>
            ) : (
              <span aria-disabled="true" className="rounded-lg border border-slate-200 px-4 py-2 text-slate-500">Anterior</span>
            )}
            <span className="text-sm text-slate-700">Página {currentPage} de {lastPage}</span>
            {currentPage < lastPage ? (
              <Link className="rounded-lg border border-slate-400 px-4 py-2 font-bold text-sky-800" href={administrationHref({ page: currentPage + 1 })} rel="next">
                Próxima
              </Link>
            ) : (
              <span aria-disabled="true" className="rounded-lg border border-slate-200 px-4 py-2 text-slate-500">Próxima</span>
            )}
          </nav>
        </section>
      )}
    </div>
  );
}
