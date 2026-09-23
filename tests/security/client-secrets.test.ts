import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("segredos privilegiados", () => {
  it("não usa variável NEXT_PUBLIC para a chave privilegiada", () => {
    const env = readFileSync(resolve(".env.example"), "utf8");
    const client = readFileSync(resolve("src/lib/supabase/client.ts"), "utf8");
    expect(`${env}\n${client}`).not.toMatch(/NEXT_PUBLIC_.*(?:SERVICE_ROLE|SECRET_KEY)/i);
  });

  it("mantém o cliente privilegiado marcado como server-only", () => {
    const source = readFileSync(resolve("src/lib/supabase/privileged.ts"), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain("SUPABASE_SECRET_KEY");
  });
});
