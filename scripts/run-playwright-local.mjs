import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const supabaseCli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseEnvironment(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        const name = line.slice(0, separator);
        const raw = line.slice(separator + 1).trim();
        return [name, raw.replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const playwrightArguments = process.argv.slice(2);
const listOnly = playwrightArguments.includes("--list");

if (listOnly) {
  const listed = spawnSync(
    process.execPath,
    [playwrightCli, "test", ...playwrightArguments],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_BASE_URL: "http://127.0.0.1:3100",
        E2E_DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        E2E_SUPABASE_SERVICE_ROLE_KEY: "local-list-only",
        E2E_SUPABASE_URL: "http://127.0.0.1:54321",
      },
    },
  );
  if (listed.error) fail(`Não foi possível listar os testes E2E: ${listed.error.message}`);
  process.exit(listed.status ?? 1);
}

const status = spawnSync(
  process.execPath,
  [supabaseCli, "status", "-o", "env"],
  { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } },
);

if (status.status !== 0) {
  fail(
    "O Supabase local não está disponível. Use `npm run test:e2e:list` nesta máquina e execute a suíte completa pelo pull request no GitHub Actions; não é necessário instalar Docker ou Chromium localmente.",
  );
}

const local = parseEnvironment(status.stdout);
const supabaseUrl = local.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = local.PUBLISHABLE_KEY ?? local.ANON_KEY;
const serviceRoleKey = local.SECRET_KEY ?? local.SERVICE_ROLE_KEY;
const databaseUrl = local.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!publishableKey || !serviceRoleKey) {
  fail("O status local do Supabase não retornou as chaves necessárias para o E2E.");
}

const test = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...playwrightArguments],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_BASE_URL: "http://127.0.0.1:3100",
      E2E_DATABASE_URL: databaseUrl,
      E2E_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      E2E_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      SUPABASE_SECRET_KEY: serviceRoleKey,
      SUPABASE_TELEMETRY_DISABLED: "1",
    },
  },
);

if (test.error) fail(`Não foi possível iniciar o Playwright: ${test.error.message}`);
process.exit(test.status ?? 1);
