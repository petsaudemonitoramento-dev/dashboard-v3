import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "public");
const assets = join(root, "brands");

describe("Ícones MAE APS — Prancheta 30_4", () => {
  it("mantém o símbolo vetorial legível, recortado e sem imagem em base64", () => {
    const source = readFileSync(join(assets, "mae-aps-favicon.svg"), "utf8");
    expect(source).toContain('viewBox="0 0 820 820"');
    expect(source).toContain('fill="#280063"');
    expect(source).toContain('fill="#F9F3EF"');
    expect(source).toContain('transform="translate(-550 -130)"');
    expect(source).toContain("<path");
    expect(source).not.toContain("<image");
    expect(source).not.toContain("data:image");
    expect(Buffer.byteLength(source, "utf8")).toBeLessThan(4_000);
  });

  it.each([
    ["mae-aps-favicon-16x16.png", 16],
    ["mae-aps-favicon-32x32.png", 32],
    ["mae-aps-favicon-48x48.png", 48],
    ["mae-aps-apple-touch-icon.png", 180],
    ["mae-aps-android-icon-192.png", 192],
    ["mae-aps-android-icon-512.png", 512],
  ])("%s é uma imagem PNG real %ix%i", (filename, size) => {
    const img = readFileSync(join(assets, filename));
    expect(img.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(img.readUInt32BE(16)).toBe(size);
    expect(img.readUInt32BE(20)).toBe(size);
  });

  it("fornece um favicon.ico com entradas para navegadores legados", () => {
    const ico = readFileSync(join(root, "favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
});
