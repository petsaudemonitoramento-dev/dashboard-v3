import { ManagementShell } from "@/components/layout/management-shell";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

/**
 * O mesmo design system MAE APS acompanha todos os perfis.
 * Nenhuma regra de autorização é alterada: o guard permanece ativo,
 * e os links são exibidos conforme o perfil liberado pelo servidor.
 */
export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await enforceRouteGuard(() => getActiveProfileContext());

  return (
    <ManagementShell email={profile.email} role={profile.role}>
      {children}
    </ManagementShell>
  );
}
