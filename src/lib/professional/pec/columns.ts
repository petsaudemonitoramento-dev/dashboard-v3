/**
 * Reconhecimento tolerante de colunas do PEC.
 *
 * A exportação do PEC varia entre versões e municípios, então o parser
 * reconhece o CONCEITO da coluna, não a sua posição. O que não é tolerado é
 * ambiguidade: se o cabeçalho não permite identificar o nome da paciente, a
 * importação falha em vez de adivinhar.
 */

export type PecField =
  | "displayName"
  | "birthDate"
  | "prenatalStartDate"
  | "dueDate"
  | "riskLevel"
  | "prenatalVisits";

/** Remove acentos, pontuação e espaços redundantes para comparar cabeçalhos. */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Sinônimos aceitos por campo, já normalizados. A ordem importa: o primeiro
 * sinônimo que casar por igualdade vence; só depois tenta-se por prefixo.
 */
const SYNONYMS: Record<PecField, string[]> = {
  displayName: [
    "nome",
    "nome completo",
    "nome da gestante",
    "nome do paciente",
    "gestante",
    "paciente",
    "nome cidadao",
    "cidadao",
  ],
  birthDate: [
    "data de nascimento",
    "data nascimento",
    "nascimento",
    "dn",
    "dt nascimento",
    "data nasc",
  ],
  prenatalStartDate: [
    "dum",
    "data da ultima menstruacao",
    "ultima menstruacao",
    "inicio do pre natal",
    "inicio pre natal",
    "data inicio pre natal",
  ],
  dueDate: [
    "dpp",
    "data provavel do parto",
    "provavel parto",
    "previsao do parto",
    "data prevista do parto",
  ],
  riskLevel: [
    "risco",
    "classificacao de risco",
    "risco gestacional",
    "classificacao risco",
    "estratificacao de risco",
  ],
  prenatalVisits: [
    "consultas",
    "numero de consultas",
    "n consultas",
    "qtd consultas",
    "quantidade de consultas",
    "consultas pre natal",
    "consultas de pre natal",
    "total de consultas",
  ],
};

export type ColumnMap = Partial<Record<PecField, number>>;

export type ColumnRecognition = {
  map: ColumnMap;
  /** Cabeçalhos que não corresponderam a nenhum campo conhecido. */
  unmapped: string[];
  /** Campos reconhecidos, para exibir no preview. */
  recognized: PecField[];
};

/**
 * Casa os cabeçalhos da planilha com os campos canônicos.
 *
 * Um mesmo campo nunca é atribuído duas vezes: a primeira coluna que casar
 * vence, e a segunda entra em `unmapped`. Isso evita que uma planilha com
 * "Nome" e "Nome social" sobrescreva silenciosamente o campo principal.
 */
export function recognizeColumns(headers: string[]): ColumnRecognition {
  const map: ColumnMap = {};
  const unmapped: string[] = [];

  const normalized = headers.map((h) => normalizeHeader(String(h ?? "")));

  for (const [field, synonyms] of Object.entries(SYNONYMS) as [
    PecField,
    string[],
  ][]) {
    const exact = normalized.findIndex(
      (header, index) =>
        header !== "" && synonyms.includes(header) && !isTaken(map, index),
    );
    if (exact >= 0) {
      map[field] = exact;
      continue;
    }

    const byPrefix = normalized.findIndex(
      (header, index) =>
        header !== "" &&
        !isTaken(map, index) &&
        synonyms.some(
          (synonym) =>
            header.startsWith(synonym + " ") || header === synonym,
        ),
    );
    if (byPrefix >= 0) {
      map[field] = byPrefix;
    }
  }

  normalized.forEach((header, index) => {
    if (header !== "" && !isTaken(map, index)) {
      unmapped.push(headers[index]);
    }
  });

  return {
    map,
    unmapped,
    recognized: Object.keys(map) as PecField[],
  };
}

function isTaken(map: ColumnMap, index: number) {
  return Object.values(map).includes(index);
}

export const REQUIRED_FIELDS: PecField[] = ["displayName"];

export const FIELD_LABEL: Record<PecField, string> = {
  displayName: "Nome da gestante",
  birthDate: "Data de nascimento",
  prenatalStartDate: "Início do pré-natal (DUM)",
  dueDate: "Data provável do parto",
  riskLevel: "Classificação de risco",
  prenatalVisits: "Consultas de pré-natal",
};
