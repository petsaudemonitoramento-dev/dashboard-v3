import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseSiapsWorkbook } from "@/lib/siaps/parser";

function workbook(rows = 1, points = 110, extra: unknown[][] = []) {
  const header = ["CNES", "Estabelecimento", "Tipo estabelecimento", "INE", "Equipe", "Tipo equipe", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "Pontos total", "Denominador", "Razão oficial"];
  const data = Array.from({ length: rows }, (_, index) => [String(index + 1).padStart(7, "0"), `UBS ${index}`, "UBS", String(index + 1).padStart(10, "0"), `Equipe ${index}`, "eSF", 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, points, 3, "36,67"]);
  const sheet = XLSX.utils.aoa_to_sheet([["Competência 06/2026"], header, ...data, ...extra]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "C3");
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parser SIAPS C3", () => {
  it("detecta cabeçalho, competência e preserva identificadores", () => {
    const result = parseSiapsWorkbook(workbook(), "c3.xlsx");
    expect(result.errors).toEqual([]);
    expect(result.competency).toBe("2026-06-01");
    expect(result.rows[0]).toMatchObject({ cnes: "0000001", ine: "0000000001", denominator: 3, pointsTotal: 110 });
  });

  it("não limita a ingestão a uma lista fixa de equipes", () => {
    expect(parseSiapsWorkbook(workbook(15)).rows).toHaveLength(15);
  });

  it("ignora linha de total sem CNES e INE em vez de criar equipe fictícia", () => {
    const total = ["", "TOTAL", "", "", "", "", 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 110, 3, ""];
    const result = parseSiapsWorkbook(workbook(2, 110, [total]));
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.some((row) => /^0+$/.test(row.cnes) || /^0+$/.test(row.ine))).toBe(false);
    expect(result.warnings.join(" ")).toContain("sem CNES e INE");
  });

  it("rejeita CNES ou INE compostos só de zeros", () => {
    const zeros = ["0", "UBS Zero", "UBS", "1234567890", "Equipe", "eSF", 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 110, 3, ""];
    expect(parseSiapsWorkbook(workbook(1, 110, [zeros])).errors.join(" ")).toContain("CNES inválido");
  });

  it("trata A–K como contagens e recalcula pontos divergentes", () => {
    const result = parseSiapsWorkbook(workbook(1, 999));
    expect(result.rows[0].components.A).toBe(2);
    expect(result.rows[0].pointsTotal).toBe(110);
    expect(result.warnings[0]).toContain("divergem");
  });
});
