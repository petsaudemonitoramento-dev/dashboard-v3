import { parseCsv } from "./csv";
import type { Matriz } from "./parse";
import { PecParseError } from "./parse";

/**
 * Fronteira com o leitor de planilhas.
 *
 * Toda a lógica de interpretação vive em `parse.ts`, sobre uma matriz. Este
 * adaptador é a única parte que conhece o formato do arquivo, o que mantém o
 * parser testável sem depender do SheetJS e concentra num único lugar as
 * opções de leitura que importam para segurança.
 */

export const PEC_UPLOAD_LIMITS = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  extensions: ["csv", "xlsx", "xls"] as const,
});

export type PecExtension = (typeof PEC_UPLOAD_LIMITS.extensions)[number];

export function extensionOf(filename: string): PecExtension {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if ((PEC_UPLOAD_LIMITS.extensions as readonly string[]).includes(ext)) {
    return ext as PecExtension;
  }
  throw new PecParseError(
    "EXTENSAO_NAO_SUPORTADA",
    "Envie um arquivo .csv, .xlsx ou .xls exportado do PEC.",
  );
}

/**
 * Verificação de assinatura do arquivo. Uma extensão pode mentir; os primeiros
 * bytes, não. XLSX é um contêiner ZIP (`PK\x03\x04`) e XLS é OLE/CFB.
 */
export function detectContainer(buffer: Buffer): "zip" | "cfb" | "text" {
  if (buffer.length >= 4) {
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return "zip";
    }
    if (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return "cfb";
    }
  }
  return "text";
}

export function assertContainerMatchesExtension(
  extension: PecExtension,
  container: "zip" | "cfb" | "text",
) {
  const expected: Record<PecExtension, ReadonlyArray<string>> = {
    csv: ["text"],
    xlsx: ["zip"],
    xls: ["cfb", "zip"],
  };
  if (!expected[extension].includes(container)) {
    throw new PecParseError(
      "CONTEUDO_INCOMPATIVEL",
      "O conteúdo do arquivo não corresponde à extensão informada.",
    );
  }
}

/**
 * Converte o arquivo enviado em matriz de células.
 *
 * `cellFormula: false` e `cellHTML: false` impedem que fórmulas ou HTML
 * embutidos sejam interpretados; nada da planilha é executado. `raw: false`
 * preserva os valores como texto formatado, o que evita perder zeros à
 * esquerda em códigos.
 */
export async function readPecFile(
  buffer: Buffer,
  filename: string,
): Promise<Matriz> {
  if (buffer.byteLength > PEC_UPLOAD_LIMITS.maxBytes) {
    throw new PecParseError(
      "ARQUIVO_MUITO_GRANDE",
      "O arquivo excede o limite de 10 MB.",
    );
  }

  const extension = extensionOf(filename);
  const container = detectContainer(buffer);
  assertContainerMatchesExtension(extension, container);

  if (extension === "csv") {
    return parseCsv(decodeText(buffer));
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    sheetStubs: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new PecParseError("PLANILHA_VAZIA", "A planilha está vazia.");
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: null,
    blankrows: true,
  }) as Matriz;
}

/**
 * CSV do PEC costuma vir em UTF-8, mas exportações antigas usam Latin-1.
 * A heurística é simples: se a decodificação UTF-8 produzir o caractere de
 * substituição, tenta-se Latin-1.
 */
function decodeText(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (utf8.includes("�")) {
    return buffer.toString("latin1");
  }
  return utf8;
}
