import { z } from "zod";

/**
 * HTTP é tolerado apenas em loopback, para não inviabilizar `next dev`.
 * Qualquer host real precisa de HTTPS.
 */
function isLoopbackOrigin(value: string) {
  try {
    const { protocol, hostname } = new URL(value);
    return (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine(
    (value) => value.startsWith("https://"),
    "A URL do Supabase deve usar HTTPS.",
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20)
    .refine(
      (value) => !value.toLowerCase().includes("service_role"),
      "Use somente uma chave publicável no cliente.",
    ),
  // Obrigatória: é a origem canônica usada para montar todos os links de
  // autenticação enviados por e-mail (confirmação, OAuth e recuperação de
  // senha). Sem ela o servidor precisaria inferir a origem a partir de
  // cabeçalhos da requisição, o que permite envenenar o link de recuperação
  // com `X-Forwarded-Host` e sequestrar a conta.
  NEXT_PUBLIC_APP_URL: z
    .url("Configure NEXT_PUBLIC_APP_URL com a URL canônica da aplicação.")
    .refine(
      (value) => !value.endsWith("/"),
      "NEXT_PUBLIC_APP_URL não deve terminar com barra.",
    )
    .refine(
      (value) =>
        value.startsWith("https://") || isLoopbackOrigin(value),
      "NEXT_PUBLIC_APP_URL deve usar HTTPS fora do ambiente local.",
    ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  return publicEnvSchema.parse(source);
}

let cachedEnv: PublicEnv | undefined;

export function getPublicEnv() {
  cachedEnv ??= parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  return cachedEnv;
}
