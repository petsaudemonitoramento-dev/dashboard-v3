import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";

test("legendas pós-login maiores sem alterar estrutura dos seis KPIs nem filtros", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 850 });
  await signIn(page, "gestao");

  const shell = page.locator(".management-shell");
  const nav = shell.locator(".management-sidebar");
  const cards = shell.locator(".dashboard-kpi");
  await expect(cards).toHaveCount(6);
  await expect(shell.locator(".management-footer")).toContainText("MAE APS · PET Saúde UFCG · v1.3.0");
  await expect(nav.locator("nav a").first()).toHaveCSS("font-size", "16.64px");
  await expect(shell.locator(".dashboard-kpi-title").first()).toHaveCSS("font-size", "15.04px");
  await expect(shell.locator(".dashboard-kpi-description").first()).toHaveCSS("font-size", "14.72px");
  await expect(shell.locator('select[name="inicio"]')).toHaveCSS("font-size", "16px");

  const before = await cards.locator(".dashboard-kpi-value").allTextContents();
  const gridColumns = await shell.locator(".dashboard-kpi-grid")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(gridColumns).toBe(3); // Menu aberto: mesmo breakpoint/container de antes

  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  const after = await cards.locator(".dashboard-kpi-value").allTextContents();
  expect(after).toEqual(before);
  await expect.poll(() => shell.locator(".management-main").evaluate((el) => el.getBoundingClientRect().left)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Abrir menu lateral" }).click();
  await expect.poll(() => shell.locator(".management-main").evaluate((el) => el.getBoundingClientRect().left)).toBeGreaterThan(190);
});

test("tipografia não causa corte de KPIs ou rolagem horizontal em desktop e celular", async ({ page }) => {
  for (const width of [1024, 1366, 1920, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await signIn(page, "gestao");
    await expect(page.locator(".dashboard-kpi")).toHaveCount(6);
    const result = await page.evaluate(() => {
      const main = document.querySelector(".management-main")!.getBoundingClientRect();
      const cards = [...document.querySelectorAll<HTMLElement>(".dashboard-kpi")];
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cardErrors: cards.flatMap((el, i) => {
          const b = el.getBoundingClientRect();
          // A tooltip absoluta é maior que o card, mas não é texto visível.\n          const title = el.querySelector<HTMLElement>(".dashboard-kpi-title > span")!;
          const number = el.querySelector<HTMLElement>(".dashboard-kpi-value")!;
          if (b.width > 110 && b.right <= main.right + 1 &&
            title.scrollWidth <= title.clientWidth + 1 &&
            number.scrollWidth <= number.clientWidth + 1) return [];
          return [{ index: i, cardWidth: b.width, cardRight: b.right,
            mainRight: main.right, titleWidth: title.clientWidth,
            titleContent: title.scrollWidth, valueWidth: number.clientWidth,
            valueContent: number.scrollWidth, value: number.innerText }];
        }),
      };
    });
    expect(result.overflow, `largura ${width}`).toBeLessThanOrEqual(1);
    expect(result.cardErrors, `largura ${width}: ${JSON.stringify(result.cardErrors)}`).toEqual([]);
  }
});

test("atalho de acessibilidade é preservado no site mas eliminado do PDF impresso", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 850 });
  await signIn(page, "gestao");
  const skip = page.locator(".management-shell > .skip-link");
  await expect(skip).toHaveCount(1);
  await expect(skip).toHaveText("Pular para o conteúdo");
  // Ainda é funcional para usuários que utilizam teclado/leitor de tela.
  await expect(skip).not.toHaveCSS("display", "none");

  // A página renderizada para impressão contém apenas o documento:
  // nenhuma caixa/flutuante do atalho é incorporada ao PDF.
  await page.emulateMedia({ media: "print" });
  await expect(skip).toHaveCSS("display", "none");
  await expect(skip).toBeHidden();
  await expect(page.locator(".management-print-report .management-report-document")).toBeVisible();
  // Mesmos valores da pré-visualização, agora com tamanho legível em A4.
  const report = page.locator(".management-print-report .management-report-document");
  const reportFont = await report.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(reportFont).toBeGreaterThan(14.5); // ≥ 11 pt

  const cellFontSizes = await report.evaluate((el) => {
    const th = el.querySelector("th");
    const td = el.querySelector("td");
    return { th: th ? parseFloat(getComputedStyle(th).fontSize) : 0,
      td: td ? parseFloat(getComputedStyle(td).fontSize) : 0 };
  });
  expect(cellFontSizes.th).toBeGreaterThan(12);
  expect(cellFontSizes.td).toBeGreaterThan(12);
  const geometry = await report.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    overflow: el.scrollWidth - el.clientWidth,
    tables: Array.from(el.querySelectorAll<HTMLTableElement>("table")).every((table) =>
      table.getBoundingClientRect().width <= el.getBoundingClientRect().width + 1),
  }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.tables).toBe(true);

  await expect(page.locator(".management-topbar")).toBeHidden();

  await page.emulateMedia({ media: "screen" });
  await expect(skip).not.toHaveCSS("display", "none");
});
