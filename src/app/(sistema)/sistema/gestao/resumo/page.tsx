import { redirect } from "next/navigation";

import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

/** Rota antiga preservada como redirecionamento autenticado:
 * todo o conteúdo do resumo está integrado ao Início.
 */
export default async function PreviousSummaryRedirect() {
  await enforceRouteGuard(() => requireDashboardAccess());
  redirect("/sistema/gestao#resumo");
}
