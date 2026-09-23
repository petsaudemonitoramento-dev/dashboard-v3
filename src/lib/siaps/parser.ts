import * as XLSX from "xlsx";

import { pointsFromComponents, type C3Components } from "@/lib/analytics/c3";

export const SIAPS_PARSER_VERSION = "mae-aps-c3/1.0.0";
export const COMPONENT_CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;

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
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

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

function findColumn(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header === alias || header.startsWith(`${alias} `)));
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
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
  const errors: string[] = [];
  const warnings: string[] = [];
  const headerIndex = matrix.findIndex((row) => {
    const cells = row.map(normalize);
    return cells.some((cell) => cell === "CNES") && cells.some((cell) => cell === "INE");
  });

  if (headerIndex < 0) {
    return { competency: detectCompetency(matrix, filename), rows: [], errors: ["Cabeçalho SIAPS com CNES e INE não encontrado."], warnings, headerRow: null };
  }

  const headers = matrix[headerIndex].map(normalize);
  const indexes = {
    cnes: findColumn(headers, ["CNES"]),
    establishment: findColumn(headers, ["ESTABELECIMENTO", "UNIDADE", "UBS"]),
    establishmentType: findColumn(headers, ["TIPO ESTABELECIMENTO", "TIPO DE ESTABELECIMENTO"]),
    ine: findColumn(headers, ["INE"]),
    team: findColumn(headers, ["EQUIPE", "NOME DA EQUIPE"]),
    teamType: findColumn(headers, ["TIPO EQUIPE", "TIPO DE EQUIPE"]),
    points: findColumn(headers, ["PONTOS TOTAL", "PONTUACAO TOTAL", "TOTAL DE PONTOS", "PONTOS"]),
    denominator: findColumn(headers, ["DENOMINADOR", "POPULACAO ELEGIVEL"]),
    ratio: findColumn(headers, ["RAZAO OFICIAL", "RESULTADO", "INDICADOR", "C3"]),
    components: Object.fromEntries(COMPONENT_CODES.map((code) => [code, findColumn(headers, [code])])) as Record<(typeof COMPONENT_CODES)[number], number>,
  };

  const required = [indexes.cnes, indexes.ine, indexes.points, indexes.denominator, ...Object.values(indexes.components)];
  if (required.some((index) => index < 0)) {
    errors.push("O cabeçalho não contém todas as colunas obrigatórias: CNES, INE, A–K, pontos e denominador.");
    return { competency: detectCompetency(matrix, filename), rows: [], errors, warnings, headerRow: headerIndex + 1 };
  }

  const rows: SiapsC3Row[] = [];
  matrix.slice(headerIndex + 1).forEach((source, offset) => {
    if (source.every((cell) => String(cell).trim() === "")) return;
    const fileRow = headerIndex + offset + 2;
    const cnes = digits(source[indexes.cnes]).padStart(7, "0");
    const ine = digits(source[indexes.ine]).padStart(10, "0");
    const denominator = numberValue(source[indexes.denominator]);
    const pointsTotal = numberValue(source[indexes.points]);
    const componentValues = Object.fromEntries(COMPONENT_CODES.map((code) => [code, numberValue(source[indexes.components[code]])])) as Record<string, number | null>;
    const rowErrors: string[] = [];
    if (!/^\d{7}$/.test(cnes)) rowErrors.push("CNES inválido");
    if (!/^\d{10}$/.test(ine)) rowErrors.push("INE inválido");
    if (denominator === null || !Number.isInteger(denominator) || denominator < 0) rowErrors.push("denominador inválido");
    if (pointsTotal === null || pointsTotal < 0) rowErrors.push("pontos inválidos");
    if (Object.values(componentValues).some((value) => value === null || !Number.isInteger(value) || value < 0)) rowErrors.push("A–K devem ser contagens inteiras não negativas");
    if (rowErrors.length) {
      errors.push(`Linha ${fileRow}: ${rowErrors.join("; ")}.`);
      return;
    }
    const components = componentValues as C3Components;
    if (pointsFromComponents(components) !== pointsTotal) {
      warnings.push(`Linha ${fileRow}: pontos informados divergem do cálculo 10×A + 9×(B–K); o valor oficial da planilha será preservado.`);
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
      pointsTotal: pointsTotal as number,
      denominator: denominator as number,
      officialRatio: indexes.ratio >= 0 ? numberValue(source[indexes.ratio]) : null,
    });
  });

  const competency = detectCompetency(matrix, filename);
  if (!competency) warnings.push("Competência não detectada automaticamente; informe-a antes de publicar.");
  if (!rows.length && !errors.length) errors.push("Nenhum registro C3 válido foi encontrado.");
  return { competency, rows, errors, warnings, headerRow: headerIndex + 1 };
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
