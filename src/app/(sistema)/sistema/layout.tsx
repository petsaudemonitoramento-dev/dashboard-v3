import Link from "next/link";
import { LandPlot, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import { ManagementShell } from "@/components/layout/management-shell";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { homeForRole } from "@/lib/auth/navigation";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await enforceRouteGuard(() => getActiveProfileContext());

  if (profile.role !== "admin") {
    return (
      <ManagementShell email={profile.email} role={profile.role}>
        {children}
      </ManagementShell>
    );
  }

  const items = [
    { href: "/sistema/territorio", label: "Território", icon: LandPlot },
    { href: "/sistema/administracao", label: "Administração", icon: ShieldCheck },
  ];

  return <div className="app-shell">
    <header className="app-header">
      <Link className="brand" href={homeForRole(profile.role)}>
        <span className="brand-mark">MAE</span>
        <span><strong>MAE APS</strong><small>Monitoramento, Atenção e Estratégia na APS</small></span>
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon className="mr-1 inline size-4" aria-hidden />{label}</Link>)}
      </nav>
      <details className="user-menu">
        <summary aria-label="Abrir menu do usuário">{profile.email.slice(0, 1).toUpperCase()}</summary>
        <div className="user-popover">
          <strong>ADMIN</strong><p>{profile.email}</p>
          <form action={signOutAction}><button type="submit">Sair</button></form>
        </div>
      </details>
    </header>
    <main className="app-main">{children}</main>
    <footer className="app-footer"><strong>PET SAÚDE UFCG</strong><span>Desenvolvimento: Lucca Araújo</span><span>Design: Kethilly Nayara</span></footer>
  </div>;
}
