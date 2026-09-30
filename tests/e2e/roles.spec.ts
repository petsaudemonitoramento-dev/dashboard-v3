import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

test("Gestão possui visão municipal e acesso à importação", async ({ page }) => {
  await signIn(page, "gestao");

  await expect(
    page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Importar dados" }),
  ).toBeVisible();
  await page.goto("/sistema/importar");
  await expect(
    page.getByRole("heading", { name: "Importar dados" }),
  ).toBeVisible();
});

test("Leitura acessa dashboard, mas não a importação", async ({ page }) => {
  await signIn(page, "leitura");

  await expect(
    page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Importar dados" }),
  ).toHaveCount(0);

  await page.goto("/sistema/importar");
  await expect(page).toHaveURL(/\/acesso-negado$/);
  await expect(
    page.getByRole("heading", { name: "Seu perfil não acessa esta área" }),
  ).toBeVisible();
});

test("Administração não herda acesso ao dashboard da Gestão", async ({ page }) => {
  await signIn(page, "admin");

  await expect(page).toHaveURL(/\/sistema\/administracao/);
  await expect(
    page.getByRole("heading", { name: "Administração" }),
  ).toBeVisible();

  await page.goto("/sistema/gestao");
  await expect(page).toHaveURL(/\/acesso-negado$/);
});
