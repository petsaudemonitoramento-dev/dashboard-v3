import { expect, test } from "@playwright/test";

test("abertura é nativa em SVG + GSAP, sem vídeo nem GIF", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page.locator(".mae-gsap-intro")).toBeVisible();
  await expect(page.locator(".mae-gsap-intro video")).toHaveCount(0);
  await expect(page.locator(".mae-gsap-intro .mae-ribbon")).toHaveCount(0);
  await expect(page.locator(".mae-cinema-ambient .mae-ribbon")).toHaveCount(4);
  await page.getByRole("button", { name: /pular/i }).click();
  await expect(page.locator(".mae-gsap-intro")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /rever abertura/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
});

test("layout desktop preserva logo oficial e login autenticável no cartão claro", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v4", "played"));
  await page.goto("/entrar");
  const scene = page.locator(".mae-motion-v3");
  await expect(scene).toBeVisible();
  await expect(scene.locator(".mae-cinema-brand")).toBeVisible();
  const card = scene.locator(".mae-cinema-auth");
  await expect(card).toBeVisible();
  expect(await card.evaluate(e => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");
  const columns = await scene.locator(".mae-cinema-center").evaluate(e => getComputedStyle(e).gridTemplateColumns);
  expect(columns.split(" ").length).toBe(2);
  await expect(card.locator('input[name="email"]')).toBeVisible();
  await expect(card.locator('input[name="password"]')).toBeVisible();
  await expect(card.getByRole("button", { name: "Entrar" })).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`layout responsivo em ${width}px sem transbordamento horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.addInitScript(() => sessionStorage.setItem("mae-aps-animacao-referencia-oficial-v4", "played"));
    await page.goto("/entrar");
    await expect(page.locator(".mae-cinema-brand")).toBeVisible();
    await expect(page.locator(".mae-cinema-auth")).toBeVisible();
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
