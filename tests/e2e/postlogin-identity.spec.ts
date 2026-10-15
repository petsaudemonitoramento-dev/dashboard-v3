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
    ["Resumo", "/sistema/gestao/resumo", "Resumo"],
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

test("Navegação pós-login tem barra rolável no mobile, sem cortar o conteúdo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "gestao");
  const main = page.locator(".management-main");
  const nav = page.locator(".management-sidebar");
  await expect(main).toBeVisible();
  await expect(nav).toBeVisible();
  await expect(nav).toHaveCSS("overflow-x", "auto");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
