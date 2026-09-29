import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { SystemNavigation, type NavigationItem } from "@/components/navigation/system-navigation";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await enforceRouteGuard(() => getActiveProfileContext());
  const dashboardItems: NavigationItem[] = [
    { href: "/sistema/gestao", label: "Dashboard", icon: "dashboard" },
    ...(profile.role === "gestao" ? [{ href: "/sistema/importar", label: "Importar dados", icon: "import" as const }] : []),
    { href: "/sistema/gestao#indicadores", label: "Indicadores", icon: "indicators" },
    { href: "/sistema/gestao#ubs-equipes", label: "UBS e equipes", icon: "establishments" },
    { href: "/sistema/gestao#comparativos", label: "Comparativos", icon: "comparisons" },
    { href: "/sistema/gestao#resumo", label: "Resumo", icon: "summary" },
  ];
  const adminItems: NavigationItem[] = [
    { href: "/sistema/territorio", label: "Território", icon: "territory" },
    { href: "/sistema/administracao", label: "Administração", icon: "administration" },
  ];
  const items = profile.role === "admin" ? adminItems : dashboardItems;
  return <div className="app-shell">
    <header className="app-header">
      <Link className="brand" href="/sistema/gestao"><span className="brand-mark">MAE</span><span><strong>MAE APS</strong><small>Monitoramento, Atenção e Estratégia na APS</small></span></Link>
      <SystemNavigation items={items} />
      <details className="user-menu"><summary aria-label="Abrir menu do usuário">{profile.email.slice(0, 1).toUpperCase()}</summary><div className="user-popover"><strong>{profile.role.toUpperCase()}</strong><p>{profile.email}</p><form action={signOutAction}><button type="submit">Sair</button></form></div></details>
    </header>
    <main className="app-main">{children}</main>
    <footer className="app-footer"><strong>PET SAÚDE UFCG · Universidade Federal de Campina Grande</strong><span>Desenvolvimento: Lucca Araújo</span><span>Design: Kethilly Nayara</span><span>Versão 1.0.0</span></footer>
  </div>;
}
