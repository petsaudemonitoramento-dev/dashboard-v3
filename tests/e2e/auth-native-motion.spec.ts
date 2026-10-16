import { expect, test } from "@playwright/test";

test("abertura é nativa em SVG + GSAP, sem vídeo nem GIF", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.locator(".mae-gsap-intro")).toBeVisible();
  await expect(page.locator(".mae-gsap-intro video")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-intro .mae-ribbon")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-flash .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-reveal .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-white-logo .mae-gsap-official-logo")).toHaveCount(1);
  await expect(page.locator(".mae-gsap-intro")).toHaveAttribute("data-intro-duration-ms", "6000");
  await expect(page.locator(".mae-gsap-logo-description")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-tagline-light")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-stage-dark")).toHaveCSS("z-index", "2");
  await expect(page.locator(".mae-gsap-white-logo")).toHaveCSS("color", "rgb(255, 255, 255)");
  const mask = await page.locator(".mae-gsap-white-logo .mae-gsap-official-logo").evaluate(e => getComputedStyle(e).maskImage);
  expect(mask).toContain("mae-aps-assinatura-unificada.svg");
  await expect(page.locator(".mae-cinema-ambient .mae-ribbon")).toHaveCount(4);
  await page.getByRole("button", { name: /pular/i }).click();
  await expect(page.locator(".mae-gsap-intro")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /rever abertura/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
});

test("abertura automática é reproduzida em cada novo acesso, mesmo após ser concluída na aba", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.locator(".mae-gsap-intro")).toBeVisible();
  await page.getByRole("button", { name: /pular/i }).click();
  await expect(page.locator(".mae-gsap-intro")).toHaveCount(0);

  // A versão anterior gravava "played" e suprimia a abertura na visita seguinte.
  await page.evaluate(() => sessionStorage.setItem("mae-aps-v8-svg-unico-6s", "played"));
  await page.reload();
  await expect(page.locator(".mae-gsap-intro")).toBeVisible();
  await page.getByRole("button", { name: /pular/i }).click();
});

test("layout Figma desktop: logo oficial, cartão branco e cristal roxo", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
  await page.goto("/entrar");
  const scene = page.locator(".mae-motion-v3");
  await expect(scene).toBeVisible();
  await expect(scene.locator(".mae-cinema-brand")).toBeVisible();
  await expect(scene.locator(".mae-cinema-institutional-bar")).toHaveCount(0);
  await expect(scene.locator(".mae-cinema-brand-drive")).toHaveAttribute("src", /mae-aps-assinatura-unificada\.svg/);
  await expect(scene.locator(".mae-cinema-brand-description")).toHaveCount(0);
  const svg = await page.request.get("/brands/mae-aps-assinatura-unificada.svg");
  expect(svg.ok()).toBeTruthy();
  const svgXml = await svg.text();
  expect(svgXml).toContain("Monitoramento, atenção e estratégia");
  expect(svgXml).toContain("na Atenção Primária à Saúde");
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
  expect(await loginButton.evaluate(e => getComputedStyle(e).borderRadius)).toBe("13px");
  const style = await loginButton.evaluate(e => ({
    background: getComputedStyle(e).backgroundImage,
    color: getComputedStyle(e).color,
    labelColor: getComputedStyle(e.querySelector(".auth-primary-button-label")!).color,
    labelLayer: getComputedStyle(e.querySelector(".auth-primary-button-label")!).zIndex,
    glareLayer: getComputedStyle(e, "::before").zIndex,
    glareOpacity: Number(getComputedStyle(e, "::before").opacity),
  }));
  expect(style.background).toContain("linear-gradient(");
  expect(style.background).toContain("55, 16, 113"); // #371071 — início do gradiente Importar SIAPS
  expect(style.color).toBe("rgb(255, 255, 255)");
  expect(style.labelColor).toBe("rgb(255, 255, 255)");
  expect(Number(style.labelLayer)).toBeGreaterThan(Number(style.glareLayer));
  expect(style.glareOpacity).toBeLessThanOrEqual(.5);
});

for (const width of [320, 390, 768]) {
  test(`layout responsivo em ${width}px sem transbordamento horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
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


test("vinheta de seis segundos termina sem intervenção e preserva o SVG oficial", async ({ page }) => {
  await page.goto("/entrar");
  const intro = page.locator(".mae-gsap-intro-v8");
  await expect(intro).toHaveAttribute("data-intro-duration-ms", "6000");
  const image = intro.locator(".mae-gsap-reveal .mae-gsap-official-logo");
  await expect(image).toHaveCount(1);
  expect(await image.evaluate(el => getComputedStyle(el).maskImage)).toContain("mae-aps-assinatura-unificada.svg");
  await expect(page.locator(".mae-gsap-stage-dark")).toHaveCSS("z-index", "2");
  await expect(page.locator(".mae-gsap-intro-v8")).toHaveCount(0, { timeout: 7600 });
  await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
});


test("ornamentos: anel circular contínuo atrás do card e M inferior proporcional", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
  await page.goto("/entrar");
  const circle = page.locator(".mae-motion-ribbons .mae-ribbon-purple-top");
  const mSymbol = page.locator(".mae-motion-ribbons .mae-ribbon-purple-bottom");
  await expect(circle).toHaveAttribute("data-reference-geometry", "upper-right-continuous-ring");
  await expect(circle.locator("path")).toHaveCount(0);
  await expect(circle).toHaveCSS("border-top-style", "solid");
  await expect(circle).toHaveCSS("border-radius", "50%");
  await expect(page.locator(".mae-cinema-ambient")).toHaveCSS("z-index", "0");
  await expect(page.locator(".mae-cinema-main")).toHaveCSS("z-index", "1");
  await expect(circle).toHaveCSS("mask-image", "none");
  await expect(circle).toHaveCSS("transform", "none");
  await expect(mSymbol).toHaveAttribute("data-reference-geometry", "bottom-left-original-trace");
  await expect(mSymbol.locator("path")).toHaveCount(1);
  await expect(mSymbol).toHaveCSS("mask-image", "none");
  await expect(mSymbol).toHaveCSS("transform", "none");
  const mBox = await mSymbol.boundingBox();
  expect(mBox).not.toBeNull();
  expect(mBox!.width).toBeLessThanOrEqual(500);
});

test("tela notebook sem corte de Monitoramento e sem rodapé abaixo do viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 635 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
  await page.goto("/entrar");
  const brand = page.locator(".mae-cinema-brand");
  const brandImage = brand.locator(".mae-cinema-brand-drive");
  const card = page.locator(".mae-cinema-auth");
  const footer = page.locator(".mae-cinema-footer");
  await expect(brandImage).toHaveAttribute("src", /mae-aps-assinatura-unificada.svg/);
  const [brandRect, brandImgRect, cardRect, footerRect] = await Promise.all([
    brand.boundingBox(), brandImage.boundingBox(), card.boundingBox(), footer.boundingBox(),
  ]);
  expect(brandRect).not.toBeNull();
  expect(brandImgRect).not.toBeNull();
  expect(cardRect).not.toBeNull();
  expect(footerRect).not.toBeNull();
  // O título e a assinatura estão em um único SVG que não cruza o card.
  expect(brandImgRect!.x + brandImgRect!.width).toBeLessThan(cardRect!.x + 1);
  expect(cardRect!.width).toBeLessThanOrEqual(520);
  expect(footerRect!.y + footerRect!.height).toBeLessThanOrEqual(637);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);
  expect(overflow).toBeLessThanOrEqual(2);
});


test("UFCG: PNG oficial em resolução integral, com tamanho legível no rodapé", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
  await page.goto("/entrar");
  const png = page.locator(".mae-cinema-footer .mae-cinema-ufcg img");
  await expect(png).toBeVisible();
  await expect(png).toHaveAttribute("src", "/brands/ufcg-oficial.png");
  const details = await png.evaluate((element) => {
    const image = element as HTMLImageElement;
    return { nativeWidth: image.naturalWidth, renderedWidth: image.getBoundingClientRect().width };
  });
  expect(details.nativeWidth).toBe(1472);
  expect(details.renderedWidth).toBeGreaterThan(165);
  const logoBox = await png.boundingBox();
  const footerBox = await page.locator(".mae-cinema-footer").boundingBox();
  expect(logoBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(logoBox!.y).toBeGreaterThanOrEqual(footerBox!.y - 1);
  expect(logoBox!.y + logoBox!.height).toBeLessThanOrEqual(footerBox!.y + footerBox!.height + 1);
});


test("fundo de login usa degradê CSS mais presente, sem imagem e sem afetar a abertura", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 635 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-intro-skip", "true"));
  await page.goto("/entrar");

  const scene = page.locator(".mae-cinema.mae-motion-v3");
  await expect(scene).toBeVisible();
  const computed = await scene.evaluate(element => ({
    image: getComputedStyle(element).backgroundImage,
    color: getComputedStyle(element).backgroundColor,
  }));
  expect(computed.image).not.toContain("url(");
  expect(computed.image.split("radial-gradient(").length - 1).toBe(4);
  expect(computed.image).toContain("linear-gradient(");
  expect(computed.color).toBe("rgb(241, 231, 250)");
  await expect(page.locator(".mae-cinema-auth")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".mae-ribbon-purple-top")).toHaveCSS("border-top-style", "solid");
});
