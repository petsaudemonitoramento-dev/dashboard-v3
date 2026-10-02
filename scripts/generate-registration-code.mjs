import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const files = [
  "src/lib/siaps/parser.ts",
  "src/lib/siaps/compact.ts",
  "src/lib/siaps/limits.ts",
  "src/lib/analytics/c3.ts",
  "src/lib/analytics/dashboard-filters.ts",
  "src/lib/analytics/dashboard-data.ts",
  "src/lib/analytics/management-pages.ts",
  "src/lib/auth/guards.ts",
  "src/lib/administration/pagination.ts",
  "src/lib/administration/users.ts",
  "src/lib/administration/supabase-users.ts",
  "src/lib/http/import-errors.ts",
  "src/lib/http/request-body.ts",
  "src/lib/observability/sentry-privacy.ts",
  "src/config/security-headers.ts",
  "src/app/api/importacoes/route.ts",
  "src/components/siaps/import-wizard.tsx",
  "src/components/dashboard/dashboard-filters.tsx",
  "src/components/charts/mae-chart.tsx",
  "src/app/(sistema)/sistema/gestao/page.tsx",
  "src/app/(sistema)/sistema/administracao/actions.ts",
  "src/app/(sistema)/sistema/administracao/page.tsx",
  "src/app/(sistema)/sistema/territorio/actions.ts",
  "supabase/migrations/20260918004231_management_schema_snapshot.sql",
  "supabase/migrations/20260923002658_mae_aps_v1_operations.sql",
  "supabase/migrations/20260923054500_admin_establishment_identity.sql",
  "supabase/migrations/20260929004905_production_audit_hardening.sql",
  "supabase/migrations/20260930010500_dashboard_practice_totals.sql",
  "supabase/migrations/20260930013000_protect_last_active_admin.sql",
  "supabase/migrations/20260930014500_reconcile_production_functions.sql",
];

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Informe um valor para ${name}.`);
  }
  return value;
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

const requestedRef = argument("--ref") ?? "HEAD";
const outputArgument = argument("--output");
const commit = git(["rev-parse", "--verify", `${requestedRef}^{commit}`]).trim();
const output = outputArgument
  ? resolve(outputArgument)
  : resolve(repoRoot, "docs/registro/trechos-codigo-v1.txt");
const sections = [
  "MAE APS - selecao de codigo autoral V1",
  `commit=${commit}`,
  `files=${files.length}`,
  "encoding=utf-8",
  "line_endings=lf",
];

for (const file of files) {
  const content = git(["show", `${commit}:${file}`]).replace(/\r\n/g, "\n").trimEnd();
  const lineCount = content ? content.split("\n").length : 0;
  sections.push(`// origem: ${file} | linhas: 1-${lineCount}\n${content}`);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${sections.join("\n\n")}\n`, "utf8");
console.log(output);
