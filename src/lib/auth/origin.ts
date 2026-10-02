import { getPublicEnv } from "@/config/env";

type AuthOriginEnvironment = {
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
};

function normalizeVercelHost(value: string | undefined) {
  const host = String(value || "").trim();
  if (!host || host.includes("/") || host.includes("@") || host.includes(":")) {
    return null;
  }
  if (!/^[a-z0-9.-]+\.vercel\.app$/i.test(host)) {
    return null;
  }
  return host.toLowerCase();
}

/**
 * Origem confiável para fluxos de autenticação.
 *
 * Produção e ambiente local usam NEXT_PUBLIC_APP_URL.
 * Em Preview da Vercel, usamos a URL estável da branch fornecida pela própria
 * plataforma. Isso evita que OAuth/PKCE saia do domínio onde o cookie do
 * code_verifier foi criado.
 *
 * Nenhum header HTTP participa desta resolução.
 */
export function resolveAuthOrigin(environment?: AuthOriginEnvironment) {
  const source: AuthOriginEnvironment = environment ?? {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  const configured = getPublicEnv().NEXT_PUBLIC_APP_URL;

  if (source.VERCEL_ENV !== "preview") {
    return configured;
  }

  const branchHost =
    normalizeVercelHost(source.VERCEL_BRANCH_URL)
    ?? normalizeVercelHost(source.VERCEL_URL);

  return branchHost ? `https://${branchHost}` : configured;
}
