import type { Matriz } from "./parse";
import { SiapsParseError } from "./parse";

/**
 * Fronteira com o leitor de planilhas do SIAPS.
 *
 * Nesta versão aceita apenas XLSX, conforme o contrato: é o layout real que
 * pode ser testado hoje, e ampliar a superfície do parser sem necessidade é
 * risco de segurança gratuito.
 */

export const SIAPS_UPLOAD_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
});

/** XLSX é um contêiner ZIP; a extensão sozinha pode mentir, os bytes não. */
export function isZipContainer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

export async function readSiapsFile(
  buffer: Buffer,
  filename: string,
): Promise<Matriz> {
  if (buffer.byteLength > SIAPS_UPLOAD_LIMITS.maxBytes) {
    throw new SiapsParseError(
      "ARQUIVO_MUITO_GRANDE",
      "O arquivo excede o limite de 25 MB.",
    );
  }

  if (!filename.toLowerCase().endsWith(".xlsx")) {
    throw new SiapsParseError(
      "EXTENSAO_NAO_SUPORTADA",
      "Envie o relatório em XLSX, como exportado pelo SIAPS.",
    );
  }

  if (!isZipContainer(buffer)) {
    throw new SiapsParseError(
      "CONTEUDO_INCOMPATIVEL",
      "O conteúdo do arquivo não corresponde a um XLSX.",
    );
  }

  const XLSX = await import("xlsx");
  // Nenhuma fórmula ou HTML é interpretado; `raw: false` preserva os zeros à
  // esquerda de CNES e INE e a vírgula decimal da razão.
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    sheetStubs: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new SiapsParseError("PLANILHA_VAZIA", "A planilha está vazia.");
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: null,
    blankrows: true,
  }) as Matriz;
}
