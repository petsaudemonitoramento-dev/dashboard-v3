import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccessDeniedError } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  config: vi.fn(),
  token: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireDashboardAccess: mocks.access }));
vi.mock("@/lib/metabase/guest-embed", () => ({
  getMetabaseGuestConfig: mocks.config,
  signManagementDashboardGuestToken: mocks.token,
}));

import { POST } from "@/app/api/metabase/guest-token/route";

function request(body: unknown, origin = "https://maeaps.vercel.app") {
  return new NextRequest("https://maeaps.vercel.app/api/metabase/guest-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.access.mockResolvedValue({});
  mocks.config.mockReturnValue({
    publicUrl: "https://bi.exemplo.org",
    dashboardId: 77,
    secretKey: "unit-test-not-a-real-metabase-secret-123456",
  });
  mocks.token.mockReturnValue("token.de.teste");
});
afterEach(() => vi.clearAllMocks());

describe("Guest token — autorização do MAE APS", () => {
  it("bloqueia antes da configuração da VM", async () => {
    mocks.config.mockReturnValue(null);
    const r = await POST(request({ entityType: "dashboard", entityId: 77 }));
    expect(r.status).toBe(503);
    expect(mocks.access).not.toHaveBeenCalled();
  });

  it("recusa chamada de outra origem", async () => {
    const r = await POST(request({ entityType: "dashboard", entityId: 77 }, "https://outro.exemplo.org"));
    expect(r.status).toBe(403);
    expect(mocks.token).not.toHaveBeenCalled();
  });

  it("recusa usuario sem sessao", async () => {
    mocks.access.mockRejectedValue(new AccessDeniedError("UNAUTHENTICATED", "Sem sessao"));
    const r = await POST(request({ entityType: "dashboard", entityId: 77 }));
    expect(r.status).toBe(401);
    expect(mocks.token).not.toHaveBeenCalled();
  });

  it("recusa perfis sem permissao", async () => {
    mocks.access.mockRejectedValue(new AccessDeniedError("FORBIDDEN", "Sem perfil autorizado"));
    const r = await POST(request({ entityType: "dashboard", entityId: 77 }));
    expect(r.status).toBe(403);
    expect(mocks.token).not.toHaveBeenCalled();
  });

  it("recusa identificador arbitrario e tipo question", async () => {
    const a = await POST(request({ entityType: "dashboard", entityId: 78 }));
    const b = await POST(request({ entityType: "question", entityId: 77 }));
    expect(a.status).toBe(403);
    expect(b.status).toBe(403);
    expect(mocks.token).not.toHaveBeenCalled();
  });

  it("só emite JWT curto para dashboard permitido e nunca permite cache", async () => {
    const r = await POST(request({
      entityType: "dashboard",
      entityId: "77",
      customContext: "nao-confiar-no-navegador",
    }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ jwt: "token.de.teste" });
    expect(r.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.access).toHaveBeenCalledOnce();
    expect(mocks.token).toHaveBeenCalledOnce();
  });
});
