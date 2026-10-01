import type { Event } from "@sentry/nextjs";

const SENSITIVE_KEY =
  /(authorization|cookie|email|file_?sha|filename|password|payload|rows|secret|session|token)/i;
const DIRECT_IDENTIFIER_KEY =
  /^(?:ip|ip_?address|user_?agent|user_?id|profile_?id|actor_?user_?id|auth_?user_?id)$/i;
const QUERY_METADATA_KEY =
  /(?:^|[._-])(?:query|query_?string|search|search_?params|params)(?:$|[._-])/i;

export function sanitizeTelemetryText(value: string) {
  return value
    .replace(/https?:\/\/[^\s?#]+(?:\?[^\s#]*)?(?:#[^\s]*)?/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[url-removida]";
      }
    })
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[email-removido]",
    )
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [token-removido]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[jwt-removido]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, "[chave-removida]")
    .replace(/\b(?:postgres|postgresql):\/\/[^\s]+/gi, "[conexao-removida]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip-removido]")
    .replace(/\b[A-F0-9]{1,4}(?::[A-F0-9]{0,4}){2,7}\b/gi, "[ip-removido]")
    .replace(/\b[^\s/\\]+\.xlsx\b/gi, "[arquivo-xlsx]");
}

function sanitizeValue(value: unknown, key = "", depth = 0): unknown {
  if (
    SENSITIVE_KEY.test(key)
    || DIRECT_IDENTIFIER_KEY.test(key)
    || QUERY_METADATA_KEY.test(key)
  ) {
    return "[removido]";
  }
  if (typeof value === "string") return sanitizeTelemetryText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= 4) return "[profundidade-limitada]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, "", depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      sanitizeValue(childValue, childKey, depth + 1),
    ]),
  );
}

export function sanitizeSentryEvent<T extends Event>(event: T): T {
  const sanitized: Event = {
    ...event,
    message: event.message ? sanitizeTelemetryText(event.message) : event.message,
    server_name: undefined,
    user: undefined,
  };

  if (event.request) {
    sanitized.request = {
      method: event.request.method,
      url: event.request.url
        ? sanitizeTelemetryText(event.request.url)
        : undefined,
    };
  }

  if (event.exception?.values) {
    sanitized.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => ({
        ...exception,
        value: exception.value
          ? sanitizeTelemetryText(exception.value)
          : exception.value,
      })),
    };
  }

  sanitized.extra = sanitizeValue(event.extra) as Event["extra"];
  sanitized.contexts = sanitizeValue(event.contexts) as Event["contexts"];
  sanitized.tags = sanitizeValue(event.tags) as Event["tags"];
  sanitized.breadcrumbs = event.breadcrumbs?.slice(-20).map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message
      ? sanitizeTelemetryText(breadcrumb.message)
      : breadcrumb.message,
    data: sanitizeValue(breadcrumb.data) as typeof breadcrumb.data,
  }));

  return sanitized as T;
}
