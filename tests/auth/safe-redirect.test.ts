import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/auth/safe-redirect";

const ORIGIN = "https://painel.instituicao.br";

/**
 * A1 — o `safeNext` anterior validava por prefixo de string
 * (`startsWith("/") && !startsWith("//")`), o que deixava passar `/\evil.com`:
 * a normalização WHATWG converte `\` em `/` para esquemas especiais, o valor
 * vira `//evil.com` e o redirect sai do domínio.
 */
describe("destino pós-autenticação", () => {
  it("mantém caminho interno com query e hash", () => {
    expect(safeNext("/sistema/gestao?aba=1#topo", ORIGIN)).toBe(
      "/sistema/gestao?aba=1#topo",
    );
  });

  it("usa o padrão quando não há destino", () => {
    expect(safeNext(null, ORIGIN)).toBe("/sistema");
    expect(safeNext(undefined, ORIGIN)).toBe("/sistema");
    expect(safeNext("", ORIGIN)).toBe("/sistema");
  });

  it.each([
    ["//evil.com", "protocol-relative"],
    ["https://evil.com", "absoluto https"],
    ["http://evil.com/x", "absoluto http"],
    ["/\\evil.com", "barra invertida — bypass corrigido"],
    ["/\\\\evil.com", "barra invertida dupla"],
    ["\\\\evil.com", "somente barras invertidas"],
    ["/\0evil.com", "byte nulo"],
    ["javascript:alert(1)", "esquema javascript"],
  ])("recusa destino externo: %s (%s)", (payload) => {
    expect(safeNext(payload, ORIGIN)).toBe("/sistema");
  });

  it("nenhum destino aceito resolve para fora da origem canônica", () => {
    const payloads = [
      "/sistema",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/completar-cadastro?next=/x",
      "/\0evil.com",
    ];
    for (const payload of payloads) {
      const destino = new URL(safeNext(payload, ORIGIN), ORIGIN);
      expect(destino.origin).toBe(ORIGIN);
    }
  });
});
