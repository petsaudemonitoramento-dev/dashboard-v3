import { describe, expect, it } from "vitest";

import {
  sanitizeSentryEvent,
  sanitizeTelemetryText,
} from "@/lib/observability/sentry-privacy";

describe("privacidade da telemetria", () => {
  it("remove identificadores e credenciais de textos", () => {
    const value = sanitizeTelemetryText(
      "falha de pessoa@saude.gov.br em lote.xlsx com Bearer token-secreto " +
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura " +
        "postgresql://postgres:senha@db.exemplo/postgres " +
        "https://painel.example/rota?token=valor#segredo-no-fragmento " +
        "originado em 192.0.2.10 e 2001:db8:85a3::8a2e:370:7334",
    );

    expect(value).not.toContain("pessoa@saude.gov.br");
    expect(value).not.toContain("lote.xlsx");
    expect(value).not.toContain("token-secreto");
    expect(value).not.toContain("postgres:senha");
    expect(value).not.toContain("?token=valor");
    expect(value).not.toContain("segredo-no-fragmento");
    expect(value).not.toContain("192.0.2.10");
    expect(value).not.toContain("2001:db8");
  });

  it("descarta PII de request, usuário e contextos sensíveis", () => {
    const event = sanitizeSentryEvent({
      message: "Erro ao processar gestao@maeaps.test em dados.xlsx",
      user: { email: "gestao@maeaps.test", id: "usuario-interno" },
      request: {
        cookies: { session: "segredo" },
        data: { rows: ["dado"] },
        headers: { authorization: "Bearer segredo" },
        method: "POST",
        query_string: "email=gestao@maeaps.test",
        url: "https://maeaps.vercel.app/api/importacoes?arquivo=dados.xlsx",
      },
      extra: {
        filename: "dados.xlsx",
        ip_address: "192.0.2.10",
        safeCount: 10,
        nested: { password: "segredo", status: "falhou" },
      },
      contexts: {
        request_metadata: {
          ip: "192.0.2.11",
          session_id: "sessao-interna",
          userAgent: "Navegador identificável",
        },
      },
      breadcrumbs: [
        {
          data: { email: "gestao@maeaps.test", route: "/api/importacoes" },
          message: "Upload dados.xlsx",
        },
      ],
    });

    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({
      method: "POST",
      url: "https://maeaps.vercel.app/api/importacoes",
    });
    expect(event.extra).toMatchObject({
      filename: "[removido]",
      ip_address: "[removido]",
      safeCount: 10,
      nested: { password: "[removido]", status: "falhou" },
    });
    expect(event.contexts?.request_metadata).toEqual({
      ip: "[removido]",
      session_id: "[removido]",
      userAgent: "[removido]",
    });
    expect(event.breadcrumbs?.[0]?.data?.email).toBe("[removido]");
    expect(event.message).toContain("[email-removido]");
  });
});
