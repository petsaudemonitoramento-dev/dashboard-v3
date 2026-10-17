import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "MaeAps-E2E-2026!";

export const E2E_USERS = {
  admin: "e2e.admin@maeaps.test",
  gestao: "e2e.gestao@maeaps.test",
  leitura: "e2e.leitura@maeaps.test",
} as const;

const E2E_HOME = {
  admin: "/sistema/administracao",
  gestao: "/sistema/gestao",
  leitura: "/sistema/gestao",
} as const;

export async function signIn(
  page: Page,
  role: keyof typeof E2E_USERS = "gestao",
) {
  await page.goto("/entrar");
  // Os testes funcionais não avaliam a vinheta (coberta por auth-native-motion).
  // Em execuções lentas, ela pode interceptar o botão Entrar; use o atalho
  // público "Pular" em vez de esperar a animação de seis segundos.
  const intro = page.locator(".mae-gsap-intro");
  if (await intro.isVisible()) {
    await page.getByRole("button", { name: /Pular/i }).click();
    await expect(intro).toHaveCount(0);
  }
  await page.getByLabel("E-mail").fill(E2E_USERS[role]);
  await page.getByLabel("Senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`${E2E_HOME[role]}(?:\\?.*)?$`),
    { timeout: 10_000 },
  );
}
