import Image from "next/image";
import Link from "next/link";
import {
  Accessibility,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { SystemStatus } from "@/components/auth/system-status";
import { AuthIntroSession } from "@/components/auth/auth-intro-session";

const assuranceItems = [
  { label: "Privacidade orientada à LGPD", icon: ShieldCheck },
  { label: "Autenticação institucional", icon: Fingerprint },
  { label: "Acesso por perfil", icon: LockKeyhole },
  { label: "Auditoria operacional", icon: ClipboardCheck },
  { label: "Rastreabilidade", icon: CheckCircle2 },
  { label: "Acessibilidade verificada", icon: Accessibility },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-portal">
      <AuthIntroSession />
      <header className="auth-portal-header">
        <Link href="/entrar" className="auth-portal-brand" aria-label="MAE APS">
          <Image
            className="auth-portal-logo"
            src="/brands/mae-aps-horizontal-azul.svg"
            alt=""
            width={1610}
            height={635}
            priority
            unoptimized
          />
          <span className="auth-brand-copy">
            <small>Monitoramento, Atenção e Estratégia na APS</small>
          </span>
        </Link>

        <div className="auth-portal-institutions" aria-label="Identificação institucional">
          <div className="auth-pet-wordmark" aria-label="PET Saúde UFCG">
            <strong>PET Saúde</strong>
            <span>UFCG</span>
          </div>
          <Image
            className="auth-ufcg-logo"
            src="/brands/ufcg-oficial.png"
            alt="Universidade Federal de Campina Grande"
            width={1472}
            height={462}
            priority
          />
        </div>
      </header>

      <main className="auth-portal-main">
        <section className="auth-portal-context" aria-labelledby="auth-product-title">
          <div className="auth-context-glow" aria-hidden="true" />
          <div className="auth-context-grid" aria-hidden="true" />
          <div className="auth-hero-identity" aria-hidden="true">
            <Image
              src="/brands/mae-aps-simbolo-branco.svg"
              alt=""
              width={684}
              height={910}
              unoptimized
            />
          </div>

          <div className="auth-context-content">
            <span className="auth-context-kicker">
              <i aria-hidden="true" />
              Gestão da Atenção Primária à Saúde
            </span>
            <h1 id="auth-product-title">
              Informação oficial para orientar a gestão da APS.
            </h1>
            <p>
              O MAE APS organiza indicadores oficiais em uma visão segura,
              territorial e orientada à tomada de decisão.
            </p>

            <div className="auth-technical-panel">
              <div className="auth-technical-heading">
                <span className="auth-technical-icon" aria-hidden="true">
                  <Database />
                </span>
                <span>
                  <small>Versão de referência</small>
                  <strong>SIAPS 2.0.3</strong>
                </span>
              </div>
              <dl>
                <div>
                  <dt>Liberação</dt>
                  <dd>10/09/2026</dd>
                </div>
                <div>
                  <dt>Origem</dt>
                  <dd>SIAPS / SISAB</dd>
                </div>
                <div>
                  <dt>Indicador</dt>
                  <dd>C3 · Gestação</dd>
                </div>
                <div>
                  <dt>Entrada</dt>
                  <dd>XLSX oficial</dd>
                </div>
              </dl>
            </div>

            <div className="auth-assurance-panel">
              <div className="auth-assurance-heading">
                <span>
                  <small>Governança e confiabilidade</small>
                  <strong>Controles implementados</strong>
                </span>
                <span className="auth-assurance-code" aria-label="Versão SIAPS de referência 2.0.3">SIAPS 2.0.3</span>
              </div>
              <ul>
                {assuranceItems.map(({ label, icon: Icon }) => (
                  <li key={label}>
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="auth-access-zone" aria-labelledby="auth-access-title">
          <div className="auth-access-orbit auth-access-orbit-one" aria-hidden="true" />
          <div className="auth-access-orbit auth-access-orbit-two" aria-hidden="true" />

          <div className="auth-access-card">
            <div className="auth-access-topline">
              <SystemStatus />
            </div>

            <div className="auth-access-heading">
              {eyebrow ? <span>{eyebrow}</span> : null}
              <h2 id="auth-access-title">{title}</h2>
              <p>{description}</p>
            </div>

            {children}

            <p className="auth-mobile-reference">
              SIAPS 2.0.3 · 10/09/2026 · Origem: SIAPS / SISAB
            </p>

            <p className="auth-access-note">
              Acesso protegido. As operações seguem as permissões definidas para
              cada perfil institucional.
            </p>
          </div>
        </section>
      </main>

      <footer className="auth-portal-footer">
        <span><strong>MAE APS</strong> · PET-Saúde UFCG</span>
        <span>Desenvolvimento: Lucca Araújo</span>
        <span>Design: Kethilly Nayara</span>
      </footer>
    </div>
  );
}
