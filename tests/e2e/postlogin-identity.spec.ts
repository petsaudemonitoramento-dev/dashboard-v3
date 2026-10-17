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
  await expect(page.locator(".management-brand-art")).toHaveAttribute("src", /mae-aps-logo-horizontal-roxa/);
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
  // Ler ambos os retângulos no mesmo frame evita falso positivo quando
  // ECharts redimensiona a rosca entre duas chamadas Playwright separadas.
  const geometry = await chart.evaluate((plot) => {
    const label = plot.querySelector(".mae-chart-center-label");
    if (!label) return null;
    const a = plot.getBoundingClientRect();
    const b = label.getBoundingClientRect();
    return {
      dx: Math.abs(b.x + b.width / 2 - (a.x + a.width * .5)),
      dy: Math.abs(b.y + b.height / 2 - (a.y + a.height * .34)),
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.dx).toBeLessThan(2);
  expect(geometry!.dy).toBeLessThan(2);
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
    // Dados sintéticos podem produzir uma página curta. Aumentamos somente
    // o corpo do cenário para validar o scroll da janela sob o menu sticky.
    await page.locator(".management-main").evaluate((main: HTMLElement) => {
      main.style.minHeight = "2300px";
    });
    await expect.poll(() => page.evaluate(() =>
      document.scrollingElement!.scrollHeight - window.innerHeight
    )).toBeGreaterThan(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sidebar.locator("nav").hover();
    await page.mouse.wheel(0, 360);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // A coluna é estrutural; seu background pode acompanhar a grade, mas
    // os links devem ficar no viewport com scrollTop próprio zerado.
    await expect(sidebar.locator(".management-sidebar-content")).toBeInViewport();
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

test("imprimir/salvar PDF dispara window.print imediatamente sem depender de decode ou mudança de estado", async ({ page }) => {
  await signIn(page, "gestao");
  await page.evaluate(() => {
    const globals = window as Window & { __maePrintCalls?: number };
    globals.__maePrintCalls = 0;
    window.print = () => { globals.__maePrintCalls = (globals.__maePrintCalls ?? 0) + 1; };
    // Simula a causa da regressão: img.decode nunca resolve.
    HTMLImageElement.prototype.decode = () => new Promise<void>(() => {});
  });

  const calls = () => page.evaluate(() =>
    (window as Window & { __maePrintCalls?: number }).__maePrintCalls ?? 0);
  const report = page.locator(".management-report-card");
  await report.getByRole("button", { name: "Imprimir / salvar PDF" }).click();
  await expect.poll(calls).toBe(1);

  await report.getByRole("button", { name: "Pré-visualizar relatório" }).click();
  const dialog = page.getByRole("dialog", { name: "Prévia do relatório" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Imprimir / PDF" }).click();
  await expect.poll(calls).toBe(2);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".management-print-report .management-report-document")).toBeVisible();
  await expect(page.locator(".management-sidebar")).toBeHidden();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".management-print-report .management-report-doc-header img")).toHaveCount(2);
});

test("menu permanece acessível durante rolagem da página única, sem rolagem própria", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 720 });
  await signIn(page, "gestao");
  const side = page.locator(".management-sidebar");
  const inner = side.locator(".management-sidebar-content");
  await expect(side).toBeVisible();
  await expect(inner).toHaveCSS("position", "sticky");
  await expect(side).toHaveCSS("overflow-y", "visible");
  await expect(inner).toHaveCSS("overflow-y", "visible");

  // O teste de roda do mouse já é coberto no cenário anterior.
  // Aqui isolamos a propriedade sticky após uma rolagem de documento.
  // Fixtures sintéticas podem resultar numa home curta. Criamos conteúdo vertical
  // somente neste cenário para provar que a sidebar permanece sticky com rolagem real.
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>(".management-main");
    if (main) main.style.minHeight = "2300px";
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const navBefore = await inner.boundingBox();
  await page.evaluate(() => window.scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(700);
  const navAfter = await inner.boundingBox();
  expect(navBefore && navAfter).toBeTruthy();
  expect(Math.abs(navAfter!.y - navBefore!.y)).toBeLessThan(22);
  await expect(side.getByRole("link", { name: "Indicadores" })).toBeInViewport();
  await expect(side.getByRole("link", { name: "Importar SIAPS" })).toBeInViewport();
  expect(await side.evaluate(el => el.scrollTop)).toBe(0);
  // A hidratação dos indicadores é assíncrona. Compare os mesmos valores
  // somente depois de os seis KPIs estarem carregados.
  const kpiValues = page.locator(".dashboard-kpi-value");
  await expect(kpiValues).toHaveCount(6);
  await expect.poll(async () => (await kpiValues.allTextContents())
    .every((value) => value.trim().length > 0)).toBe(true);
  const before = await kpiValues.allTextContents();
  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  await expect(side).toBeHidden();
  await expect(page.locator(".dashboard-kpi-value")).toHaveCount(6);
  await expect.poll(() => kpiValues.allTextContents()).toEqual(before);
  await page.getByRole("button", { name: "Abrir menu lateral" }).click();
  await expect.poll(() => kpiValues.allTextContents()).toEqual(before);
  await expect(side.getByRole("link", { name: "Indicadores" })).toBeInViewport();
});

test("marca do PDF é SVG sem moldura nem fundo também no modo de impressão", async ({ page }) => {
  await signIn(page, "gestao");
  await page.getByRole("button", { name: "Pré-visualizar relatório" }).click();
  const logo = page.getByRole("dialog", { name: "Prévia do relatório" }).locator(".management-report-mae-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /mae-aps-assinatura-unificada\.svg/);
  await expect(logo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(logo).toHaveCSS("box-shadow", "none");
  await expect(logo).toHaveCSS("border-top-width", "0px");
  await page.emulateMedia({ media: "print" });
  const printable = page.locator(".management-print-report .management-report-mae-logo");
  await expect(printable).toBeVisible();
  await expect(printable).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(printable).toHaveCSS("box-shadow", "none");
});

test("marca MAE APS retorna ao topo do Início, sem reiniciar os filtros", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 720 });
  await signIn(page, "gestao");
  // Garantir altura para testar a âncora mesmo com poucos dados sintéticos.
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>(".management-main");
    if (main) main.style.minHeight = "2300px";
  });

  const brand = page.getByRole("link", { name: "MAE APS: voltar ao topo" });
  await expect(brand).toHaveAttribute("href", "/sistema/gestao");
  const period = await page.locator('select[name="inicio"]').inputValue();
  await page.evaluate(() => window.scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(700);
  await brand.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(4);
  await expect(page.locator('select[name="inicio"]')).toHaveValue(period);

  await page.getByRole("navigation", { name: "Navegação da Gestão" })
    .getByRole("link", { name: "Indicadores" }).click();
  await expect(page).toHaveURL(/\/sistema\/gestao\/indicadores(?:[?#].*)?$/);
  await page.getByRole("link", { name: "MAE APS: voltar ao início" }).click();
  await expect(page).toHaveURL(/\/sistema\/gestao(?:[?#].*)?$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(4);
});


test("menu navega de Início para todos os módulos da Gestão", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signIn(page, "gestao");
  const nav = page.getByRole("navigation", { name: "Navegação da Gestão" });
  const destinations = [
    ["Indicadores", "/sistema/gestao/indicadores"],
    ["UBS e equipes", "/sistema/gestao/ubs-equipes"],
    ["Comparativos", "/sistema/gestao/comparativos"],
    ["Configurações", "/sistema/perfil"],
    ["Importar SIAPS", "/sistema/importar"],
    ["Início", "/sistema/gestao"],
  ] as const;
  for (const [label, href] of destinations) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 }).toBe(href);
    if (label === "Indicadores" || label === "UBS e equipes" || label === "Comparativos") {
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.locator(".management-main")).toBeVisible();
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("menu móvel abre Indicadores e permanece funcional ao retornar ao Início", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "gestao");
  await page.getByRole("button", { name: "Abrir menu lateral" }).click();
  await page.getByRole("navigation", { name: "Navegação da Gestão" })
    .getByRole("link", { name: "Indicadores", exact: true }).click();
  await expect(page).toHaveURL(/\/sistema\/gestao\/indicadores(?:[?#].*)?$/, { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Abrir menu lateral" })).toBeVisible();
  await page.getByRole("link", { name: "MAE APS: voltar ao início" }).click();
  await expect(page).toHaveURL(/\/sistema\/gestao(?:[?#].*)?$/, { timeout: 15000 });
});


test("menu recolhido permanece oculto ao rolar e variar a altura, sem alterar indicadores", async ({ page }) => {
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 720 });
    await signIn(page, "gestao");

    const shell = page.locator(".management-shell");
    const sidebar = page.locator(".management-sidebar");
    const main = page.locator(".management-main");
    // Força altura real de rolagem mesmo com pouco conteúdo no banco de teste.
    await main.evaluate((element: HTMLElement) => { element.style.minHeight = "2400px"; });

    if (width <= 850) {
      await page.getByRole("button", { name: "Abrir menu lateral" }).click();
    }
    await page.getByRole("button", { name: "Recolher menu lateral" }).click();
    await expect(shell).toHaveClass(/management-shell-nav-collapsed/);
    await expect(page.getByRole("button", { name: "Abrir menu lateral" })).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar).toBeHidden();

    await page.evaluate(() => window.scrollTo({ top: 1100, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);

    // O chrome de navegadores móveis e mudanças de altura disparam resize
    // sem cruzar o breakpoint de 850px. Não podem reabrir o menu.
    await page.setViewportSize({ width, height: 610 });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await expect(shell).toHaveClass(/management-shell-nav-collapsed/);
    await expect(sidebar).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir menu lateral" })).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(main).toBeVisible();

    await page.getByRole("button", { name: "Abrir menu lateral" }).click();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toHaveAttribute("aria-expanded", "true");
  }
});

test("só a travessia de breakpoint redefine o estado responsivo do menu", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await signIn(page, "gestao");
  await page.getByRole("button", { name: "Recolher menu lateral" }).click();

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator(".management-shell")).toHaveClass(/management-shell-mobile/);
  await expect(page.getByRole("button", { name: "Abrir menu lateral" })).toHaveAttribute("aria-expanded", "false");

  await page.setViewportSize({ width: 1366, height: 800 });
  await expect(page.locator(".management-shell")).not.toHaveClass(/management-shell-mobile/);
  await expect(page.getByRole("button", { name: "Recolher menu lateral" })).toHaveAttribute("aria-expanded", "true");
});
