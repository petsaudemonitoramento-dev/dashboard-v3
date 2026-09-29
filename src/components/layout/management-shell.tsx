"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
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
  { id: "indicadores", href: "/sistema/gestao#indicadores", label: "Indicadores", icon: BarChart3 },
  { id: "ubs-equipes", href: "/sistema/gestao#ubs-equipes", label: "UBS e equipes", icon: Building2 },
  { id: "comparativos", href: "/sistema/gestao#comparativos", label: "Comparativos", icon: GitCompareArrows },
  { id: "resumo", href: "/sistema/gestao#resumo", label: "Resumo", icon: ListChecks },
];

export function ManagementShell({ children, email, role }: Props) {
  const pathname = usePathname();
  const isImport = pathname.startsWith("/sistema/importar");
  const isDashboard = pathname.startsWith("/sistema/gestao");
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    if (!isDashboard) return;

    const ids = dashboardSections.map(({ id }) => id);
    let frame = 0;

    const syncFromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id && ids.includes(id)) {
        setActiveSection(id);
        window.requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ block: "start" });
        });
      }
    };

    const syncFromScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activationLine = 190;
        let current = "dashboard";

        for (const id of ids) {
          const section = document.getElementById(id);
          if (!section) continue;
          if (section.getBoundingClientRect().top <= activationLine) current = id;
        }

        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 24
        ) {
          current = ids.at(-1) ?? current;
        }

        setActiveSection((previous) => previous === current ? previous : current);
      });
    };

    const initialFrame = window.requestAnimationFrame(() => {
      if (window.location.hash) syncFromHash();
      else syncFromScroll();
    });

    window.addEventListener("scroll", syncFromScroll, { passive: true });
    window.addEventListener("resize", syncFromScroll);
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncFromScroll);
      window.removeEventListener("resize", syncFromScroll);
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, [isDashboard, pathname]);

  function goToDashboard(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDashboard) return;
    event.preventDefault();
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    setActiveSection("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (!isDashboard) return;
    event.preventDefault();
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${id}`,
    );
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
          <Link
            href="/sistema/gestao"
            onClick={goToDashboard}
            className={!isImport && activeSection === "dashboard" ? "active" : ""}
            aria-current={!isImport && activeSection === "dashboard" ? "page" : undefined}
          >
            <LayoutDashboard className="size-5" /><span>Dashboard</span>
          </Link>

          {role === "gestao" && (
            <Link href="/sistema/importar" className={isImport ? "active" : ""} aria-current={isImport ? "page" : undefined}>
              <DatabaseZap className="size-5" /><span>Importar dados</span>
            </Link>
          )}

          {dashboardSections.map(({ id, href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={(event) => goToSection(event, id)}
              className={!isImport && activeSection === id ? "active" : ""}
              aria-current={!isImport && activeSection === id ? "page" : undefined}
            >
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
