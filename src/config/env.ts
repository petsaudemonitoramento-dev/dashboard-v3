import { z } from "zod";

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
  NEXT_PUBLIC_APP_URL: z.url().optional(),
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
