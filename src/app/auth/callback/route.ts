import { NextResponse } from "next/server";

import { getPublicEnv } from "@/config/env";
import { safeNext } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // A origem vem da configuração, nunca de `request.url`: o host da requisição
  // é influenciado por cabeçalhos e reabriria o mesmo vetor fechado em
  // `canonicalOrigin()` nas Server Actions.
  const origin = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (!result.error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=callback", origin));
}
