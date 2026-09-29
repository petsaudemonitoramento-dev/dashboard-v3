import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

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
      <header className="auth-portal-header">
        <Link href="/entrar" className="auth-portal-brand" aria-label="MAE APS">
          <span className="auth-portal-mark">MAE</span>
          <span>
            <strong>MAE APS</strong>
            <small>Monitoramento, Atenção e Estratégia na APS</small>
          </span>
        </Link>

        <div className="auth-portal-institutions" aria-label="Identificação institucional">
          <span className="auth-pet-wordmark">
            <span className="auth-pet-dot" aria-hidden="true" />
            <span>
              <strong>PET SAÚDE UFCG</strong>
              <small>Informação e Saúde Digital</small>
            </span>
          </span>
          <span className="auth-ufcg-wordmark">
            <span className="auth-ufcg-monogram" aria-hidden="true">UFCG</span>
            <span>
              <strong>Universidade Federal</strong>
              <small>de Campina Grande</small>
            </span>
          </span>
        </div>
      </header>

      <main className="auth-portal-main">
        <section className="auth-portal-context" aria-labelledby="auth-product-title">
          <span className="auth-context-kicker">Gestão da Atenção Primária à Saúde</span>
          <h1 id="auth-product-title">Dados oficiais para apoiar decisões na APS.</h1>
          <p>
            O MAE APS organiza indicadores oficiais do SIAPS em uma visão segura,
            territorial e orientada à gestão.
          </p>

          <div className="auth-context-points">
            <span><Building2 aria-hidden="true" /> Monitoramento territorial</span>
            <span><ShieldCheck aria-hidden="true" /> Acesso por perfil autorizado</span>
          </div>
        </section>

        <section className="auth-access-card" aria-labelledby="auth-access-title">
          <div className="auth-access-heading">
            <span>{eyebrow}</span>
            <h2 id="auth-access-title">{title}</h2>
            <p>{description}</p>
          </div>

          {children}

          <p className="auth-access-note">
            Ambiente institucional. O acesso e as operações privilegiadas seguem
            as permissões definidas para cada perfil.
          </p>
        </section>
      </main>

      <footer className="auth-portal-footer">
        <span><strong>MAE APS</strong> · PET SAÚDE UFCG</span>
        <span>Desenvolvimento: Lucca Araújo</span>
        <span>Design: Kethilly Nayara</span>
      </footer>
    </div>
  );
}
