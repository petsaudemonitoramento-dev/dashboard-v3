"use client";

import Link from "next/link";
import { createElement, useEffect, useState } from "react";

type EmbedConfig = { instanceUrl: string; dashboardId: number };

declare global {
  interface Window {
    metabaseConfig?: {
      isGuest: boolean;
      instanceUrl: string;
      locale: string;
      guestEmbedProviderUri: string;
    };
  }
}

const SCRIPT_ID = "mae-aps-metabase-guest-script";

export function ManagementIntelligenceEmbed({ instanceUrl, dashboardId }: EmbedConfig) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // Nunca incluir a chave de assinatura ou token fixo no frontend.
    // O web component solicita um JWT novo ao endpoint autenticado do MAE APS.
    window.metabaseConfig = {
      isGuest: true,
      instanceUrl,
      locale: "pt-BR",
      guestEmbedProviderUri: "/api/metabase/guest-token",
    };

    if (window.customElements.get("metabase-dashboard")) {
      // Atualização assíncrona para preservar a regra React de effects puros.
      const frame = window.requestAnimationFrame(() => setStatus("ready"));
      return () => window.cancelAnimationFrame(frame);
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const createdHere = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `${instanceUrl}/app/embed.js`;
      script.async = true;
    }

    const onLoad = () => setStatus("ready");
    const onError = () => setStatus("error");
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (createdHere) document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, [instanceUrl]);

  return (
    <section aria-label="Análises avançadas C3 do MAE APS" className="dashboard-card" style={{ padding: "clamp(12px, 2vw, 24px)" }}>
      {status === "loading" && (
        <p aria-live="polite" role="status">Carregando as análises avançadas…</p>
      )}
      {status === "error" && (
        <div role="alert">
          <h2>Não foi possível abrir as análises avançadas.</h2>
          <p>O Metabase pode estar indisponível. Os indicadores convencionais do MAE APS continuam acessíveis.</p>
          <Link href="/sistema/gestao/indicadores">Abrir indicadores</Link>
        </div>
      )}
      {status === "ready" && createElement("metabase-dashboard", {
        "dashboard-id": String(dashboardId),
        "with-title": "false",
        style: { display: "block", width: "100%", minHeight: "750px" },
      })}
    </section>
  );
}
