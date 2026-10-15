import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";

test("Gestão navega pelos módulos existentes com a identidade unificada", async ({ page }) => {
  await signIn(page, "gestao");
  await expect(page.locator(".management-shell")).toBeVisible();
  await expect(page.locator(".management-topbar")).toBeVisible();
  await expect(page.locator(".management-sidebar")).toBeVisible();
  await expect(page.locator(".management-main")).toBeVisible();

  const expected = [
    ["Indicadores", "/sistema/gestao/indicadores", "Indicadores"],
    ["UBS e equipes", "/sistema/gestao/ubs-equipes", "UBS e equipes"],
    ["Comparativos", "/sistema/gestao/comparativos", "Comparativos"],
    ["Resumo", "/sistema/gestao/resumo", "Resumo"],
  ] as const;

  for (const [name, href] of expected) {
    const link = page.getByRole("navigation", { name: "Navegação da Gestão" }).getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(page.locator(".management-brand-symbol")).toHaveAttribute("src", /mae-aps-simbolo-cabecalho/);
  await expect(page.locator(".management-ufcg-logo")).toHaveAttribute("src", /ufcg-oficial/);
  await expect(page.getByRole("link", { name: /Importar SIAPS/ })).toBeVisible();
  const bg = await page.locator(".management-shell").evaluate(el => getComputedStyle(el).backgroundImage);
  expect(bg).toContain("radial-gradient(");
  expect(bg).toContain("linear-gradient(");
});

test("Leitura mantém navegação analítica, sem opção de importar dados", async ({ page }) => {
  await signIn(page, "leitura");
  const nav = page.getByRole("navigation", { name: "Navegação da Gestão" });
  await expect(nav.getByRole("link", { name: "Indicadores" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Importar SIAPS/ })).toHaveCount(0);
  await page.goto("/sistema/importar");
  await expect(page).toHaveURL(/acesso-negado$/);
});

test("Administração utiliza o mesmo shell sem ganhar acesso de Gestão", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.locator(".management-shell.management-shell-admin")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navegação da Administração" });
  await expect(nav.getByRole("link", { name: "Contas e aprovações" })).toHaveAttribute("href", "/sistema/administracao");
  await expect(nav.getByRole("link", { name: "Território" })).toHaveAttribute("href", "/sistema/territorio");
  await expect(nav.getByRole("link", { name: "Escopos de importação" })).toHaveAttribute("href", "/sistema/administracao/escopos-importacao");
  await expect(nav.getByRole("link", { name: "Indicadores" })).toHaveCount(0);
  await page.goto("/sistema/gestao");
  await expect(page).toHaveURL(/acesso-negado$/);
});

test("Navegação pós-login tem barra rolável no mobile, sem cortar o conteúdo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "gestao");
  const main = page.locator(".management-main");
  const nav = page.locator(".management-sidebar");
  await expect(main).toBeVisible();
  await expect(nav).toBeVisible();
  await expect(nav).toHaveCSS("overflow-x", "auto");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});


test("filtros selecionados têm espaço de leitura e os KPIs respeitam o card no notebook", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, "gestao");

  const zone = page.locator(".dashboard-filter-zone");
  const dateStart = page.locator('select[name="inicio"]');
  const dateEnd = page.locator('select[name="fim"]');
  const district = page.locator('select[name="distrito"]');
  await expect(zone).toBeVisible();
  for (const select of [dateStart, dateEnd, district]) {
    const width = await select.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(150);
    await expect(select).toHaveCSS("text-overflow", "clip");
  }
  const filterColumns = await page.locator(".dashboard-filter-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(filterColumns).toBe(2);

  const cards = page.locator(".dashboard-kpi");
  await expect(cards).toHaveCount(6);
  const metrics = await cards.evaluateAll(elements => elements.map(card => {
    const value = card.querySelector<HTMLElement>(".dashboard-kpi-value");
    const header = card.querySelector<HTMLElement>(".dashboard-kpi-header");
    const description = card.querySelector<HTMLElement>(".dashboard-kpi-description");
    if (!value || !header || !description) return null;
    const cardRect = card.getBoundingClientRect();
    const valueRect = value.getBoundingClientRect();
    const descRect = description.getBoundingClientRect();
    return {
      cardLeft: cardRect.left, cardRight: cardRect.right, cardTop: cardRect.top,
      valueLeft: valueRect.left, valueRight: valueRect.right,
      valueTop: valueRect.top, descTop: descRect.top,
      numberFits: value.scrollWidth <= value.clientWidth + 1,
      headerBeforeValue: header.getBoundingClientRect().bottom <= valueRect.top,
    };
  }));
  expect(metrics.every(Boolean)).toBe(true);
  const m = metrics.filter((v): v is NonNullable<typeof v> => v !== null);
  expect(m.length).toBe(6);
  for (const card of m) {
    expect(card.valueLeft).toBeGreaterThanOrEqual(card.cardLeft + 12);
    expect(card.valueRight).toBeLessThanOrEqual(card.cardRight - 12);
    expect(card.numberFits).toBe(true);
    expect(card.headerBeforeValue).toBe(true);
    expect(card.descTop).toBeGreaterThan(card.valueTop);
  }
  for (const row of [m.slice(0, 3), m.slice(3, 6)]) {
    expect(Math.max(...row.map(x => x.valueTop)) - Math.min(...row.map(x => x.valueTop))).toBeLessThanOrEqual(2);
    expect(Math.max(...row.map(x => x.cardTop)) - Math.min(...row.map(x => x.cardTop))).toBeLessThanOrEqual(2);
  }
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("KPIs e filtros permanecem legíveis na largura de celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "gestao");
  const cards = page.locator(".dashboard-kpi");
  await expect(cards).toHaveCount(6);
  for (const card of await cards.all()) {
    const value = card.locator(".dashboard-kpi-value");
    await expect(value).toBeVisible();
    const numberFits = await value.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    expect(numberFits).toBe(true);
  }
  const start = page.locator('select[name="inicio"]');
  await expect(start).toBeVisible();
  const selectWidth = await start.evaluate(el => el.getBoundingClientRect().width);
  expect(selectWidth).toBeGreaterThan(180);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
