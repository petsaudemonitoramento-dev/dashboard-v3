/**
 * Parser do relatório SIAPS "Qualidade — Visão por Competência".
 *
 * Derivado do layout real das exportações do município 250400. Opera sobre uma
 * matriz de células já extraída, o que mantém a interpretação testável sem
 * depender do leitor de XLSX.
 *
 * O reconhecimento é obrigatório e explícito: o parser recusa o arquivo se ele
 * não for comprovadamente SIAPS / Relatório Qualidade / Visão por Competência /
 * indicador C3 / município configurado / competência válida. Mapeamento
 * silencioso quando o layout muda é justamente o que o contrato proíbe.
 */

export const SIAPS_PARSER_VERSION = "siaps-visao-competencia@1.0.0";

/** Município da série inicial. */
export const MUNICIPALITY_IBGE = "250400";

/** Início da série oficial da V3. */
export const SERIES_START = "2026-01-01";

export type Celula = string | number | null | undefined;
export type Matriz = Celula[][];

export class SiapsParseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SiapsParseError";
  }
}

export type SiapsMetadata = {
  reportTitle: string;
  indicator: string;
  competency: string;
  competencyLabel: string;
  municipalityIbge: string;
  municipalityName: string;
  uf: string;
  generatedAt: string | null;
  sourceStatus: "preliminar" | "definitivo" | null;
  teamTypeFilter: string | null;
  teamConditionFilter: string | null;
  scopeSignature: string;
  rawFilters: Record<string, string>;
};

export type SiapsRow = {
  fileRow: number;
  cnes: string;
  establishmentName: string;
  establishmentType: string;
  ine: string;
  teamName: string;
  teamType: string;
  practices: number[];
  pointsTotal: number;
  denominator: number;
  ratioText: string | null;
};

export type SiapsIssue = { fileRow: number; message: string };

export type SiapsParseResult = {
  metadata: SiapsMetadata;
  rows: SiapsRow[];
  issues: SiapsIssue[];
  checksumFailures: number;
  parserVersion: string;
};

const PRACTICE_COUNT = 11;
const FIRST_PRACTICE_COLUMN = 6;
const COLUMN_POINTS = 17;
const COLUMN_DENOMINATOR = 18;
const COLUMN_RATIO = 19;

const MONTHS: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};

/** Peso oficial: a captação precoce vale 10, as demais 9. Total 100. */
export function practiceWeight(index: number): number {
  return index === 0 ? 10 : 9;
}

export const PRACTICE_CODES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
] as const;

function text(value: Celula): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Inteiro estrito. Diferente do PEC, aqui `null` também é erro nas colunas
 * obrigatórias: um denominador ausente convertido em zero produziria um
 * indicador oficial silenciosamente errado.
 */
export function strictInteger(value: Celula): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const raw = String(value).trim();
  if (raw === "" || !/^\d+$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

/** Decimal em formato pt-BR: a razão do SIAPS vem como texto com vírgula. */
export function decimalPtBr(value: Celula): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (raw === "") return null;
  const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

/** "JUN/26" → "2026-06-01". */
export function competencyToIso(label: string): string | null {
  const match = label.trim().toUpperCase().match(/^([A-Z]{3})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  if (!month) return null;
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function generatedAtToIso(raw: string): string | null {
  const months: Record<string, number> = {
    janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };
  const match = raw
    .trim()
    .toLowerCase()
    .match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const month = months[match[2]];
  if (!month) return null;
  const date = new Date(
    Date.UTC(
      Number(match[3]),
      month - 1,
      Number(match[1]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
    ),
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** O cabeçalho de dados é localizado por conteúdo, nunca por índice fixo. */
export function findHeaderRow(matriz: Matriz): number {
  const limit = Math.min(matriz.length, 100);
  for (let i = 0; i < limit; i += 1) {
    if (text(matriz[i]?.[0]).toUpperCase() === "CNES") return i;
  }
  throw new SiapsParseError(
    "CABECALHO_NAO_ENCONTRADO",
    "Não foi possível localizar o cabeçalho de dados do relatório.",
  );
}

export function extractMetadata(
  matriz: Matriz,
  headerRow: number,
): SiapsMetadata {
  const filters: Record<string, string> = {};
  let reportTitle = "";
  let generatedAt: string | null = null;
  let sourceStatus: SiapsMetadata["sourceStatus"] = null;

  for (let i = 0; i < headerRow; i += 1) {
    const line = text(matriz[i]?.[0]);
    if (!line) continue;

    if (line.toLowerCase().startsWith("relatório")) {
      reportTitle = line;
      continue;
    }
    if (/^dado preliminar$/i.test(line)) {
      sourceStatus = "preliminar";
      continue;
    }
    if (/^dado (definitivo|final)$/i.test(line)) {
      sourceStatus = "definitivo";
      continue;
    }
    if (/^dado gerado em\s*:/i.test(line)) {
      generatedAt = generatedAtToIso(line.split(":").slice(1).join(":"));
      continue;
    }

    const separator = line.indexOf(":");
    if (separator > 0) {
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      if (key && value) filters[key] = value;
    }
  }

  const reportLower = reportTitle.toLowerCase();
  if (!reportLower.includes("visão por competência")) {
    throw new SiapsParseError(
      "RELATORIO_NAO_SUPORTADO",
      "Envie o relatório Qualidade — Visão por Competência. Visão por Equipe e Visão por Indicador não são fontes de ingestão.",
    );
  }

  const indicator = filters["Indicador"] ?? "";
  if (!indicator.toLowerCase().includes("gestação")) {
    throw new SiapsParseError(
      "INDICADOR_NAO_SUPORTADO",
      "Esta versão importa apenas o indicador Cuidado na Gestação e Puerpério.",
    );
  }

  const competencyLabel = filters["Competência selecionada"] ?? "";
  const competency = competencyToIso(competencyLabel);
  if (!competency) {
    throw new SiapsParseError(
      "COMPETENCIA_NAO_IDENTIFICADA",
      "Não foi possível identificar a competência do relatório.",
    );
  }
  if (competency < SERIES_START) {
    throw new SiapsParseError(
      "COMPETENCIA_FORA_DA_SERIE",
      "A série oficial começa em JAN/2026. Competências anteriores não compõem esta série.",
    );
  }

  const municipality = filters["Município"] ?? "";
  const [ibge, name] = municipality.split("/").map((part) => part.trim());
  if (ibge !== MUNICIPALITY_IBGE) {
    throw new SiapsParseError(
      "MUNICIPIO_NAO_SUPORTADO",
      `Esta instalação aceita apenas o município ${MUNICIPALITY_IBGE}.`,
    );
  }

  const teamTypeFilter = filters["Tipo de Equipe"] ?? null;
  const teamConditionFilter = filters["Condição das Equipes"] ?? null;

  return {
    reportTitle,
    indicator,
    competency,
    competencyLabel,
    municipalityIbge: ibge,
    municipalityName: name ?? "",
    uf: filters["UF"] ?? "",
    generatedAt,
    sourceStatus,
    teamTypeFilter,
    teamConditionFilter,
    // Normalizada para que "eAP, eSF" e "eSF, eAP" sejam o mesmo escopo.
    scopeSignature: buildScopeSignature(teamTypeFilter, teamConditionFilter),
    rawFilters: filters,
  };
}

export function buildScopeSignature(
  teamType: string | null,
  condition: string | null,
): string {
  const types = (teamType ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");
  return `tipos=${types}|condicao=${(condition ?? "").trim().toLowerCase()}`;
}

function isFooter(value: string) {
  return /^fonte\s*:/i.test(value);
}

export function parseSiapsMatrix(matriz: Matriz): SiapsParseResult {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    throw new SiapsParseError("PLANILHA_VAZIA", "A planilha está vazia.");
  }

  const headerRow = findHeaderRow(matriz);
  const metadata = extractMetadata(matriz, headerRow);

  const rows: SiapsRow[] = [];
  const issues: SiapsIssue[] = [];
  const seenIne = new Map<string, number>();
  let checksumFailures = 0;

  for (let i = headerRow + 1; i < matriz.length; i += 1) {
    const raw = matriz[i] ?? [];
    const fileRow = i + 1;
    const first = text(raw[0]);

    if (isFooter(first)) break;
    if (first === "") continue;

    const cnes = first;
    const ine = text(raw[3]);

    if (!/^\d{7}$/.test(cnes)) {
      issues.push({ fileRow, message: `CNES "${cnes}" fora do formato de 7 dígitos.` });
      continue;
    }
    if (!/^\d{10}$/.test(ine)) {
      issues.push({
        fileRow,
        message: `INE "${ine}" fora do formato de 10 dígitos; verifique se os zeros à esquerda foram preservados.`,
      });
      continue;
    }

    const duplicate = seenIne.get(ine);
    if (duplicate !== undefined) {
      issues.push({
        fileRow,
        message: `INE ${ine} já aparece na linha ${duplicate}. Cada equipe deve aparecer uma vez por competência.`,
      });
      continue;
    }

    const practices: number[] = [];
    let invalid = false;
    for (let p = 0; p < PRACTICE_COUNT; p += 1) {
      const value = strictInteger(raw[FIRST_PRACTICE_COLUMN + p]);
      if (value === null) {
        issues.push({
          fileRow,
          message: `Valor não numérico na boa prática ${PRACTICE_CODES[p]}.`,
        });
        invalid = true;
        break;
      }
      practices.push(value);
    }
    if (invalid) continue;

    const pointsTotal = strictInteger(raw[COLUMN_POINTS]);
    const denominator = strictInteger(raw[COLUMN_DENOMINATOR]);

    if (pointsTotal === null) {
      issues.push({ fileRow, message: "Somatório de pontos ausente ou não numérico." });
      continue;
    }
    if (denominator === null) {
      issues.push({ fileRow, message: "Denominador ausente ou não numérico." });
      continue;
    }

    // Checksum: a soma ponderada precisa reproduzir os pontos declarados.
    const expected = practices.reduce(
      (total, value, index) => total + value * practiceWeight(index),
      0,
    );
    if (expected !== pointsTotal) {
      checksumFailures += 1;
      issues.push({
        fileRow,
        message: `Soma ponderada resulta ${expected}, mas o arquivo declara ${pointsTotal}.`,
      });
    }

    seenIne.set(ine, fileRow);
    rows.push({
      fileRow,
      cnes,
      establishmentName: text(raw[1]),
      establishmentType: text(raw[2]),
      ine,
      teamName: text(raw[4]),
      teamType: text(raw[5]),
      practices,
      pointsTotal,
      denominator,
      ratioText: text(raw[COLUMN_RATIO]) || null,
    });
  }

  if (rows.length === 0) {
    throw new SiapsParseError(
      "NENHUMA_LINHA_VALIDA",
      "Nenhuma linha de equipe válida foi encontrada no relatório.",
    );
  }

  return {
    metadata,
    rows,
    issues,
    checksumFailures,
    parserVersion: SIAPS_PARSER_VERSION,
  };
}

/** Recomposição aditiva. Nunca média simples dos percentuais das equipes. */
export function recomposeC3(
  rows: { pointsTotal: number; denominator: number }[],
): number | null {
  const points = rows.reduce((total, row) => total + row.pointsTotal, 0);
  const denominator = rows.reduce((total, row) => total + row.denominator, 0);
  return denominator > 0 ? points / denominator : null;
}

export function classifyC3(ratio: number | null): string | null {
  if (ratio === null) return null;
  if (ratio > 75) return "Ótimo";
  if (ratio > 50) return "Bom";
  if (ratio > 25) return "Suficiente";
  return "Regular";
}
