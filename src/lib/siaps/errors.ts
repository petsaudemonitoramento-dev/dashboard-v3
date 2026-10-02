export const SIAPS_XLSX_TOO_LARGE_MESSAGE = "O arquivo XLSX excede o limite de 10 MiB.";
export const SIAPS_ROW_LIMIT_MESSAGE = "A planilha excede o limite de 10.000 linhas de dados.";
export const SIAPS_REQUEST_TOO_LARGE_MESSAGE =
  "Os dados preparados para envio excedem o limite seguro de 4 MiB. Reduza a quantidade de registros ou o conteúdo textual da planilha.";

export class SiapsDomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiapsDomainValidationError";
  }
}

function responseError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  const error = payload.error;
  return typeof error === "string" && error.trim() ? error : null;
}

/** Reads JSON when available while keeping platform-generated non-JSON errors safe. */
export async function readImportApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let payload: unknown;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    if (response.status === 413) throw new Error(SIAPS_REQUEST_TOO_LARGE_MESSAGE);
    throw new Error(responseError(payload) ?? fallbackMessage);
  }

  if (payload === undefined) throw new Error(fallbackMessage);
  return payload as T;
}
