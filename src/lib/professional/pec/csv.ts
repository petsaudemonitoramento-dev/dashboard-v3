/**
 * Leitor de CSV sem dependência externa.
 *
 * Exportações brasileiras costumam usar `;` como separador e vir em Latin-1
 * ou UTF-8 com BOM. O delimitador é detectado a partir da primeira linha, e o
 * BOM é removido para não contaminar o primeiro cabeçalho.
 */

import type { Matriz } from "./parse";

const DELIMITERS = [";", ",", "\t"] as const;

export function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  let best = ";";
  let bestCount = -1;
  for (const delimiter of DELIMITERS) {
    const count = countOutsideQuotes(firstLine, delimiter);
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, delimiter: string) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }
  return count;
}

export function parseCsv(content: string, delimiter?: string): Matriz {
  const text = content.replace(/^\ufeff/, "");
  const sep = delimiter ?? detectDelimiter(text);

  const rows: Matriz = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === sep) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
