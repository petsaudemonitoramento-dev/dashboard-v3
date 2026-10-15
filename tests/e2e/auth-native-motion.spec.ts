import { expect, test } from "@playwright/test";

test("abertura é nativa em SVG + GSAP, sem vídeo nem GIF", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.locator(".mae-gsap-intro")).toBeVisible();
  await expect(page.locator(".mae-gsap-intro video")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-intro .mae-ribbon")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-flash .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-reveal .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-white-logo .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-intro")).toHaveAttribute("data-intro-duration-ms", "5000");
  await expect(page.locator(".mae-gsap-logo-description")).toHaveCount(3);
  await expect(page.locator(".mae-gsap-reveal .mae-gsap-logo-description")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-tagline-light")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-stage-dark")).toHaveCSS("z-index", "2");
  await expect(page.locator(".mae-gsap-white-logo")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(".mae-gsap-white-logo .mae-gsap-logo-description")).toContainText("na Atenção Primária à Saúde");
  await expect(page.locator(".mae-cinema-ambient .mae-ribbon")).toHaveCount(4);
  await page.getByRole("button", { name: /pular/i }).click();
  await expect(page.locator(".mae-gsap-intro")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /rever abertura/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
});

test("layout Figma desktop: logo oficial, cartão branco e cristal roxo", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v7-5s", "played"));
  await page.goto("/entrar");
  const scene = page.locator(".mae-motion-v3");
  await expect(scene).toBeVisible();
  await expect(scene.locator(".mae-cinema-brand")).toBeVisible();
  await expect(scene.locator(".mae-cinema-institutional-bar")).toHaveCount(0);
  await expect(scene.locator(".mae-cinema-brand-drive")).toHaveAttribute("src", /mae-aps-horizontal-azul/);
  await expect(scene.locator(".mae-cinema-brand-description")).toContainText("na Atenção Primária à Saúde");
  await expect(scene.locator(".mae-cinema-footer-identification img")).toBeVisible();
  await expect(scene.locator(".mae-ribbon-orange")).toHaveAttribute("data-reference-geometry", "1440x1024");
  await expect(scene.locator(".mae-ribbon-orange")).toHaveCSS("animation-name", "none");
  const card = scene.locator(".mae-cinema-auth");
  await expect(card).toBeVisible();
  expect(await card.evaluate(e => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");
  const brandRect = await scene.locator(".mae-cinema-brand").boundingBox();
  const cardRect = await card.boundingBox();
  expect(brandRect).not.toBeNull();
  expect(cardRect).not.toBeNull();
  expect(brandRect!.x + brandRect!.width).toBeLessThan(cardRect!.x + 10);
  const columns = await scene.locator(".mae-cinema-center").evaluate(e => getComputedStyle(e).gridTemplateColumns);
  expect(columns.split(" ").length).toBe(2);
  await expect(card.locator('input[name="email"]')).toBeVisible();
  await expect(card.locator('input[name="password"]')).toBeVisible();
  const loginButton = card.getByRole("button", { name: "Entrar" });
  await expect(loginButton).toBeVisible();
  expect(await loginButton.evaluate(e => getComputedStyle(e, "::before").animationName)).toBe("mae-purple-crystal-sheen");
  await expect(loginButton.locator(".auth-primary-button-label")).toHaveText("Entrar");
  expect(await loginButton.evaluate(e => getComputedStyle(e, "::before").zIndex)).toBe("1");
  expect(await loginButton.evaluate(e => getComputedStyle(e).borderRadius)).toBe("12px");
});

for (const width of [320, 390, 768]) {
  test(`layout responsivo em ${width}px sem transbordamento horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v7-5s", "played"));
    await page.goto("/entrar");
    await expect(page.locator(".mae-cinema-brand")).toBeVisible();
    await expect(page.locator(".mae-cinema-auth")).toBeVisible();
    expect(await page.locator(".mae-cinema-auth").evaluate(e => getComputedStyle(e).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const template = await page.locator(".mae-cinema-center").evaluate(e => getComputedStyle(e).gridTemplateColumns);
    expect(template.split(" ").length).toBe(1);
  });
}

test("movimento reduzido exibe o login sem exigir assistir à abertura", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/entrar");
  await expect(page.locator(".mae-cinema-auth")).toBeVisible();
  await expect(page.locator(".mae-gsap-intro")).toHaveCount(0);
});

test("logo mobile centralizada, ornamentos oficiais e brilho desativado com movimento reduzido", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/entrar");
  await expect(page.locator(".mae-cinema-brand-drive")).toBeVisible();
  await expect(page.locator(".mae-ribbon-purple-bottom")).toBeVisible();
  const card = page.locator(".mae-cinema-auth");
  const button = card.getByRole("button", { name: "Entrar" });
  await expect(button).toBeVisible();
  expect(await button.evaluate(e => getComputedStyle(e, "::before").animationName)).toBe("none");
  await expect(card.locator('input[name="email"]')).toBeVisible();
  await expect(card.locator('input[name="password"]')).toBeVisible();
});


test("vinheta de cinco segundos termina sem intervenção e preserva o SVG oficial", async ({ page }) => {
  await page.goto("/entrar");
  const intro = page.locator(".mae-gsap-intro-v6");
  await expect(intro).toHaveAttribute("data-intro-duration-ms", "5000");
  const image = intro.locator(".mae-gsap-reveal .mae-gsap-official-logo");
  await expect(image).toHaveCount(1);
  expect(await image.evaluate(el => getComputedStyle(el).maskImage)).toContain("mae-aps-horizontal-azul.svg");
  await expect(page.locator(".mae-gsap-stage-dark")).toHaveCSS("z-index", "2");
  await expect(page.locator(".mae-gsap-intro-v6")).toHaveCount(0, { timeout: 6500 });
  await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
});


test("ornamentos da prancheta: círculo superior direito e símbolo M inferior esquerdo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v7-5s", "played"));
  await page.goto("/entrar");
  const circle = page.locator(".mae-motion-ribbons .mae-ribbon-purple-top");
  const mSymbol = page.locator(".mae-motion-ribbons .mae-ribbon-purple-bottom");
  await expect(circle).toHaveCSS("border-top-style", "solid");
  await expect(circle).toHaveCSS("border-radius", "50%");
  await expect(circle).toHaveCSS("mask-image", "none");
  await expect(circle).toHaveCSS("transform", "none");
  await expect(mSymbol).toHaveAttribute("data-reference-geometry", "bottom-left-1440x1024");
  await expect(mSymbol.locator("path")).toHaveCount(1);
  await expect(mSymbol).toHaveCSS("mask-image", "none");
  await expect(mSymbol).toHaveCSS("transform", "none");
});

test("tela notebook sem corte de Monitoramento e sem rodapé abaixo do viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 635 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v7-5s", "played"));
  await page.goto("/entrar");
  const brand = page.locator(".mae-cinema-brand");
  const description = brand.locator(".mae-cinema-brand-description");
  const card = page.locator(".mae-cinema-auth");
  const footer = page.locator(".mae-cinema-footer");
  await expect(description).toContainText("Monitoramento, atenção e estratégia");
  await expect(description).toContainText("na Atenção Primária à Saúde");
  const [brandRect, descRect, cardRect, footerRect] = await Promise.all([
    brand.boundingBox(), description.boundingBox(), card.boundingBox(), footer.boundingBox(),
  ]);
  expect(brandRect).not.toBeNull();
  expect(descRect).not.toBeNull();
  expect(cardRect).not.toBeNull();
  expect(footerRect).not.toBeNull();
  // A haste do M fica na primeira terça parte do SVG; o texto deve
  // começar à direita dela, sem alcançar o cartão do formulário.
  expect(descRect!.x).toBeGreaterThan(brandRect!.x + brandRect!.width * .34);
  expect(descRect!.x + descRect!.width).toBeLessThan(cardRect!.x);
  expect(cardRect!.width).toBeLessThanOrEqual(520);
  expect(footerRect!.y + footerRect!.height).toBeLessThanOrEqual(637);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
  expect(overflow).toBeLessThanOrEqual(2);
});
