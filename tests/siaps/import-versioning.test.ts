import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("versionamento de importações SIAPS", () => {
  const migration = readFileSync(
    resolve("supabase/migrations/20261002043000_siaps_import_audit_and_replacement.sql"),
    "utf8",
  );

  it("preserva histórico e desativa toda a competência anterior", () => {
    expect(migration).toContain("status = 'substituido'");
    expect(migration).toContain("source_import_id <> v_import_id");
    expect(migration).toContain("and is_current");
    expect(migration).toContain("siaps_c3_import_replaced");
  });

  it("exige confirmação explícita quando já existe publicação", () => {
    expect(migration).toContain("not v_replace_existing");
    expect(migration).toContain("confirmação de substituição obrigatória");
  });

  it("mantém a RPC restrita ao service_role", () => {
    expect(migration).toContain("revoke all on function public.publish_siaps_c3_v2");
    expect(migration).toContain("grant execute on function public.publish_siaps_c3_v2");
    expect(migration).toContain("to service_role");
  });
});
