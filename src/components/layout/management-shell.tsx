"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  DatabaseZap,
  GitCompareArrows,
  LayoutDashboard,
  ListChecks,
  LogOut,
} from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";

type Props = {
  children: React.ReactNode;
  email: string;
  role: "gestao" | "leitura";
};

const analysisItems = [
  { href: "/sistema/gestao/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/sistema/gestao/ubs-equipes", label: "UBS e equipes", icon: Building2 },
  { href: "/sistema/gestao/comparativos", label: "Comparativos", icon: GitCompareArrows },
  { href: "/sistema/gestao/resumo", label: "Resumo", icon: ListChecks },
];

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "GS";
}

export function ManagementShell({ children, email, role }: Props) {
  const pathname = usePathname();
  const isImport = pathname.startsWith("/sistema/importar");
  const isDashboardHome = pathname === "/sistema/gestao";
  const initials = initialsFromEmail(email);

  return (
    <div className="management-shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

      <header className="management-topbar">
        <Link href="/sistema/gestao" className="management-brand">
          <Image
            className="h-[62px] w-[75px] shrink-0 object-contain"
            src="/brands/mae-aps-wordmark.webp"
            alt="MAE APS"
            width={420}
            height={347}
            priority
          />
          <span className="management-brand-copy">
            <strong>Cuidado na Gestação na APS</strong>
            <small>Módulo da Gestão</small>
          </span>
        </Link>

        <div className="management-institutions">
          <Image
            className="management-ufcg-logo"
            src="/brands/ufcg-oficial.png"
            alt="Universidade Federal de Campina Grande"
            width={1472}
            height={462}
            priority
          />

          <span className="management-bell" aria-hidden="true">
            <Bell />
          </span>

          <details className="management-user">
            <summary aria-label="Abrir menu da conta">
              <span>{initials}</span>
              <span className="management-user-copy">
                <strong>{role === "gestao" ? "Gestão" : "Leitura"}</strong>
                <small>{email}</small>
              </span>
              <ChevronDown className="size-4" aria-hidden="true" />
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
          <Link
            href="/sistema/gestao"
            className={isDashboardHome ? "active" : ""}
            aria-current={isDashboardHome ? "page" : undefined}
          >
            <LayoutDashboard className="size-5" /><span>Início</span>
          </Link>

          {role === "gestao" && (
            <Link
              href="/sistema/importar"
              aria-label="Importar dados"
              className={isImport ? "active" : ""}
              aria-current={isImport ? "page" : undefined}
            >
              <DatabaseZap className="size-5" /><span>Importar SIAPS</span>
            </Link>
          )}

          <span className="management-nav-label">Análises</span>

          {analysisItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" /><span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="management-sidebar-note">
          <span className="management-sidebar-line" aria-hidden="true" />
          <p>Mais saúde para mães e bebês.<br />Fortalecendo a APS.</p>
          <small>MAE APS · PET Saúde UFCG</small>
        </div>
      </aside>

      <main className="management-main" id="conteudo-principal" tabIndex={-1}>
        {children}
      </main>

      <footer className="management-footer">
        <strong>MAE APS · PET Saúde UFCG</strong>
        <span>Desenvolvimento: Lucca Araújo</span>
        <span>Design: Kethilly Nayara</span>
      </footer>
    </div>
  );
}
