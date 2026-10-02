const MEBIBYTE = 1024 * 1024;

/** Maximum size of the source XLSX accepted by the browser parser. */
export const MAX_SIAPS_XLSX_BYTES = 10 * MEBIBYTE;

/** Maximum number of non-empty data rows accepted from one SIAPS workbook. */
export const MAX_SIAPS_ROWS = 10_000;

/**
 * Kept below Vercel's 4.5 MB request limit so headers/platform overhead do not
 * turn an otherwise valid client request into an opaque platform rejection.
 */
export const MAX_SIAPS_REQUEST_BYTES = 4 * MEBIBYTE;

export function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
