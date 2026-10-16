"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, Bell, Building2, ChevronDown, DatabaseZap,
  GitCompareArrows, LayoutDashboard, LandPlot, LogOut,
  Menu, Settings2, ShieldCheck, UserRound,
} from "lucide-react";

import { signOutAction } from "@/app/(auth)/actions";
import type { ManagementNotice } from "@/lib/notifications/management";

type Props = {
  children: React.ReactNode;
  email: string;
  role: "gestao" | "leitura" | "admin";
  userId: string;
  displayName: string;
  notices: ManagementNotice[];
  noticesUnavailable: boolean;
};

const analysisItems = [
  { href: "/sistema/gestao/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/sistema/gestao/ubs-equipes", label: "UBS e equipes", icon: Building2 },
  { href: "/sistema/gestao/comparativos", label: "Comparativos", icon: GitCompareArrows },
];
const adminItems = [
  { href: "/sistema/administracao", label: "Contas e aprovações", icon: ShieldCheck },
  { href: "/sistema/territorio", label: "Território", icon: LandPlot },
  { href: "/sistema/administracao/escopos-importacao", label: "Escopos de importação", icon: DatabaseZap },
];

function initialsFromName(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts.at(-1)![0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const local = email.split("@")[0] ?? "";
  const emailParts = local.split(/[._-]+/).filter(Boolean);
  return emailParts.length > 1 ? (emailParts[0][0] + emailParts[1][0]).toUpperCase() : local.slice(0, 2).toUpperCase() || "GM";
}

export function ManagementShell({ children, email, role, userId, displayName, notices, noticesUnavailable }: Props) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const isImport = pathname.startsWith("/sistema/importar");
  const homeHref = isAdmin ? "/sistema/administracao" : "/sistema/gestao";
  const roleLabel = isAdmin ? "Administração" : role === "gestao" ? "Gestão" : "Leitura";
  const initials = initialsFromName(displayName, email);
  const isDashboardHome = pathname === homeHref;

  const [menuOpen, setMenuOpen] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const storageKey = `maeaps-notices-read-v1:${userId}`;

  useEffect(() => {
    function syncViewport() {
      const small = window.matchMedia("(max-width: 850px)").matches;
      setMobile(small);
      // Estado inicial apropriado para cada largura; sem deslocar a área analítica.
      setMenuOpen(!small);
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);
  useEffect(() => {
    // Carregamento após a hidratação, sem disparar setState diretamente no effect.
    function readSession() {
      try {
        const list: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
        setSeenIds(Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : []);
      } catch { setSeenIds([]); }
    }
    const raf = window.requestAnimationFrame(readSession);
    return () => window.cancelAnimationFrame(raf);
  }, [storageKey]);

  function closeAfterNavigation() {
    setBellOpen(false);
    if (mobile) setMenuOpen(false);
  }

  function returnToStart(event: React.MouseEvent<HTMLAnchorElement>) {
    closeAfterNavigation();
    if (pathname === homeHref) {
      // Navegar para a mesma rota não garante que o App Router volte ao topo.
      // Mantém os filtros e valores enquanto retorna ao começo do Início.
      event.preventDefault();
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Nas demais rotas, o Link navega ao Início com scroll=true.
  }

  const unread = notices.filter((n) => !seenIds.includes(n.id));
  function readAll() {
    const next = [...new Set([...seenIds, ...notices.map((n) => n.id)])];
    setSeenIds(next);
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(next.slice(-200))); } catch { /* storage opcional */ }
  }
  function readOne(id: string) {
    const next = [...new Set([...seenIds, id])];
    setSeenIds(next);
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(next.slice(-200))); } catch { /* storage opcional */ }
    setBellOpen(false);
  }
  const navClass = menuOpen ? "" : " management-shell-nav-collapsed";
  return (
    <div className={`management-shell${isAdmin ? " management-shell-admin" : ""}${navClass}${mobile ? " management-shell-mobile" : ""}`}>
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

      <header className="management-topbar">
        <button className="management-menu-toggle" type="button" aria-label={menuOpen ? "Recolher menu lateral" : "Abrir menu lateral"}
          aria-controls="management-side-navigation" aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}><Menu aria-hidden="true" /></button>

        <Link href={homeHref} scroll onClick={returnToStart} className="management-brand" aria-label="MAE APS: voltar ao início">
          <Image className="management-brand-symbol" src="/brands/mae-aps-simbolo-cabecalho.svg" alt="" width={560} height={740} priority />
          <span className="management-brand-copy">
            <strong>MAE APS</strong>
            <small>Monitoramento, Atenção e Estratégia na APS</small>
            <em>{isAdmin ? "Módulo Administrativo" : role === "leitura" ? "Módulo de Leitura" : "Módulo da Gestão"}</em>
          </span>
        </Link>

        <div className="management-institutions">
          <a href="https://portal.ufcg.edu.br/" target="_blank" rel="noreferrer" title="Portal oficial da UFCG" aria-label="Acessar portal da UFCG">
            <Image className="management-ufcg-logo" src="/brands/ufcg-oficial.png" alt="Universidade Federal de Campina Grande" width={1472} height={462} priority />
          </a>

          <div className="management-notifications">
            <button type="button" className="management-bell" aria-label={`Notificações: ${unread.length} não lidas`}
              aria-expanded={bellOpen} aria-controls="management-notification-panel"
              onClick={() => setBellOpen((value) => !value)}>
              <Bell aria-hidden="true" />
              {unread.length > 0 ? <span className="management-bell-badge">{unread.length > 9 ? "9+" : unread.length}</span> : null}
            </button>
            {bellOpen && <section id="management-notification-panel" className="management-notice-popover" aria-label="Notificações">
              <div className="management-popover-heading"><strong>Notificações</strong>
                <button type="button" onClick={readAll} disabled={!unread.length}>Marcar como lidas</button>
              </div>
              {noticesUnavailable ? <p className="management-notice-error" role="status">Alguns alertas não puderam ser consultados. Atualize a página para tentar novamente.</p> : null}
              {notices.length === 0 && !noticesUnavailable ? <p className="management-notice-empty">Nenhuma pendência identificada nos dados disponíveis.</p> : null}
              {notices.map((notice) => (
                <Link href={notice.href} key={notice.id} className={`management-notice-item ${seenIds.includes(notice.id) ? "is-read" : ""}`}
                  onClick={() => readOne(notice.id)}>
                  <span className={`management-notice-dot ${notice.severity}`} aria-hidden="true" />
                  <span><strong>{notice.title}</strong><small>{notice.description}</small></span>
                </Link>
              ))}
              {role === "gestao" ? <Link className="management-notice-footer" href="/sistema/importar" onClick={() => setBellOpen(false)}>Ver histórico de importações →</Link> : null}
            </section>}
          </div>

          <details className="management-user">
            <summary aria-label="Abrir menu da conta">
              <span>{initials}</span>
              <span className="management-user-copy">
                <strong>{displayName || roleLabel}</strong>
                <small>{email}</small>
              </span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </summary>
            <div className="management-user-popover">
              <strong>{roleLabel.toUpperCase()}</strong>
              <p>{email}</p>
              <Link href="/sistema/perfil" onClick={closeAfterNavigation} className="management-profile-link"><UserRound className="size-4" /> Editar perfil e configurações</Link>
              <form action={signOutAction}><button type="submit"><LogOut className="size-4" /> Sair</button></form>
            </div>
          </details>
        </div>
      </header>

      <aside className="management-sidebar" id="management-side-navigation">
        <div className="management-sidebar-content">
          <nav aria-label={isAdmin ? "Navegação da Administração" : "Navegação da Gestão"}>
          {isAdmin ? <>
            <span className="management-nav-label">Administração e segurança</span>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/sistema/administracao" ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} onClick={closeAfterNavigation} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                <Icon className="size-5" /><span>{label}</span>
              </Link>;
            })}
          </> : <>
            <Link href="/sistema/gestao" onClick={closeAfterNavigation} className={isDashboardHome ? "active" : ""}
              aria-current={isDashboardHome ? "page" : undefined}>
              <LayoutDashboard className="size-5" /><span>Início</span>
            </Link>
            {role === "gestao" ? <>
              <span className="management-nav-label">Gestão de dados</span>
              <Link href="/sistema/importar" onClick={closeAfterNavigation} aria-label="Importar SIAPS" className={isImport ? "active" : ""}
                aria-current={isImport ? "page" : undefined}>
                <DatabaseZap className="size-5" /><span>Importar SIAPS</span>
              </Link>
            </> : null}
            <span className="management-nav-label">Análises</span>
            {analysisItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return <Link key={href} href={href} onClick={closeAfterNavigation} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                <Icon className="size-5" /><span>{label}</span>
              </Link>;
            })}
          </>}
          <span className="management-nav-separator" />
          <Link href="/sistema/perfil" onClick={closeAfterNavigation} className={pathname === "/sistema/perfil" ? "active" : ""}
            aria-current={pathname === "/sistema/perfil" ? "page" : undefined}>
            <Settings2 className="size-5" /><span>Configurações</span>
          </Link>
        </nav>
          <div className="management-sidebar-note">
            <span className="management-sidebar-line" aria-hidden="true" />
            <p>Mais saúde para mães e bebês.<br />Fortalecendo a APS.</p>
            <small>MAE APS · PET Saúde UFCG</small>
          </div>
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
