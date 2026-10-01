import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { requireAdministrator } from "@/lib/auth/guards";

export const runtime = "nodejs";

const DIAGNOSTIC_HEADER = "sentry-preview";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  if (request.headers.get("x-maeaps-diagnostic") !== DIAGNOSTIC_HEADER) {
    return NextResponse.json({ error: "Diagnóstico não autorizado." }, { status: 400 });
  }

  try {
    await requireAdministrator();
  } catch {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return NextResponse.json(
      { error: "Sentry não está configurado neste Preview." },
      { status: 503 },
    );
  }

  const syntheticError = new Error(
    "MAE_APS_SENTRY_PREVIEW_TEST preview-test@example.com " +
      "Bearer abc.def.ghi teste-sentry.xlsx 203.0.113.10",
  );

  const eventId = Sentry.captureException(syntheticError, {
    tags: {
      diagnostic: "preview-sentry",
      environment: "preview",
    },
    extra: {
      email: "preview-test@example.com",
      token: "Bearer abc.def.ghi",
      filename: "teste-sentry.xlsx",
      ip: "203.0.113.10",
      payload: {
        rows: [{ cnes: "0000000", ine: "0000000000" }],
      },
    },
  });

  await Sentry.flush(2_000);

  return NextResponse.json({
    ok: true,
    eventId,
    marker: "MAE_APS_SENTRY_PREVIEW_TEST",
  });
}
