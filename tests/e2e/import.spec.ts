import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";
import { invalidWorkbook, validWorkbook } from "./support/workbook";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

test.beforeEach(async ({ page }) => {
  await signIn(page, "gestao");
  await page.goto("/sistema/importar");
});

test("recusa planilha sem cabeçalho inequívoco", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-invalid-import.xlsx",
    mimeType: XLSX_MIME,
    buffer: invalidWorkbook(),
  });
  await expect(page.getByText("Erros que impedem a importação", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Cabeçalho C3 com CNES e INE não encontrado em nenhuma aba.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analisar duplicidades e permissões" })).toBeDisabled();
});

test("exibe prévia e só publica novas equipes depois de autorização", async ({ page }) => {
  await page.route("**/api/importacoes", async route => {
    const body = route.request().postDataJSON() as { mode: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body.mode === "check"
        ? { preview: { previewId: "11111111-1111-4111-8111-111111111111",
            new: 1, identical: 0, conflicts: 0, unauthorized: 0, details: [] } }
        : { status: "publicado", added: 1, unchanged: 0 }),
    });
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-valid-import.xlsx", mimeType: XLSX_MIME, buffer: validWorkbook(),
  });

  await expect(page.getByText("E2E UBS Importada", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Analisar duplicidades e permissões" }).click();
  await expect(page.getByText("Prévia antes da publicação")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar inclusão segura" }).click();
  await expect(page.getByText(/Conciliação publicada: 1 novas equipes/)).toBeVisible();
});

test("bloqueia publicação de equipes com conflito e fora do escopo", async ({ page }) => {
  await page.route("**/api/importacoes", async route => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ preview: { previewId: "22222222-2222-4222-8222-222222222222",
        new: 1, identical: 1, conflicts: 1, unauthorized: 1,
        details: [{ fileRow: 3, ine: "1234567890", cnes: "1234567", status: "conflito" }] } }),
    });
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-conflict-import.xlsx", mimeType: XLSX_MIME, buffer: validWorkbook(),
  });
  await page.getByRole("button", { name: "Analisar duplicidades e permissões" }).click();
  await expect(page.getByText("Publicação bloqueada por segurança.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar inclusão segura" })).toBeDisabled();
});
