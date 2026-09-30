import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { invalidWorkbook, validWorkbook } from "./support/workbook";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

test.beforeEach(async ({ page }) => {
  await signIn(page, "gestao");
  await page.goto("/sistema/importar");
});

test("recusa uma planilha inválida antes da publicação", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-invalid-import.xlsx",
    mimeType: XLSX_MIME,
    buffer: invalidWorkbook(),
  });

  await expect(page.getByText("Erros que impedem a importação")).toBeVisible();
  await expect(
    page.getByText("Cabeçalho SIAPS com CNES e INE não encontrado."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar e publicar" }),
  ).toBeDisabled();
});

test("valida e publica uma planilha válida", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-valid-import.xlsx",
    mimeType: XLSX_MIME,
    buffer: validWorkbook(),
  });

  await expect(page.getByText("Registros válidos")).toBeVisible();
  await expect(page.getByText("E2E UBS Importada")).toBeVisible();
  const publish = page.getByRole("button", { name: "Confirmar e publicar" });
  await expect(publish).toBeEnabled();
  await publish.click();

  await expect(page.getByRole("status")).toContainText(
    "Importação publicada: 1 registros válidos.",
  );
});
