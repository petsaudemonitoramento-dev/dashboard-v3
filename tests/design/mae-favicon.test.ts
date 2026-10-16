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

  it("usa a marca oficial integral, roxa e clicável nos cabeçalhos após o login", () => {
    const headerLogo = readFileSync(join(assets, "mae-aps-cabecalho-oficial.svg"), "utf8");
    expect(headerLogo).toContain('viewBox="157 220 1610 635"');
    expect(headerLogo).toContain("fill: #280063");
    expect(headerLogo).toContain("<path");
    expect(headerLogo).not.toContain("<image");
    expect(headerLogo).not.toContain("data:image");
    const management = readFileSync(join(process.cwd(), "src/components/layout/management-shell.tsx"), "utf8");
    const administration = readFileSync(join(process.cwd(), "src/app/(sistema)/sistema/layout.tsx"), "utf8");
    expect(management).toContain("/brands/mae-aps-cabecalho-oficial.svg");
    expect(management).toContain("management-brand-wordmark");
    expect(management).toContain("management-brand-module");
    expect(management).toContain("onClick={returnToStart}");
    expect(management).toContain('window.scrollTo({ top: 0, behavior: "smooth" })');
    expect(management).toContain("Módulo da Gestão");
    // Administração reutiliza o mesmo cabeçalho, sem duplicar a marca.
    expect(administration).toContain('import { ManagementShell }');
    expect(administration).toContain('<ManagementShell email={profile.email} role={profile.role} userId={user.id}');
    expect(management).not.toContain("/brands/mae-aps-wordmark.webp");
    expect(administration).not.toContain('className="brand-mark">MAE');
  });

  it("fornece um favicon.ico com entradas para navegadores legados", () => {
    const ico = readFileSync(join(root, "favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
});
