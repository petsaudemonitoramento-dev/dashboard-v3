import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMetabaseGuestConfig, signManagementDashboardGuestToken } from "@/lib/metabase/guest-embed";

const KEY = "unit-test-only-secret-not-a-real-metabase-key-012345";

function configured() {
  vi.stubEnv("METABASE_GUEST_EMBED_ENABLED", "true");
  vi.stubEnv("METABASE_PUBLIC_URL", "https://bi.example.org");
  vi.stubEnv("METABASE_DASHBOARD_ID", "42");
  vi.stubEnv("METABASE_GUEST_SECRET_KEY", KEY);
}

afterEach(() => vi.unstubAllEnvs());

describe("Metabase OSS guest embed — somente no servidor", () => {
  it("vem desligado por padrao", () => {
    vi.stubEnv("METABASE_GUEST_EMBED_ENABLED", "");
    expect(getMetabaseGuestConfig()).toBeNull();
  });

  it("exige origem HTTPS, chave longa e ID de dashboard validado", () => {
    configured();
    expect(getMetabaseGuestConfig()).toEqual({
      publicUrl: "https://bi.example.org",
      dashboardId: 42,
      secretKey: KEY,
    });
    vi.stubEnv("METABASE_PUBLIC_URL", "https://usuario:senha@bi.example.org");
    expect(getMetabaseGuestConfig()).toBeNull();
    vi.stubEnv("METABASE_PUBLIC_URL", "https://bi.example.org");
    vi.stubEnv("METABASE_DASHBOARD_ID", "0");
    expect(getMetabaseGuestConfig()).toBeNull();
    vi.stubEnv("METABASE_DASHBOARD_ID", "42");
    vi.stubEnv("METABASE_GUEST_SECRET_KEY", "insegura");
    expect(getMetabaseGuestConfig()).toBeNull();
  });

  it("gera JWT HS256 verificavel com um unico dashboard e prazo curto", () => {
    configured();
    const config = getMetabaseGuestConfig();
    expect(config).not.toBeNull();
    const jwt = signManagementDashboardGuestToken(config!, 1000);
    const [header, payload, signature] = jwt.split(".");
    const signatureExpected = createHmac("sha256", KEY)
      .update(`${header}.${payload}`).digest("base64url");
    expect(signature).toBe(signatureExpected);
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "HS256", typ: "JWT",
    });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      resource: { dashboard: 42 },
      params: {},
      iat: 1000,
      exp: 1300,
    });
    expect(jwt).not.toContain(KEY);
  });
});
