import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./support/auth";
import { invalidWorkbook, validWorkbook } from "./support/workbook";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

async function expectNoWcagViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target),
  }));

  expect(
    results.violations,
    `${context}\n${JSON.stringify(summary, null, 2)}`,
  ).toEqual([]);
}

async function expandAndCheckChartTables(page: Page, useKeyboard = false) {
  const summaries = page.locator("summary", {
    hasText: "Ver dados do gráfico",
  });
  await expect(summaries).toHaveCount(4);

  for (let index = 0; index < (await summaries.count()); index += 1) {
    const summary = summaries.nth(index);
    const details = summary.locator("..");

    if (useKeyboard && index === 0) {
      await summary.focus();
      await expect(summary).toBeFocused();
      await page.keyboard.press("Enter");
    } else {
      await summary.click();
    }

    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByRole("table")).toBeVisible();
  }
}

test.describe("auditoria automática WCAG", () => {
  test("página de login", async ({ page }) => {
    await page.goto("/entrar");
    await expect(
      page.getByRole("heading", { name: "Acesso ao MAE APS" }),
    ).toBeVisible();

    await expectNoWcagViolations(page, "Violações na página de login");
  });

  test("dashboard do perfil Gestão e alternativas dos gráficos", async ({
    page,
  }) => {
    await signIn(page, "gestao");
    await expect(
      page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
    ).toBeVisible();
    await expandAndCheckChartTables(page, true);

    await expectNoWcagViolations(page, "Violações no dashboard da Gestão");
  });

  test("dashboard do perfil Leitura", async ({ page }) => {
    await signIn(page, "leitura");
    await expect(
      page.getByRole("heading", { name: "Olá, Gestão de Saúde" }),
    ).toBeVisible();
    await expandAndCheckChartTables(page);

    await expectNoWcagViolations(page, "Violações no dashboard de Leitura");
  });

  test("estados inválido e válido da importação", async ({ page }) => {
    await signIn(page, "gestao");
    await page.goto("/sistema/importar");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e-a11y-invalid.xlsx",
      mimeType: XLSX_MIME,
      buffer: invalidWorkbook(),
    });
    await expect(page.getByText("Erros que impedem a importação", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expectNoWcagViolations(
      page,
      "Violações no estado inválido da importação",
    );

    await fileInput.setInputFiles({
      name: "e2e-a11y-valid.xlsx",
      mimeType: XLSX_MIME,
      buffer: validWorkbook(),
    });
    await expect(page.getByText("E2E UBS Importada", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "Confirmar e publicar" }),
    ).toBeEnabled();
    await expectNoWcagViolations(
      page,
      "Violações no estado válido da importação",
    );
  });

  test("página de Administração", async ({ page }) => {
    await signIn(page, "admin");
    await expect(
      page.getByRole("heading", { name: "Administração" }),
    ).toBeVisible();

    await expectNoWcagViolations(page, "Violações na Administração");
  });

  test("página de Território e diálogo de edição", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/sistema/territorio");
    await expect(
      page.getByRole("heading", { name: "Território" }),
    ).toBeVisible();
    await expectNoWcagViolations(page, "Violações na página de Território");

    await page.getByRole("link", { name: "Editar território" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expectNoWcagViolations(
      page,
      "Violações no diálogo de edição territorial",
    );
  });
});

test.describe("teclado e gerenciamento de foco", () => {
  test("pula para o conteúdo e opera o menu do usuário", async ({ page }) => {
    await signIn(page, "gestao");

    const skipLink = page.getByRole("link", {
      name: "Pular para o conteúdo",
    });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#conteudo-principal")).toBeFocused();

    const userMenu = page.getByLabel("Abrir menu da conta");
    await userMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("details.management-user")).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Sair", exact: true }),
    ).toBeFocused();
  });

  test("mantém o foco nos filtros após atualizar a URL", async ({ page }) => {
    await signIn(page, "gestao");
    await page.goto(
      "/sistema/gestao?inicio=2099-01&fim=2099-01&distrito=all&ubs=all&equipe=all",
    );

    const district = page.locator('select[name="distrito"]');
    await district.focus();
    await district.selectOption({ label: "E2E Distrito Norte" });
    await expect(page).toHaveURL(/distrito=31001&ubs=all&equipe=all$/);
    await expect(page.locator('select[name="distrito"]')).toBeFocused();

    const establishment = page.locator('select[name="ubs"]');
    await establishment.focus();
    await establishment.selectOption({ label: "E2E UBS Alfa · 9990001" });
    await expect(page).toHaveURL(/distrito=31001&ubs=[0-9a-f-]+&equipe=all$/);
    await expect(page.locator('select[name="ubs"]')).toBeFocused();
  });

  test("mantém o foco no diálogo e fecha com Escape", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/sistema/territorio");
    await page.getByRole("link", { name: "Editar território" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/(?:\?|&)editar=/);
  });
});
