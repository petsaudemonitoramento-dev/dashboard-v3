import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

const COMPETENCY = "2099-01";

function dashboardUrl(district = "all", ubs = "all", team = "all") {
  return `/sistema/gestao?inicio=${COMPETENCY}&fim=${COMPETENCY}&distrito=${district}&ubs=${ubs}&equipe=${team}`;
}

test.beforeEach(async ({ page }) => {
  await signIn(page, "gestao");
  await page.goto(dashboardUrl());
  await expect(
    page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
  ).toBeVisible();
});

test("encadeia Distrito → UBS → Equipe e limpa os descendentes", async ({
  page,
}) => {
  const district = page.locator('select[name="distrito"]');
  const establishment = page.locator('select[name="ubs"]');
  const team = page.locator('select[name="equipe"]');

  await district.selectOption({ label: "E2E Distrito Norte" });
  await expect(page).toHaveURL(/distrito=31001/);
  await expect(establishment.getByRole("option")).toHaveText([
    "Todas as UBS",
    "E2E UBS Alfa · 9990001",
  ]);

  await establishment.selectOption({ label: "E2E UBS Alfa · 9990001" });
  await expect(page).toHaveURL(/ubs=[0-9a-f-]+/);
  await expect(team.getByRole("option")).toHaveText([
    "Todas as equipes",
    "E2E Equipe Alfa 1 · 9990000001",
    "E2E Equipe Alfa 2 · 9990000002",
  ]);

  await team.selectOption({ label: "E2E Equipe Alfa 1 · 9990000001" });
  await expect(page).toHaveURL(/equipe=[0-9a-f-]+/);

  await district.selectOption({ label: "E2E Distrito Sul" });
  await expect(page).toHaveURL(
    new RegExp(`inicio=${COMPETENCY}&fim=${COMPETENCY}&distrito=31002&ubs=all&equipe=all$`),
  );
  await expect(establishment.getByRole("option")).toHaveText([
    "Todas as UBS",
    "E2E UBS Beta · 9990002",
  ]);

  await establishment.selectOption({ label: "E2E UBS Beta · 9990002" });
  await expect(page).toHaveURL(/ubs=[0-9a-f-]+&equipe=all$/);
  await expect(team.getByRole("option")).toHaveText([
    "Todas as equipes",
    "E2E Equipe Beta · 9990000003",
  ]);

  await establishment.selectOption("all");
  await expect(page).toHaveURL(/ubs=all&equipe=all$/);
});

test("unknown mostra somente UBS sem distrito", async ({ page }) => {
  await page.locator('select[name="distrito"]').selectOption("unknown");
  await expect(page).toHaveURL(/distrito=unknown/);

  await expect(page.locator('select[name="ubs"]').getByRole("option")).toHaveText([
    "Todas as UBS",
    "E2E UBS Sem Distrito · 9990003",
  ]);
});

test("normaliza no servidor uma combinação incompatível recebida pela URL", async ({
  page,
}) => {
  await page.goto(dashboardUrl("31002"));
  const betaValue = await page
    .getByLabel("UBS")
    .getByRole("option", { name: "E2E UBS Beta · 9990002" })
    .getAttribute("value");
  expect(betaValue).toBeTruthy();

  await page.goto(dashboardUrl("31001", betaValue!, "identificador-invalido"));
  await expect(page).toHaveURL(
    new RegExp(`inicio=${COMPETENCY}&fim=${COMPETENCY}&distrito=31001&ubs=all&equipe=all$`),
  );
  await expect(page.locator('select[name="ubs"]')).toHaveValue("all");
  await expect(page.locator('select[name="equipe"]')).toHaveValue("all");
});
