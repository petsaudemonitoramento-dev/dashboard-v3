import { createHmac } from "node:crypto";

const TOKEN_LIFETIME_SECONDS = 300;

type GuestEmbedConfig = {
  dashboardId: number;
  publicUrl: string;
  secretKey: string;
};

function validateHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:") {
      if (process.env.NODE_ENV === "production" || url.protocol !== "http:" || url.hostname !== "localhost") return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Configuração de embed OSS deliberadamente desligada até a VM estar pronta.
 * Nunca colocar o segredo em NEXT_PUBLIC_ nem retornar em JSON/HTML/logs. */
export function getMetabaseGuestConfig(): GuestEmbedConfig | null {
  if (process.env.METABASE_GUEST_EMBED_ENABLED !== "true") return null;

  const publicUrl = validateHttpsUrl(process.env.METABASE_PUBLIC_URL ?? "");
  const idText = process.env.METABASE_DASHBOARD_ID ?? "";
  const secretKey = process.env.METABASE_GUEST_SECRET_KEY ?? "";
  if (!publicUrl || !/^[1-9]\d{0,9}$/.test(idText) || secretKey.length < 32) return null;

  const dashboardId = Number(idText);
  if (!Number.isSafeInteger(dashboardId) || dashboardId < 1) return null;
  return { dashboardId, publicUrl, secretKey };
}

function encodeBase64Url(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

/** Assina SOMENTE o painel municipal previamente autorizado e parametrizado.
 * Não aceita IDs ou filtros do navegador, nem dá acesso ao editor de BI. */
export function signManagementDashboardGuestToken(
  config: GuestEmbedConfig,
  issuedAt: number = Math.floor(Date.now() / 1000),
): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({
    resource: { dashboard: config.dashboardId },
    params: {},
    iat: issuedAt,
    exp: issuedAt + TOKEN_LIFETIME_SECONDS,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", config.secretKey)
    .update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}
