import { performance } from "node:perf_hooks";

import * as XLSX from "xlsx";
import { afterAll, describe, expect, it } from "vitest";

import { compactRowsSchema, validateCompactSiapsRows } from "@/lib/siaps/compact";
import {
  MAX_SIAPS_REQUEST_BYTES,
  MAX_SIAPS_ROWS,
  MAX_SIAPS_XLSX_BYTES,
} from "@/lib/siaps/limits";
import { compactSiapsRow, parseSiapsWorkbook } from "@/lib/siaps/parser";

const VOLUME_CASES = [1_000, 5_000, 10_000] as const;
const COMPONENTS = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;
const POINTS_TOTAL = 110;
const DENOMINATOR = 3;
const TEST_TIMEOUT_MS = 120_000;

type VolumeMetric = {
  linhas: number;
  xlsxBytes: number;
  parseMs: number;
  validacaoMs: number;
  deltaHeapAproxBytes: number;
  jsonBytes: number;
};

const metrics: VolumeMetric[] = [];

function identifier(index: number, length: number) {
  return String(index + 1).padStart(length, "0");
}

function sourceRow(index: number) {
  return [
    identifier(index, 7),
    `UBS sintética ${index + 1}`,
    "UBS",
    identifier(index, 10),
    `Equipe sintética ${index + 1}`,
    "eSF",
    ...COMPONENTS,
    POINTS_TOTAL,
    DENOMINATOR,
    36.67,
  ];
}

function workbook(rowCount: number) {
  const header = [
    "CNES",
    "Estabelecimento",
    "Tipo estabelecimento",
    "INE",
    "Equipe",
    "Tipo equipe",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "Pontos total",
    "Denominador",
    "Razão oficial",
  ];
  const data = Array.from({ length: rowCount }, (_, index) => sourceRow(index));
  const sheet = XLSX.utils.aoa_to_sheet([["Competência 06/2026"], header, ...data]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "C3");
  return XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
}

function compactRow(index: number, multibyteText?: string) {
  return [
    index + 3,
    identifier(index, 7),
    multibyteText ?? `UBS sintética ${index + 1}`,
    "UBS",
    identifier(index, 10),
    multibyteText ?? `Equipe sintética ${index + 1}`,
    "eSF",
    ...COMPONENTS,
    POINTS_TOTAL,
    DENOMINATOR,
    36.67,
  ];
}

function importPayload(rows: unknown[]) {
  return {
    mode: "publish",
    filename: "volume-siaps-06-2026.xlsx",
    fileSha256: "a".repeat(64),
    competency: "2026-06-01",
    rows,
  };
}

function jsonBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

afterAll(() => {
  console.table(metrics);
});

describe("volume da importação SIAPS", () => {
  it.each(VOLUME_CASES)(
    "processa %i linhas válidas e mantém o payload típico dentro do limite",
    (rowCount) => {
      const buffer = workbook(rowCount);
      const heapBefore = process.memoryUsage().heapUsed;

      const parseStartedAt = performance.now();
      const parsed = parseSiapsWorkbook(buffer, `siaps-c3-06-2026-${rowCount}.xlsx`);
      const parseMs = performance.now() - parseStartedAt;

      const compactRows = parsed.rows.map(compactSiapsRow);
      const validationStartedAt = performance.now();
      const schemaRows = compactRowsSchema.parse(compactRows);
      const validatedRows = validateCompactSiapsRows(schemaRows);
      const validationMs = performance.now() - validationStartedAt;

      const payloadBytes = jsonBytes(importPayload(validatedRows));
      const heapAfter = process.memoryUsage().heapUsed;
      metrics.push({
        linhas: rowCount,
        xlsxBytes: buffer.byteLength,
        parseMs: Number(parseMs.toFixed(2)),
        validacaoMs: Number(validationMs.toFixed(2)),
        deltaHeapAproxBytes: heapAfter - heapBefore,
        jsonBytes: payloadBytes,
      });

      expect(buffer.byteLength).toBeLessThanOrEqual(MAX_SIAPS_XLSX_BYTES);
      expect(parsed.errors).toEqual([]);
      expect(parsed.warnings).toEqual([]);
      expect(parsed.rows).toHaveLength(rowCount);
      expect(validatedRows).toHaveLength(rowCount);
      expect(payloadBytes).toBeLessThan(MAX_SIAPS_REQUEST_BYTES);
    },
    TEST_TIMEOUT_MS,
  );

  it("rejeita explicitamente 10.001 linhas no parser e na validação compacta", () => {
    const parsed = parseSiapsWorkbook(workbook(MAX_SIAPS_ROWS + 1), "siaps-c3-06-2026-10001.xlsx");
    const rows = Array.from({ length: MAX_SIAPS_ROWS + 1 }, (_, index) => compactRow(index));
    const result = compactRowsSchema.safeParse(rows);

    expect(parsed.rows).toEqual([]);
    expect(parsed.errors).toContain("A planilha excede o limite de 10.000 linhas de dados.");
    expect(rows).toHaveLength(10_001);
    expect(result.success).toBe(false);
  }, TEST_TIMEOUT_MS);

  it("detecta payload multibyte acima de 4 MiB mesmo com até 10.000 linhas", () => {
    const multibyteText = "á".repeat(240);
    const rows = Array.from({ length: MAX_SIAPS_ROWS }, (_, index) => compactRow(index, multibyteText));
    const schemaRows = compactRowsSchema.parse(rows);
    const validatedRows = validateCompactSiapsRows(schemaRows);
    const payloadBytes = jsonBytes(importPayload(validatedRows));

    expect(Buffer.byteLength(multibyteText, "utf8")).toBeGreaterThan(multibyteText.length);
    expect(validatedRows).toHaveLength(MAX_SIAPS_ROWS);
    expect(validatedRows.length).toBeLessThanOrEqual(MAX_SIAPS_ROWS);
    expect(payloadBytes).toBeGreaterThan(MAX_SIAPS_REQUEST_BYTES);
  });
});
