import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/config/env";

export function createPrivilegedClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY não configurada no ambiente do servidor.");
  }

  return createClient(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
