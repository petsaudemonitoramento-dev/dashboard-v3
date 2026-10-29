import Link from "next/link";
import { BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";

import { ManagementIntelligenceEmbed } from "@/components/metabase/management-intelligence-embed";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { getMetabaseGuestConfig } from "@/lib/metabase/guest-embed";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  await enforceRouteGuard(() => requireDashboardAccess());
  const config = getMetabaseGuestConfig();

  return (
    <div className="management-module">
      <header className="module-header">
        <div>
          <span>MAE APS · Inteligência em saúde</span>
          <h1>Análises avançadas</h1>
          <p>
            Indicadores C3, tendências territoriais e práticas A–K organizados
            para apoiar o acompanhamento da gestão municipal.
          </p>
        </div>
        <div className="module-header-badge">
          <ShieldCheck aria-hidden="true" /> Acesso pela Gestão
        </div>
      </header>
      {!config ? (
        <section className="dashboard-card" aria-label="Situação da integração analítica">
          <div className="dashboard-card-heading">
            <div>
              <span>Integração em preparação</span>
              <h2>Painel avançado ainda não ativado</h2>
              <p>Esta seção aparecerá para a gestão somente após a configuração segura do servidor de análises.</p>
            </div>
            <LockKeyhole aria-hidden="true" />
          </div>
          <p>Enquanto isso, os indicadores oficiais continuam disponíveis no MAE APS.</p>
          <Link href="/sistema/gestao/indicadores">
            <BarChart3 aria-hidden="true" /> Consultar indicadores existentes
          </Link>
        </section>
      ) : (
        <ManagementIntelligenceEmbed instanceUrl={config.publicUrl} dashboardId={config.dashboardId} />
      )}
    </div>
  );
}
