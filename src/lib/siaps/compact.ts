import { z } from "zod";

const cellSchema = z.union([z.string().max(240), z.number().finite(), z.null()]);
export const compactRowsSchema = z.array(z.array(cellSchema).length(21)).max(10_000);

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function validateCompactSiapsRows(rows: z.infer<typeof compactRowsSchema>) {
  const fileRows = new Set<number>();
  const ines = new Set<string>();
  for (const row of rows) {
    const fileRow = row[0];
    const cnes = row[1];
    const ine = row[4];
    const components = row.slice(7, 18);
    const pointsTotal = row[18];
    const denominator = row[19];
    const officialRatio = row[20];

    if (!isInteger(fileRow) || fileRow <= 0 || fileRows.has(fileRow)) throw new Error("Linha SIAPS inválida ou duplicada.");
    if (typeof cnes !== "string" || !/^\d{7}$/.test(cnes)) throw new Error("CNES inválido.");
    if (typeof ine !== "string" || !/^\d{10}$/.test(ine) || ines.has(ine)) throw new Error("INE inválido ou duplicado.");
    if (!isInteger(denominator) || denominator < 0) throw new Error("Denominador inválido.");
    if (components.some((value) => !isInteger(value) || value < 0 || value > denominator)) throw new Error("Contagens A–K inválidas.");
    const numericComponents = components.map(Number);
    const expectedPoints = 10 * numericComponents[0]! + 9 * numericComponents.slice(1).reduce((sum, value) => sum + value, 0);
    if (typeof pointsTotal !== "number" || pointsTotal !== expectedPoints) throw new Error("Pontuação C3 divergente de A–K.");
    if (officialRatio !== null && (typeof officialRatio !== "number" || officialRatio < 0 || officialRatio > 100)) throw new Error("Razão oficial inválida.");
    fileRows.add(fileRow);
    ines.add(ine);
  }
  return rows;
}
