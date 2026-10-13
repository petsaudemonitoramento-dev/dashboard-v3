import * as XLSX from "xlsx";

import { pointsFromComponents, type C3Components } from "@/lib/analytics/c3";
import { SIAPS_ROW_LIMIT_MESSAGE, SIAPS_XLSX_TOO_LARGE_MESSAGE } from "@/lib/siaps/errors";
import { MAX_SIAPS_ROWS, MAX_SIAPS_XLSX_BYTES } from "@/lib/siaps/limits";
import { COMPONENT_CODES } from "@/lib/siaps/parser-constants";
import { discoverSiapsSchema, MAX_HEADER_SCAN_ROWS_V2, MAX_IMPORT_SHEETS, type SheetScan } from "@/lib/siaps/discovery";

export const SIAPS_PARSER_VERSION = "mae-aps-c3/2.0.0";
export { MAX_SIAPS_XLSX_BYTES as MAX_SIAPS_FILE_BYTES } from "@/lib/siaps/limits";
export { COMPONENT_CODES } from "@/lib/siaps/parser-constants";

export type SiapsC3Row = {
  fileRow: number;
  cnes: string;
  establishmentName: string;
  establishmentType: string;
  ine: string;
  teamName: string;
  teamType: string;
  components: C3Components;
  pointsTotal: number;
  denominator: number;
  officialRatio: number | null;
};

export type SiapsParseResult = {
  competency: string | null;
  rows: SiapsC3Row[];
  errors: string[];
  warnings: string[];
  headerRow: number | null;
  sheetName?: string;
  schema?: Pick<SheetScan, "headerSignature" | "unknownColumns" | "duplicateFields" | "missingFields">;
};

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function detectCompetency(matrix: unknown[][], filename: string): string | null {
  const text = matrix.slice(0, 18).flat().map(String).join(" ");
  const source = `${text} ${filename}`;
  const iso = source.match(/\b(20\d{2})[-_/](0?[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-01`;
  const brazilian = source.match(/\b(0?[1-9]|1[0-2])[\/_-](20\d{2})\b/);
  if (brazilian) return `${brazilian[2]}-${brazilian[1].padStart(2, "0")}-01`;
  return null;
}

export function parseSiapsWorkbook(buffer: ArrayBuffer, filename = "arquivo.xlsx"): SiapsParseResult {
  if (buffer.byteLength > MAX_SIAPS_XLSX_BYTES) {
    return { competency: null, rows: [], errors: [SIAPS_XLSX_TOO_LARGE_MESSAGE], warnings: [], headerRow: null };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array", cellDates: true, cellFormula: false, bookDeps: false,
      bookFiles: false, bookVBA: false,
      sheetRows: MAX_SIAPS_ROWS + MAX_HEADER_SCAN_ROWS_V2 + 2,
    });
  } catch {
    return { competency: null, rows: [], errors: ["Arquivo XLSX inválido ou corrompido."], warnings: [], headerRow: null };
  }
  if (!workbook.SheetNames.length) {
    return { competency: null, rows: [], errors: ["A planilha não contém abas legíveis."], warnings: [], headerRow: null };
  }
  if (workbook.SheetNames.length > MAX_IMPORT_SHEETS) {
    return { competency: null, rows: [], errors: ["O arquivo possui abas demais para leitura segura."], warnings: [], headerRow: null };
  }
  const sheets = workbook.SheetNames.map(name => ({
    name,
    matrix: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, { header: 1, defval: "", raw: false }),
  }));
  const discovery = discoverSiapsSchema(sheets);
  if (!discovery.selected) {
    return { competency: detectCompetency(sheets[0]?.matrix ?? [], filename), rows: [], errors: discovery.errors, warnings: discovery.warnings, headerRow: null };
  }
  const candidate = discovery.selected;
  const matrix = sheets.find(sheet => sheet.name === candidate.sheetName)!.matrix;
  const headerIndex = candidate.headerRow - 1;
  const indexes = { ...candidate.indexes, components: Object.fromEntries(COMPONENT_CODES.map(code => [code, candidate.indexes[code]])) as Record<(typeof COMPONENT_CODES)[number], number> };
  const warnings = [...discovery.warnings];
  const errors: string[] = [];

  let dataRowCount = 0;
  for (const source of matrix.slice(headerIndex + 1)) {
    if (source.every((cell) => String(cell).trim() === "")) continue;
    dataRowCount += 1;
    if (dataRowCount > MAX_SIAPS_ROWS) {
      return {
        competency: detectCompetency(matrix, filename),
        rows: [],
        errors: [SIAPS_ROW_LIMIT_MESSAGE],
        warnings,
        headerRow: headerIndex + 1,
        sheetName: candidate.sheetName,
      };
    }
  }

  const rows: SiapsC3Row[] = [];
  matrix.slice(headerIndex + 1).forEach((source, offset) => {
    if (source.every((cell) => String(cell).trim() === "")) return;
    const fileRow = headerIndex + offset + 2;
    const cnesDigits = digits(source[indexes.cnes]);
    const ineDigits = digits(source[indexes.ine]);
    // Sem CNES e sem INE a linha não pertence a nenhuma equipe (ex.: total/rodapé).
    // Completar com zeros criaria uma UBS/equipe fictícia e duplicaria o denominador.
    if (!cnesDigits && !ineDigits) {
      warnings.push(`Linha ${fileRow}: sem CNES e INE (provável linha de total); ignorada.`);
      return;
    }
    const cnes = cnesDigits.padStart(7, "0");
    const ine = ineDigits.padStart(10, "0");
    const denominator = numberValue(source[indexes.denominator]);
    const pointsTotal = numberValue(source[indexes.points]);
    const componentValues = Object.fromEntries(COMPONENT_CODES.map((code) => [code, numberValue(source[indexes.components[code]])])) as Record<string, number | null>;
    const rowErrors: string[] = [];
    if (!/^\d{7}$/.test(cnes) || /^0+$/.test(cnes)) rowErrors.push("CNES inválido");
    if (!/^\d{10}$/.test(ine) || /^0+$/.test(ine)) rowErrors.push("INE inválido");
    if (denominator === null || !Number.isInteger(denominator) || denominator < 0) rowErrors.push("denominador inválido");
    if (pointsTotal === null || pointsTotal < 0) rowErrors.push("pontos inválidos");
    if (Object.values(componentValues).some((value) => value === null || !Number.isInteger(value) || value < 0)) rowErrors.push("A–K devem ser contagens inteiras não negativas");
    if (rowErrors.length) {
      errors.push(`Linha ${fileRow}: ${rowErrors.join("; ")}.`);
      return;
    }
    const components = componentValues as C3Components;
    if (Object.values(components).some((value) => value > (denominator as number))) {
      errors.push(`Linha ${fileRow}: A–K não podem superar o denominador.`);
      return;
    }
    const calculatedPoints = pointsFromComponents(components);
    if (calculatedPoints !== pointsTotal) {
      warnings.push(`Linha ${fileRow}: pontos informados divergem de 10×A + 9×(B–K); a pontuação calculada será usada.`);
    }
    rows.push({
      fileRow,
      cnes,
      establishmentName: String(source[indexes.establishment] ?? "").trim() || `CNES ${cnes}`,
      establishmentType: indexes.establishmentType >= 0 ? String(source[indexes.establishmentType] ?? "").trim() : "",
      ine,
      teamName: indexes.team >= 0 ? String(source[indexes.team] ?? "").trim() : "",
      teamType: indexes.teamType >= 0 ? String(source[indexes.teamType] ?? "").trim() : "",
      components,
      pointsTotal: calculatedPoints,
      denominator: denominator as number,
      officialRatio: indexes.ratio >= 0 ? numberValue(source[indexes.ratio]) : null,
    });
  });

  const competency = detectCompetency(matrix, filename);
  if (!competency) warnings.push("Competência não detectada automaticamente; informe-a antes de publicar.");
  if (!rows.length && !errors.length) errors.push("Nenhum registro C3 válido foi encontrado.");
  return { competency, rows, errors, warnings, headerRow: headerIndex + 1, sheetName: candidate.sheetName, schema: {
    headerSignature: candidate.headerSignature,
    unknownColumns: candidate.unknownColumns,
    duplicateFields: candidate.duplicateFields,
    missingFields: candidate.missingFields,
  } };
}

export async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function compactSiapsRow(row: SiapsC3Row) {
  return [
    row.fileRow, row.cnes, row.establishmentName, row.establishmentType,
    row.ine, row.teamName, row.teamType,
    ...COMPONENT_CODES.map((code) => row.components[code]),
    row.pointsTotal, row.denominator, row.officialRatio,
  ];
}
