import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/20261012090000_siaps_v3_scoped_reconciliation.sql"), "utf8");
const api = readFileSync(resolve("src/app/api/importacoes/route.ts"), "utf8");
const wizard = readFileSync(resolve("src/components/siaps/import-wizard.tsx"), "utf8");

describe("V2: defesa em profundidade da importação C3", () => {
  it("retira do endpoint os RPCs de substituição da competência inteira", () => {
    expect(api).not.toContain("publish_siaps_c3_v2");
    expect(api).not.toContain("publish_siaps_c3_v1");
    expect(api).not.toContain("replaceExisting");
    expect(api).toContain("publish_siaps_c3_v3");
    expect(api).toContain("preview_siaps_c3_v3");
  });

  it("concilia por equipe e competência sem inativação global", () => {
    expect(migration).toContain("f.team_id = t.id");
    expect(migration).toContain("f.competency = p_competency");
    expect(migration).toContain("and f.is_current");
    expect(migration).not.toContain("set is_current = false");
    expect(migration).not.toContain("set is_current=false");
    expect(migration).toContain("where not exists (");
  });

  it("impede escopo implícito e mantém RPCs restritas ao servidor", () => {
    expect(migration).toContain("create table if not exists siaps.c3_editor_scopes");
    expect(migration).toContain("when not allowed then 'fora_escopo'");
    expect(migration).toContain("scope_kind = 'municipio'");
    expect(migration).toContain("scope_kind = 'equipe'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("trava concorrência e exige prévia vinculada ao arquivo, ator e estado corrente", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain("v_pre.rows_hash <> md5(p_rows::text)");
    expect(migration).toContain("v_pre.snapshot_hash <> v_check->>'snapshot'");
    expect(migration).toContain("v_pre.schema_signature <> p_schema_signature");
    expect(migration).toContain("v_pre.consumed_at is not null");
    expect(migration).toContain("using errcode = '40001'");
  });

  it("bloqueia conflitos e regiões não autorizadas e preserva histórico", () => {
    expect(migration).toContain("when current_id is null and incompatible_link then 'conflito'");
    expect(migration).toContain("and old_components = components");
    expect(migration).toContain("(v_check->>'conflicts')::int > 0");
    expect(migration).toContain("(v_check->>'unauthorized')::int > 0");
    expect(migration).toContain("insert into audit.events");
    expect(migration).toContain("insert into siaps.quality_rows");
  });

  it("não oferece substituição integral silenciosa na interface", () => {
    expect(wizard).toContain("Analisar duplicidades e permissões");
    expect(wizard).toContain("Publicação bloqueada por segurança.");
    expect(wizard).not.toContain("Substituir e publicar");
    expect(wizard).not.toContain("replaceExisting");
  });

  it("concessões de escopo são auditadas na mesma transação", () => {
    expect(migration).toContain("public.manage_siaps_c3_scope_v3");
    expect(migration).toContain("p.role = 'admin'");
    expect(migration).toContain("'siaps_c3_scope_' || p_action");
  });
});
