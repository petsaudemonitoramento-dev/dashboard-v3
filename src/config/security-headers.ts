export type SecurityHeader = Readonly<{
  key: string;
  value: string;
}>;

// Estas diretivas não restringem os scripts ou as conexões usados por Next.js,
// Supabase Auth, ECharts e Sentry. Uma CSP mais ampla deve ser testada primeiro
// em Report-Only no ambiente de staging.
export const CONTENT_SECURITY_POLICY = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
] as const satisfies readonly SecurityHeader[];
