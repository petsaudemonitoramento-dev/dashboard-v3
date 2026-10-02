import { afterEach, describe, expect, it } from "vitest";

import {
  assertLoopbackUrl,
  assertSafeE2EEnvironment,
} from "../e2e/support/environment";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("trava de segurança dos testes E2E", () => {
  it.each([
    "https://maeaps.vercel.app",
    "https://preview.example.com",
    "postgresql://postgres:secret@db.example.com/postgres",
  ])("recusa destino remoto (%s)", (url) => {
    expect(() => assertLoopbackUrl(url, "destino")).toThrow(/loopback/);
  });

  it("aceita somente aplicação, Supabase e banco locais com chave de teste", () => {
    process.env.E2E_BASE_URL = "http://127.0.0.1:3100";
    process.env.E2E_SUPABASE_URL = "http://localhost:54321";
    process.env.E2E_DATABASE_URL =
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = "local-test-key";

    expect(assertSafeE2EEnvironment()).toEqual({
      baseUrl: "http://127.0.0.1:3100",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      supabaseUrl: "http://localhost:54321",
    });
  });
});
