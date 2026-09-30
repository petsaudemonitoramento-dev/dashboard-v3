"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <html lang="pt-BR"><body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f8fb", color: "#13263a" }}><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section style={{ maxWidth: 560, padding: 32, background: "white", border: "1px solid #dbe5ef", borderRadius: 16, textAlign: "center" }}><strong style={{ color: "#0d4d80" }}>MAE APS</strong><h1>Serviço temporariamente indisponível</h1><p>Nenhum dado técnico foi exibido. Tente novamente em instantes.</p><button onClick={reset} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#0d4d80", color: "white", fontWeight: 700 }} type="button">Tentar novamente</button></section></main></body></html>;
}
