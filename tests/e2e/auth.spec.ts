import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, E2E_USERS, signIn } from "./support/auth";

test("protege uma rota interna sem sessão", async ({ page }) => {
  await page.goto("/sistema/gestao");

  await expect(page).toHaveURL(/\/entrar/);
  await expect(
    page.getByRole("heading", { name: "Acesso ao MAE APS" }),
  ).toBeVisible();
});

test("aceita login válido e carrega o dashboard", async ({ page }) => {
  await signIn(page, "gestao");

  await expect(page).toHaveURL(/\/sistema\/gestao/);
  await expect(
    page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
  ).toBeVisible();
});

test("encerra a sessão no logout", async ({ page }) => {
  await signIn(page, "gestao");
  await page.getByLabel("Abrir menu da conta").click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/sistema/gestao");
  await expect(page).toHaveURL(/\/entrar/);
});

test("solicita recuperação sem revelar se o e-mail existe", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill(E2E_USERS.gestao);
  await page.getByRole("button", { name: "Enviar instruções" }).click();

  await expect(page.getByRole("status")).toContainText(
    "Se o e-mail estiver cadastrado, enviaremos as instruções.",
  );
});

test("informa a liberação pendente imediatamente após o cadastro", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill(`e2e.cadastro.${Date.now()}@maeaps.test`);
  await page.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
  await page.getByLabel("Confirme a senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Solicitar acesso à Gestão" }).click();

  const status = page.getByRole("status").filter({ hasText: "Aguardando liberação" });
  await expect(status).toBeVisible();
  await expect(status).toContainText("liberação pelo administrador");
  await expect(page.getByRole("button", { name: "Solicitar acesso à Gestão" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute("href", "/entrar");
});
