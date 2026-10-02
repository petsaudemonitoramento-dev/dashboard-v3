const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parsedUrl(value: string, label: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} não é uma URL válida.`);
  }
}

export function assertLoopbackUrl(value: string, label: string) {
  const url = parsedUrl(value, label);
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `${label} precisa apontar para loopback. Os testes E2E nunca executam contra ambientes remotos.`,
    );
  }
  return url;
}

export function assertSafeE2EEnvironment() {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
  const supabaseUrl =
    process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const databaseUrl = process.env.E2E_DATABASE_URL;

  assertLoopbackUrl(baseUrl, "E2E_BASE_URL");
  if (!supabaseUrl) throw new Error("E2E_SUPABASE_URL não foi configurada.");
  if (!databaseUrl) throw new Error("E2E_DATABASE_URL não foi configurada.");
  assertLoopbackUrl(supabaseUrl, "E2E_SUPABASE_URL");
  assertLoopbackUrl(databaseUrl, "E2E_DATABASE_URL");

  if (!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("E2E_SUPABASE_SERVICE_ROLE_KEY não foi configurada.");
  }

  return { baseUrl, databaseUrl, supabaseUrl };
}
