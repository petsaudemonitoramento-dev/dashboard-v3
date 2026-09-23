import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env";

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdefghijklmnopqrstuvwxyz",
  NEXT_PUBLIC_APP_URL: "https://painel.instituicao.br",
};

describe("validação de ambiente", () => {
  it("aceita URL HTTPS, chave publicável e origem canônica", () => {
    expect(parsePublicEnv({ ...BASE })).toBeTruthy();
  });

  it("rejeita chave service-role no ambiente público", () => {
    expect(() =>
      parsePublicEnv({
        ...BASE,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service_role_never_expose_this_value",
      }),
    ).toThrow();
  });

  // C1 — sem origem canônica o servidor voltaria a depender de cabeçalhos da
  // requisição para montar o link de recuperação de senha.
  it("exige NEXT_PUBLIC_APP_URL", () => {
    expect(() =>
      parsePublicEnv({ ...BASE, NEXT_PUBLIC_APP_URL: undefined }),
    ).toThrow();
  });

  it("rejeita origem canônica em HTTP fora de loopback", () => {
    expect(() =>
      parsePublicEnv({ ...BASE, NEXT_PUBLIC_APP_URL: "http://painel.instituicao.br" }),
    ).toThrow();
  });

  it("rejeita origem canônica com barra final", () => {
    expect(() =>
      parsePublicEnv({ ...BASE, NEXT_PUBLIC_APP_URL: "https://painel.instituicao.br/" }),
    ).toThrow();
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])("tolera HTTP apenas em loopback (%s)", (appUrl) => {
    expect(parsePublicEnv({ ...BASE, NEXT_PUBLIC_APP_URL: appUrl })).toBeTruthy();
  });
});
