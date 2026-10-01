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
  await page.getByLabel("E-mail").fill(E2E_USERS[role]);
  await page.getByLabel("Senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`${E2E_HOME[role]}(?:\\?.*)?import { expect, type Page } from "@playwright/test";

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
  await page.getByLabel("E-mail").fill(E2E_USERS[role]);
  await page.getByLabel("Senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
),
    { timeout: 10_000 },
  );
}
