import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const files = [
  "src/lib/siaps/parser.ts",
  "src/lib/analytics/c3.ts",
  "src/lib/auth/guards.ts",
  "src/lib/http/import-errors.ts",
  "src/app/api/importacoes/route.ts",
  "src/app/(sistema)/sistema/gestao/page.tsx",
  "src/app/(sistema)/sistema/territorio/actions.ts",
  "supabase/migrations/20260923002658_mae_aps_v1_operations.sql",
  "supabase/migrations/20260923054500_admin_establishment_identity.sql",
];
const output = resolve("docs/registro/trechos-codigo-v1.txt");
const sections = [];
for (const file of files) {
  const content = (await readFile(resolve(file), "utf8")).replace(/\r\n/g, "\n").trimEnd();
  const lineCount = content ? content.split("\n").length : 0;
  sections.push(`// origem: ${file} | linhas: 1-${lineCount}\n${content}`);
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${sections.join("\n\n")}\n`, "utf8");
console.log(output);
