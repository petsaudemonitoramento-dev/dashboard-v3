/**
 * Descoberta estrutural SIAPS C3 v2: determinística, sem inferir dado clínico.
 * Colunas conhecidas são reconhecidas por aliases explícitos. Em caso de
 * ambiguidade entre abas/cabeçalhos/campos, a importação é bloqueada.
 */
import { COMPONENT_CODES } from "@/lib/siaps/parser-constants";

export const MAX_HEADER_SCAN_ROWS_V2 = 75;
export const MAX_IMPORT_SHEETS = 16;

export type RequiredKey = "cnes" | "ine" | "points" | "denominator" | (typeof COMPONENT_CODES)[number];
export type FieldKey = RequiredKey | "establishment" | "establishmentType" | "team" | "teamType" | "ratio";
export type ColumnIndexMap = Record<FieldKey, number>;

export type SheetScan = {
  sheetName: string;
  headerRow: number;
  indexes: ColumnIndexMap;
  unknownColumns: string[];
  duplicateFields: string[];
  missingFields: string[];
  headerSignature: string;
  nonEmptyRows: number;
};

const ALIASES: Record<Exclude<FieldKey, (typeof COMPONENT_CODES)[number]>, readonly string[]> = {
  cnes: ["CNES", "CODIGO CNES", "CODIGO DO CNES"],
  ine: ["INE", "CODIGO INE", "CODIGO DA EQUIPE INE"],
  establishment: ["ESTABELECIMENTO", "NOME DO ESTABELECIMENTO", "UNIDADE", "UBS"],
  establishmentType: ["TIPO ESTABELECIMENTO", "TIPO DE ESTABELECIMENTO"],
  team: ["EQUIPE", "NOME DA EQUIPE"],
  teamType: ["TIPO EQUIPE", "TIPO DE EQUIPE"],
  points: ["PONTOS TOTAL", "PONTUACAO TOTAL", "TOTAL DE PONTOS", "PONTOS"],
  denominator: ["DENOMINADOR", "POPULACAO ELEGIVEL"],
  ratio: ["RAZAO OFICIAL", "RESULTADO", "INDICADOR", "C3"],
};

const OPTIONAL: readonly FieldKey[] = ["establishment", "establishmentType", "team", "teamType", "ratio"];
const REQUIRED: readonly RequiredKey[] = ["cnes", "ine", "points", "denominator", ...COMPONENT_CODES];
const FIELDS: readonly FieldKey[] = [...REQUIRED, ...OPTIONAL];

export function normalizeHeader(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ").trim().toUpperCase();
}

function matches(key: FieldKey, header: string): boolean {
  if (!header) return false;
  if ((COMPONENT_CODES as readonly string[]).includes(key)) {
    // A–K isolados: prefixo "A ..." poderia casar com qualquer palavra.
    return header === key || header === `PRATICA ${key}` || header === `COMPONENTE ${key}`;
  }
  const aliases = ALIASES[key as keyof typeof ALIASES];
  return aliases.some(alias => header === alias || (
    header.startsWith(`${alias} `) && !["CNES", "INE", "PONTOS", "EQUIPE", "UNIDADE", "UBS", "C3", "INDICADOR", "RESULTADO"].includes(alias)
  ));
}

function scanHeader(sheetName: string, row: unknown[], headerRow: number, matrix: unknown[][]): SheetScan {
  const normalized = row.map(normalizeHeader);
  const indexes = {} as ColumnIndexMap;
  const duplicateFields: string[] = [];
  for (const key of FIELDS) {
    const candidates = normalized.flatMap((header, index) => matches(key, header) ? [index] : []);
    indexes[key] = candidates[0] ?? -1;
    if (candidates.length > 1) duplicateFields.push(key);
  }
  // O mesmo cabeçalho não pode ser interpretado como dois campos.
  const mapped = new Map<number, string[]>();
  for (const key of FIELDS) {
    if (indexes[key] < 0) continue;
    mapped.set(indexes[key], [...(mapped.get(indexes[key]) ?? []), key]);
  }
  for (const names of mapped.values()) if (names.length > 1) duplicateFields.push(names.join("/"));
  const unknownColumns = row.flatMap((value, index) =>
    normalized[index] && !mapped.has(index) ? [String(value).trim().slice(0, 120)] : []);
  const missingFields = REQUIRED.filter(key => indexes[key] < 0);
  const nonEmptyRows = matrix.slice(headerRow).filter(r => r.some(cell => String(cell ?? "").trim() !== "")).length;
  return {
    sheetName, headerRow, indexes,
    unknownColumns, duplicateFields: [...new Set(duplicateFields)], missingFields,
    // Não é hash de arquivo: serve somente como assinatura comparável do cabeçalho.
    headerSignature: normalized.join("|").slice(0, 4000),
    nonEmptyRows,
  };
}

export type DiscoveryResult = {
  selected: SheetScan | null;
  candidates: SheetScan[];
  errors: string[];
  warnings: string[];
};

export function discoverSiapsSchema(sheets: { name: string; matrix: unknown[][] }[]): DiscoveryResult {
  if (sheets.length > MAX_IMPORT_SHEETS) return { selected: null, candidates: [], errors: ["A planilha possui abas demais para inspeção segura."], warnings: [] };
  const candidates: SheetScan[] = [];
  for (const sheet of sheets) {
    const search = sheet.matrix.slice(0, MAX_HEADER_SCAN_ROWS_V2);
    for (let index = 0; index < search.length; index++) {
      const cells = search[index].map(normalizeHeader);
      if (!cells.some(x => matches("cnes", x)) || !cells.some(x => matches("ine", x))) continue;
      candidates.push(scanHeader(sheet.name, search[index], index + 1, sheet.matrix));
    }
  }
  if (!candidates.length) return { selected: null, candidates, errors: ["Cabeçalho C3 com CNES e INE não encontrado em nenhuma aba."], warnings: [] };
  const complete = candidates.filter(c => !c.missingFields.length && !c.duplicateFields.length && c.nonEmptyRows > 0);
  if (complete.length > 1) return { selected: null, candidates, errors: ["Existem múltiplas abas ou cabeçalhos C3 válidos. Selecione/exporte somente uma estrutura para evitar misturar dados."], warnings: [] };
  if (!complete.length) {
    const best = [...candidates].sort((a,b) => a.missingFields.length - b.missingFields.length)[0];
    return { selected: null, candidates, errors: [
      best.duplicateFields.length ? `Colunas ambíguas/repetidas: ${best.duplicateFields.join(", ")}.` : "",
      best.missingFields.length ? `Colunas obrigatórias ausentes: ${best.missingFields.join(", ")}.` : "",
      !best.nonEmptyRows ? "Nenhum registro de equipe encontrado após o cabeçalho." : "",
    ].filter(Boolean), warnings: [] };
  }
  const selected = complete[0];
  return { selected, candidates, errors: [], warnings: [
    ...(selected.unknownColumns.length ? [`Colunas não reconhecidas em "${selected.sheetName}": ${selected.unknownColumns.slice(0, 8).join(", ")}${selected.unknownColumns.length > 8 ? "…" : ""}. Os valores não serão usados sem homologação.`] : []),
    ...(sheets[0]?.name !== selected.sheetName ? [`Dados C3 encontrados na aba "${selected.sheetName}", não na primeira aba.`] : []),
  ] };
}
