import { describe, expect, it } from "vitest";

import { resolveLoadProfile, validateLoadTarget } from "./safety.js";

describe("proteções do teste de carga", () => {
  it.each([
    ["10", 10, "1m"],
    ["50", 50, "2m"],
    ["100", 100, "2m"],
  ])("configura o perfil %s", (name, vus, duration) => {
    expect(resolveLoadProfile(name)).toEqual({ name, vus, duration });
  });

  it("recusa perfis fora do escopo", () => {
    expect(() => resolveLoadProfile("10000")).toThrow("10, 50 ou 100");
  });

  it.each([
    "http://localhost:3100",
    "http://127.0.0.1:3100",
  ])("aceita loopback sem liberação remota (%s)", (target) => {
    expect(validateLoadTarget({ K6_BASE_URL: target })).toBe(target);
  });

  it("aceita staging somente com confirmação explícita", () => {
    expect(validateLoadTarget({
      K6_ALLOW_REMOTE: "STAGING_AUTORIZADO",
      K6_BASE_URL: "https://staging.maeaps.test",
      K6_ENVIRONMENT: "staging",
    })).toBe("https://staging.maeaps.test");
  });

  it("recusa alvo remoto sem confirmação", () => {
    expect(() => validateLoadTarget({
      K6_BASE_URL: "https://staging.maeaps.test",
      K6_ENVIRONMENT: "staging",
    })).toThrow("STAGING_AUTORIZADO");
  });

  it("bloqueia produção mesmo com confirmação remota", () => {
    expect(() => validateLoadTarget({
      K6_ALLOW_REMOTE: "STAGING_AUTORIZADO",
      K6_BASE_URL: "https://maeaps.example",
      K6_ENVIRONMENT: "production",
    })).toThrow("produção está bloqueada");
  });

  it.each([
    "https://maeaps.vercel.app",
    "https://maeaps.vercel.app.",
  ])("bloqueia o domínio oficial mesmo quando rotulado como staging (%s)", (target) => {
    expect(() => validateLoadTarget({
      K6_ALLOW_REMOTE: "STAGING_AUTORIZADO",
      K6_BASE_URL: target,
      K6_ENVIRONMENT: "staging",
    })).toThrow("produção está bloqueada");
  });

  it.each([
    "",
    "ftp://localhost",
    "https://usuario:segredo@staging.maeaps.test",
    "https://staging.maeaps.test/caminho",
    "https://staging.maeaps.test?query=1",
  ])("recusa alvo inválido ou excessivo (%s)", (target) => {
    expect(() => validateLoadTarget({ K6_BASE_URL: target })).toThrow();
  });
});
