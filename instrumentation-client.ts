import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/observability/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  beforeSend: sanitizeSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
