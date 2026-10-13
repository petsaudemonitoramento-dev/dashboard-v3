import { expect, test } from "@playwright/test";

const breakpoints = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
];

for (const size of breakpoints) {
  test(`login MAE APS ${size.width}x${size.height} não apresenta scroll horizontal`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { name: "Acesso ao MAE APS" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    if (size.width <= 700) {
      const footer = page.locator(".mae-cinema-footer-mobile");
      await expect(footer).toBeVisible();
      const details = footer.locator("details");
      await expect(details.locator("summary")).toHaveText("Referências técnicas");
      await details.locator("summary").click();
      await expect(details).toHaveAttribute("open", "");
      await expect(footer).toContainText("Lucca Araújo");
      await expect(footer).toContainText("Kethilly Nayara");
    }
  });
}

test("cadastro e recuperação preservam o contexto visual do login", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entrar");
  await page.getByRole("link", { name: /criar conta/i }).click();
  await expect(page.locator(".mae-cinema")).toBeVisible();
  await page.goto("/entrar");
  await page.getByRole("link", { name: /esqueci minha senha/i }).click();
  await expect(page.locator(".mae-cinema")).toBeVisible();
});
