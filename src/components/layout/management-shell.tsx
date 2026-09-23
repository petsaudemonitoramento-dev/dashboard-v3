"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  DatabaseZap,
  GitCompareArrows,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  University,
} from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";

type Props = {
  children: React.ReactNode;
  email: string;
  role: "gestao" | "leitura";
};

const dashboardSections = [
  { href: "/sistema/gestao", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sistema/gestao#indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/sistema/gestao#ubs-equipes", label: "UBS e equipes", icon: Building2 },
  { href: "/sistema/gestao#comparativos", label: "Comparativos", icon: GitCompareArrows },
  { href: "/sistema/gestao#resumo", label: "Resumo", icon: ListChecks },
];

export function ManagementShell({ children, email, role }: Props) {
  const pathname = usePathname();
  const isImport = pathname.startsWith("/sistema/importar");

  return (
    <div className="management-shell">
      <header className="management-topbar">
        <Link href="/sistema/gestao" className="management-brand">
          <span className="management-brand-mark">MAE</span>
          <span>
            <strong>MAE APS</strong>
            <small>Monitoramento, Atenção e Estratégia na APS</small>
            <em>Módulo da Gestão</em>
          </span>
        </Link>

        <div className="management-institutions">
          <div className="pet-wordmark">
            <span className="pet-dot" />
            <span><strong>PET SAÚDE UFCG</strong><small>Informação e Saúde Digital</small></span>
          </div>
          <div className="ufcg-wordmark">
            <span className="ufcg-monogram">UFCG</span>
            <span><strong>Universidade Federal</strong><small>de Campina Grande</small></span>
          </div>
          <details className="management-user">
            <summary aria-label="Abrir menu da conta">
              <span>{email.slice(0, 1).toUpperCase()}</span>
              <span className="management-user-copy"><strong>{role === "gestao" ? "Gestão" : "Leitura"}</strong><small>{email}</small></span>
              <Menu className="size-4" />
            </summary>
            <div className="management-user-popover">
              <strong>{role === "gestao" ? "GESTÃO" : "LEITURA"}</strong>
              <p>{email}</p>
              <form action={signOutAction}>
                <button type="submit"><LogOut className="size-4" /> Sair</button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <aside className="management-sidebar">
        <nav aria-label="Navegação da Gestão">
          {dashboardSections.slice(0, 1).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={!isImport && pathname.startsWith("/sistema/gestao") ? "active" : ""}>
              <Icon className="size-5" /><span>{label}</span>
            </Link>
          ))}
          {role === "gestao" && (
            <Link href="/sistema/importar" className={isImport ? "active" : ""}>
              <DatabaseZap className="size-5" /><span>Importar dados</span>
            </Link>
          )}
          {dashboardSections.slice(1).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon className="size-5" /><span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="management-sidebar-note">
          <University className="size-8" />
          <p>Dados oficiais para uma APS mais forte, organizada e orientada por evidências.</p>
          <small>MAE APS · PET SAÚDE UFCG</small>
        </div>
      </aside>

      <main className="management-main">{children}</main>
      <footer className="management-footer">
        <strong>PET SAÚDE UFCG</strong>
        <span>Desenvolvimento: Lucca Araújo</span>
        <span>Design: Kethilly Nayara</span>
      </footer>
    </div>
  );
}
