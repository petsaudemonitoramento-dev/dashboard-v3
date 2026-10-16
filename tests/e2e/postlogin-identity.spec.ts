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

test("Navegação mobile abre por botão e fecha sem cortar o conteúdo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "gestao");
  const main = page.locator(".management-main");
  const toggle = page.getByRole("button", { name: "Abrir menu lateral" });
  await expect(main).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.locator(".management-sidebar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".management-sidebar")).toHaveCSS("overflow-y", "visible");
  await expect(page.locator(".management-sidebar")).toHaveCSS("position", "relative");
  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  await expect(page.getByRole("button", { name: "Abrir menu lateral" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".management-sidebar")).toBeHidden();
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


test("total de equipes fica exatamente no centro da rosca C3", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, "gestao");
  const chart = page.locator(".dashboard-chart-donut .mae-chart-plot");
  const center = chart.locator(".mae-chart-center-label");
  await expect(center).toBeVisible();
  await expect(center).toContainText("equipes");
  const plot = await chart.boundingBox();
  const label = await center.boundingBox();
  expect(plot).not.toBeNull();
  expect(label).not.toBeNull();
  const targetX = plot!.x + plot!.width * .5;
  const targetY = plot!.y + plot!.height * .34;
  expect(Math.abs(label!.x + label!.width / 2 - targetX)).toBeLessThan(2);
  expect(Math.abs(label!.y + label!.height / 2 - targetY)).toBeLessThan(2);
});


test("Menu físico comprime e libera o dashboard sem perder valores ou filtros", async ({ page }) => {
  for (const width of [1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "gestao");
    await page.locator(".dashboard-kpi-value").first().waitFor();
    const values = await page.locator(".dashboard-kpi-value").allTextContents();
    const labels = await page.locator(".dashboard-kpi-title span").allTextContents();
    const periods = await page.locator('select[name="inicio"],select[name="fim"]').evaluateAll(
      (elements) => elements.map((el) => (el as HTMLSelectElement).value),
    );
    const dims = async () => page.evaluate(() => {
      const side = document.querySelector(".management-sidebar")!.getBoundingClientRect();
      const main = document.querySelector(".management-main")!.getBoundingClientRect();
      const cards = Array.from(document.querySelectorAll(".dashboard-kpi"));
      return {
        sideRight: side.right, mainLeft: main.left, mainWidth: main.width,
        clip: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cardsFit: cards.every((card) => {
          const c = card.getBoundingClientRect();
          const value = card.querySelector<HTMLElement>(".dashboard-kpi-value")!;
          return c.right <= main.right + 1 && value.scrollWidth <= value.clientWidth + 1;
        }),
      };
    });
    const expanded = await dims();
    expect(expanded.mainLeft).toBeGreaterThan(190);
    expect(Math.abs(expanded.mainLeft - expanded.sideRight)).toBeLessThan(3);
    expect(expanded.clip).toBeLessThanOrEqual(1);
    expect(expanded.cardsFit).toBe(true);

    await page.getByRole("button", { name: "Recolher menu lateral" }).click();
    await expect(page.locator(".management-shell")).toHaveClass(/management-shell-nav-collapsed/);
    // Espera a transição física terminar, sem congelar elementos na posição antiga.
    await expect.poll(async () => (await dims()).mainLeft).toBeLessThan(2);
    const collapsed = await dims();
    expect(collapsed.mainWidth).toBeGreaterThan(expanded.mainWidth + 180);
    expect(collapsed.clip).toBeLessThanOrEqual(1);
    expect(collapsed.cardsFit).toBe(true);
    expect(await page.locator(".dashboard-kpi-value").allTextContents()).toEqual(values);
    expect(await page.locator(".dashboard-kpi-title span").allTextContents()).toEqual(labels);
    expect(await page.locator('select[name="inicio"],select[name="fim"]').evaluateAll(
      (elements) => elements.map((el) => (el as HTMLSelectElement).value),
    )).toEqual(periods);

    await page.getByRole("button", { name: "Abrir menu lateral" }).click();
    await expect.poll(async () => (await dims()).mainLeft).toBeGreaterThan(190);
    const again = await dims();
    expect(again.clip).toBeLessThanOrEqual(1);
    expect(again.cardsFit).toBe(true);
    expect(await page.locator(".dashboard-kpi-value").allTextContents()).toEqual(values);
  }
});

test("barra lateral compartilha a única rolagem do documento", async ({ page }) => {
  for (const width of [1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 620 });
    await signIn(page, "gestao");
    const sidebar = page.locator(".management-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("position", "relative");
    await expect(sidebar).toHaveCSS("overflow-y", "visible");
    await expect(sidebar).toHaveCSS("max-height", "none");
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(docHeight).toBeGreaterThan(620);
    await page.evaluate(() => window.scrollTo(0, 0));
    const rectBefore = await sidebar.boundingBox();
    await sidebar.locator("nav").hover();
    await page.mouse.wheel(0, 360);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const rectAfter = await sidebar.boundingBox();
    expect(rectBefore).not.toBeNull();
    expect(rectAfter).not.toBeNull();
    expect(rectAfter!.y).toBeLessThan(rectBefore!.y);
    expect(await sidebar.evaluate(el => el.scrollTop)).toBe(0);
    await page.getByRole("button", { name: "Recolher menu lateral" }).click();
    await expect(page.locator(".management-shell")).toHaveClass(/management-shell-nav-collapsed/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("filtros compactos expandem somente as opções secundárias sem apagar valores", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, "gestao");
  const advanced = page.locator("#management-advanced-filters");
  await expect(advanced).toBeHidden();
  await expect(page.getByRole("button", { name: "Mais filtros" })).toHaveAttribute("aria-expanded", "false");
  const periodBefore = await page.locator('select[name="inicio"]').inputValue();
  await page.getByRole("button", { name: "Mais filtros" }).click();
  await expect(advanced).toBeVisible();
  await expect(page.locator('select[name="classificacao"]')).toBeVisible();
  await expect(page.locator('input[name="busca"]')).toBeVisible();
  await page.getByRole("button", { name: "Menos filtros" }).click();
  await expect(advanced).toBeHidden();
  await expect(page.locator('select[name="inicio"]')).toHaveValue(periodBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("panorama priorizado, relatório completo com logos e notas pessoais ao final", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, "gestao");
  const panorama = page.locator(".management-panorama");
  await expect(panorama.getByRole("heading", { name: "Uma visão, os dados essenciais" })).toBeVisible();
  const panoramaY = (await panorama.boundingBox())!.y;
  const metricY = (await page.locator(".dashboard-kpi-grid").boundingBox())!.y;
  expect(panoramaY).toBeLessThan(metricY);
  const report = page.locator(".management-report-card");
  await expect(report.getByRole("heading", { name: "Imprimir relatório" })).toBeVisible();
  await expect(report.locator('input[type="checkbox"]')).not.toBeChecked();
  await expect(page.locator(".management-notes-card")).toBeVisible();
  await report.getByRole("button", { name: "Pré-visualizar relatório" }).click();
  const dialog = page.getByRole("dialog", { name: "Prévia do relatório" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Relatório de acompanhamento da Gestão" })).toBeVisible();
  await expect(dialog.locator('img[alt="MAE APS"]')).toBeVisible();
  await expect(dialog.locator('img[alt="Universidade Federal de Campina Grande"]')).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Práticas de cuidado A/ })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Rastreabilidade e histórico/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar pré-visualização" }).click();
  await expect(dialog).toHaveCount(0);
});
