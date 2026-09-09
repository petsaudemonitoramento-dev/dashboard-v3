/**
 * Conversão da planilha PEC para o modelo canônico do módulo Profissional.
 *
 * Opera sobre uma matriz de células já extraída, de propósito: mantém a lógica
 * testável sem depender do leitor de XLSX e permite que a extração aconteça
 * isolada no servidor.
 *
 * Validação é estrita. Valor inválido vira erro da linha, nunca zero ou nulo
 * por conveniência — um denominador silenciosamente zerado é pior que uma
 * importação recusada.
 */

import {
  REQUIRED_FIELDS,
  recognizeColumns,
  type ColumnMap,
  type ColumnRecognition,
  type PecField,
} from "./columns";

export const PEC_PARSER_VERSION = "pec-planilha@1.0.0";

export type Celula = string | number | null | undefined;
export type Matriz = Celula[][];

export type PecRow = {
  rowNumber: number;
  displayName: string;
  birthDate: string | null;
  prenatalStartDate: string | null;
  dueDate: string | null;
  riskLevel: "habitual" | "alto" | null;
  prenatalVisits: number | null;
  /** Nulo quando não há data de nascimento: sem ela não há desduplicação segura. */
  dedupKey: string | null;
};

export type PecIssue = {
  rowNumber: number;
  field?: PecField;
  message: string;
};

export type PecParseResult = {
  recognition: ColumnRecognition;
  headerRow: number;
  rows: PecRow[];
  issues: PecIssue[];
  duplicatesInFile: number;
  parserVersion: string;
};

export class PecParseError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PecParseError";
  }
}

const MAX_ROWS = 20_000;

function text(value: Celula): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Normaliza o nome para desduplicação. Não é usado para exibição: o nome
 * mostrado é sempre o que veio do PEC.
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Datas do PEC chegam em dd/mm/aaaa, aaaa-mm-dd ou como número de série do
 * Excel. Qualquer outra coisa é erro explícito.
 */
export function parseDate(value: Celula): { iso: string } | { error: string } {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { iso: "" };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Série do Excel: dias desde 1899-12-30.
    if (value < 1 || value > 80_000) {
      return { error: "data fora de faixa plausível" };
    }
    const base = Date.UTC(1899, 11, 30);
    const date = new Date(base + Math.trunc(value) * 86_400_000);
    return { iso: date.toISOString().slice(0, 10) };
  }

  const raw = String(value).trim();

  const br = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (br) {
    return buildDate(Number(br[3]), Number(br[2]), Number(br[1]));
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return { error: "formato de data não reconhecido" };
}

function buildDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: "data inválida" };
  }
  if (year < 1900 || year > 2200) {
    return { error: "ano fora de faixa plausível" };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { error: "data inexistente no calendário" };
  }
  return { iso: date.toISOString().slice(0, 10) };
}

/**
 * Inteiro estrito. `"12abc"` é erro, não 12 — é exatamente o caso que o
 * contrato proíbe converter silenciosamente.
 */
export function parseStrictInteger(
  value: Celula,
): { value: number | null } | { error: string } {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { value: null };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0
      ? { value }
      : { error: "número inválido" };
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    return { error: "número inválido" };
  }
  return { value: Number.parseInt(raw, 10) };
}

export function parseRisk(value: Celula): "habitual" | "alto" | null {
  const raw = normalizeName(text(value));
  if (raw === "") return null;
  if (raw.includes("alto")) return "alto";
  if (raw.includes("habitual") || raw.includes("baixo") || raw.includes("usual")) {
    return "habitual";
  }
  return null;
}

/** Localiza o cabeçalho: a primeira linha que reconhece os campos obrigatórios. */
export function findHeaderRow(matriz: Matriz): number {
  const limit = Math.min(matriz.length, 50);
  for (let i = 0; i < limit; i += 1) {
    const headers = (matriz[i] ?? []).map((c) => text(c));
    if (headers.filter(Boolean).length < 2) continue;
    const { map } = recognizeColumns(headers);
    if (REQUIRED_FIELDS.every((field) => map[field] !== undefined)) {
      return i;
    }
  }
  throw new PecParseError(
    "CABECALHO_NAO_RECONHECIDO",
    "Não foi possível identificar a coluna com o nome da gestante.",
  );
}

export function parsePecMatrix(matriz: Matriz): PecParseResult {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    throw new PecParseError("PLANILHA_VAZIA", "A planilha está vazia.");
  }
  if (matriz.length > MAX_ROWS) {
    throw new PecParseError(
      "EXCEDE_LIMITE",
      `A planilha excede o limite de ${MAX_ROWS} linhas.`,
    );
  }

  const headerRow = findHeaderRow(matriz);
  const recognition = recognizeColumns(
    (matriz[headerRow] ?? []).map((c) => text(c)),
  );

  const rows: PecRow[] = [];
  const issues: PecIssue[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;

  for (let i = headerRow + 1; i < matriz.length; i += 1) {
    const raw = matriz[i] ?? [];
    const rowNumber = i + 1;

    const displayName = text(cell(raw, recognition.map, "displayName"));
    if (displayName === "") {
      // Linha sem nome é linha vazia ou rodapé: ignorada em silêncio.
      if (raw.every((c) => text(c) === "")) continue;
      issues.push({
        rowNumber,
        field: "displayName",
        message: "Linha sem nome da gestante.",
      });
      continue;
    }

    const parsed = parseRow(raw, recognition.map, rowNumber, displayName, issues);
    if (!parsed) continue;

    if (parsed.dedupKey) {
      if (seen.has(parsed.dedupKey)) {
        duplicatesInFile += 1;
        issues.push({
          rowNumber,
          message: `"${displayName}" aparece mais de uma vez no arquivo; a primeira ocorrência prevalece.`,
        });
        continue;
      }
      seen.add(parsed.dedupKey);
    } else {
      issues.push({
        rowNumber,
        field: "birthDate",
        message: `"${displayName}" não tem data de nascimento: será sempre criada como novo registro.`,
      });
    }

    rows.push(parsed);
  }

  return {
    recognition,
    headerRow: headerRow + 1,
    rows,
    issues,
    duplicatesInFile,
    parserVersion: PEC_PARSER_VERSION,
  };
}

function cell(row: Celula[], map: ColumnMap, field: PecField): Celula {
  const index = map[field];
  return index === undefined ? null : row[index];
}

function parseRow(
  raw: Celula[],
  map: ColumnMap,
  rowNumber: number,
  displayName: string,
  issues: PecIssue[],
): PecRow | null {
  const dates: Record<string, string | null> = {};
  for (const field of [
    "birthDate",
    "prenatalStartDate",
    "dueDate",
  ] as const) {
    const result = parseDate(cell(raw, map, field));
    if ("error" in result) {
      issues.push({ rowNumber, field, message: `${result.error}.` });
      return null;
    }
    dates[field] = result.iso === "" ? null : result.iso;
  }

  const visits = parseStrictInteger(cell(raw, map, "prenatalVisits"));
  if ("error" in visits) {
    issues.push({
      rowNumber,
      field: "prenatalVisits",
      message: `${visits.error}.`,
    });
    return null;
  }

  const birthDate = dates.birthDate;

  return {
    rowNumber,
    displayName,
    birthDate,
    prenatalStartDate: dates.prenatalStartDate,
    dueDate: dates.dueDate,
    riskLevel: parseRisk(cell(raw, map, "riskLevel")),
    prenatalVisits: visits.value,
    dedupKey: birthDate ? `${normalizeName(displayName)}|${birthDate}` : null,
  };
}
