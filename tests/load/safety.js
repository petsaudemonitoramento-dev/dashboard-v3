const PROFILES = Object.freeze({
  "10": { duration: "1m", vus: 10 },
  "50": { duration: "2m", vus: 50 },
  "100": { duration: "2m", vus: 100 },
});

const BLOCKED_PRODUCTION_HOSTS = new Set([
  "maeaps.vercel.app",
]);

export function resolveLoadProfile(value) {
  const profile = String(value || "10");
  const resolved = PROFILES[profile];
  if (!resolved) {
    throw new Error("K6_PROFILE deve ser 10, 50 ou 100.");
  }
  return { name: profile, ...resolved };
}

export function validateLoadTarget(environment) {
  const rawTarget = String(environment.K6_BASE_URL || "").trim();
  if (!rawTarget) throw new Error("K6_BASE_URL é obrigatório.");

  let target;
  try {
    target = new URL(rawTarget);
  } catch {
    throw new Error("K6_BASE_URL deve ser uma origem HTTP(S) válida.");
  }
  if (!/^https?:$/.test(target.protocol)
    || target.username
    || target.password
    || target.pathname !== "/"
    || target.search
    || target.hash) {
    throw new Error("K6_BASE_URL deve conter somente a origem, sem credenciais, caminho, query ou fragmento.");
  }

  const hostname = target.hostname.toLowerCase();
  const normalizedHostname = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
  const loopback = normalizedHostname === "localhost" || normalizedHostname === "127.0.0.1";
  if (BLOCKED_PRODUCTION_HOSTS.has(normalizedHostname)) {
    throw new Error("Execução contra produção está bloqueada nesta etapa.");
  }
  const targetEnvironment = String(environment.K6_ENVIRONMENT || (loopback ? "local" : ""));
  if (targetEnvironment === "production") {
    throw new Error("Execução contra produção está bloqueada nesta etapa.");
  }
  if (!loopback && (
    targetEnvironment !== "staging"
    || environment.K6_ALLOW_REMOTE !== "STAGING_AUTORIZADO"
  )) {
    throw new Error("Alvo remoto exige K6_ENVIRONMENT=staging e K6_ALLOW_REMOTE=STAGING_AUTORIZADO.");
  }

  return target.origin;
}
