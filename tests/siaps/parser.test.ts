import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseSiapsWorkbook } from "@/lib/siaps/parser";

function workbook(rows = 1, points = 110) {
  const header = ["CNES", "Estabelecimento", "Tipo estabelecimento", "INE", "Equipe", "Tipo equipe", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "Pontos total", "Denominador", "Razão oficial"];
  const data = Array.from({ length: rows }, (_, index) => [String(index + 1).padStart(7, "0"), `UBS ${index}`, "UBS", String(index + 1).padStart(10, "0"), `Equipe ${index}`, "eSF", 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, points, 3, "36,67"]);
  const sheet = XLSX.utils.aoa_to_sheet([["Competência 06/2026"], header, ...data]);
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

  it("não limita a ingestão às 14 equipes do piloto", () => {
    expect(parseSiapsWorkbook(workbook(15)).rows).toHaveLength(15);
  });

  it("trata A–K como contagens e preserva pontos oficiais divergentes", () => {
    const result = parseSiapsWorkbook(workbook(1, 999));
    expect(result.rows[0].components.A).toBe(2);
    expect(result.rows[0].pointsTotal).toBe(999);
    expect(result.warnings[0]).toContain("divergem");
  });
});
