import { NextResponse, type NextRequest } from "next/server";

import { requireDashboardAccess } from "@/lib/auth/guards";
import { AccessDeniedError } from "@/lib/auth/types";
import { getMetabaseGuestConfig, signManagementDashboardGuestToken } from "@/lib/metabase/guest-embed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Cookie, Origin",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const config = getMetabaseGuestConfig();
  if (!config) return jsonError("Análises avançadas ainda não configuradas.", 503);

  // Não permitir solicitação de JWT a partir de outra origem.
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    return jsonError("Origem não autorizada.", 403);
  }
  if (origin && origin !== request.nextUrl.origin) {
    return jsonError("Origem não autorizada.", 403);
  }

  // Nenhum filtro territorial ou ID arbitrário é permitido no payload.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declaredLength) || declaredLength > 4096) {
    return jsonError("Solicitação inválida.", 400);
  }

  try {
    await requireDashboardAccess();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return jsonError("Sessão ou permissão insuficiente.", error.code === "UNAUTHENTICATED" ? 401 : 403);
    }
    return jsonError("Não foi possível validar a sessão.", 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Solicitação inválida.", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Solicitação inválida.", 400);
  }
  const data = payload as Record<string, unknown>;
  if (Object.keys(data).some((key) => !["entityType", "entityId", "customContext"].includes(key))
      || data.entityType !== "dashboard"
      || (data.entityId !== config.dashboardId && data.entityId !== String(config.dashboardId))) {
    return jsonError("Painel não autorizado.", 403);
  }

  return NextResponse.json(
    { jwt: signManagementDashboardGuestToken(config) },
    { headers: NO_STORE },
  );
}
