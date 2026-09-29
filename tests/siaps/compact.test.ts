import { describe, expect, it } from "vitest";

import { validateCompactSiapsRows } from "@/lib/siaps/compact";

const validRow = [20,"1234567","UBS","UBS","0000000001","Equipe","eSF",2,1,1,1,1,1,1,1,1,1,1,110,2,55];

describe("validação server-side da importação compacta", () => {
  it("aceita fórmula C3 e identificadores válidos", () => {
    expect(validateCompactSiapsRows([validRow])).toHaveLength(1);
  });

  it("rejeita pontuação manipulada no navegador", () => {
    const row = [...validRow];
    row[18] = 999;
    expect(() => validateCompactSiapsRows([row])).toThrow("Pontuação C3 divergente");
  });

  it("rejeita CNES ou INE compostos só de zeros", () => {
    const zeroCnes = [...validRow];
    zeroCnes[1] = "0000000";
    expect(() => validateCompactSiapsRows([zeroCnes])).toThrow("CNES inválido");
    const zeroIne = [...validRow];
    zeroIne[4] = "0000000000";
    expect(() => validateCompactSiapsRows([zeroIne])).toThrow("INE inválido");
  });

  it("rejeita INE duplicado no mesmo arquivo", () => {
    const second = [...validRow];
    second[0] = 21;
    expect(() => validateCompactSiapsRows([validRow, second])).toThrow("INE inválido ou duplicado");
  });
});
