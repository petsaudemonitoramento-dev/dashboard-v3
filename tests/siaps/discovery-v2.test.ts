import * as XLSX from "xlsx";
import { describe, it, expect } from "vitest";
import { discoverSiapsSchema } from "@/lib/siaps/discovery";
import { parseSiapsWorkbook } from "@/lib/siaps/parser";

const header = ["CNES","Estabelecimento","INE","Equipe",..."ABCDEFGHIJK".split(""),"Pontos total","Denominador","Razão oficial"];
const row = ["1234567","UBS Teste","1234567890","Equipe Alfa",2,...Array(10).fill(1),110,3,"36,67"];
function sheet(book: XLSX.WorkBook, name: string, rows: unknown[][]) {
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
}
function parse(book: XLSX.WorkBook) {
  return parseSiapsWorkbook(XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer, "c3_09_2026.xlsx");
}

describe("descoberta estrutural SIAPS V2", () => {
  it("descobre a aba correta mesmo quando uma capa vem antes", () => {
    const book = XLSX.utils.book_new();
    sheet(book, "Orientações", [["DOCUMENTO AUXILIAR"], ["Esta não é uma planilha SIAPS"]]);
    sheet(book, "Qualidade", [["Competência 09/2026"], header, row]);
    const result = parse(book);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.sheetName).toBe("Qualidade");
    expect(result.warnings.join(" ")).toContain("não na primeira aba");
  });

  it("não infere automaticamente colunas desconhecidas", () => {
    const book = XLSX.utils.book_new();
    sheet(book, "Qualidade", [["09/2026"], [...header, "Campo futuro não documentado"], [...row, "valor novo"]]);
    const result = parse(book);
    expect(result.errors).toEqual([]);
    expect(result.schema?.unknownColumns).toContain("Campo futuro não documentado");
    expect(result.warnings.join(" ")).toContain("não reconhecidas");
  });

  it("rejeita campo obrigatório duplicado", () => {
    const book = XLSX.utils.book_new();
    sheet(book, "Qualidade", [[...header, "INE"], [...row, "1234567890"]]);
    expect(parse(book).errors.join(" ")).toContain("ambíguas");
  });

  it("rejeita duas abas com tabelas C3 válidas", () => {
    const book = XLSX.utils.book_new();
    sheet(book, "Equipe A", [header, row]);
    sheet(book, "Equipe B", [header, row]);
    expect(parse(book).errors.join(" ")).toContain("múltiplas abas");
  });

  it("não confunde coluna que começa com A com componente A", () => {
    const book = XLSX.utils.book_new();
    const headers = header.map(x => x === "A" ? "Acompanhamento" : x);
    sheet(book, "Qualidade", [headers, row]);
    expect(parse(book).errors.join(" ")).toContain("A");
  });

  it("aceita aliases explícitos, inclusive prática A até K", () => {
    const mapped = header.map(h => /^[A-K]$/.test(h) ? `Prática ${h}` : h);
    const candidate = discoverSiapsSchema([{ name: "Dados", matrix: [mapped, row] }]);
    expect(candidate.selected?.indexes.A).toBeGreaterThan(-1);
    expect(candidate.selected?.indexes.K).toBeGreaterThan(-1);
    expect(candidate.errors).toEqual([]);
  });
});
