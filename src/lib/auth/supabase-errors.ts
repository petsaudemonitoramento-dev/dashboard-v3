/**
 * Interpretação de erros do Supabase Auth que precisam de tratamento
 * específico na interface.
 *
 * Vive fora de `actions.ts` porque um módulo `"use server"` só pode exportar
 * funções assíncronas — e porque assim a regra fica testável isoladamente.
 */

export type SupabaseAuthErrorLike = {
  code?: string | null;
  message?: string | null;
};

/**
 * Com "Secure password change" habilitado, o Supabase exige que a sessão tenha
 * sido criada nas últimas 24 horas para permitir a troca de senha sem nonce.
 *
 * O fluxo de recuperação nunca cai aqui: o link de recuperação cria uma sessão
 * nova no momento do clique. Quem cai aqui é a sessão antiga — o caso que a
 * proteção existe para bloquear.
 */
export function isReauthenticationRequired(error: SupabaseAuthErrorLike | null) {
  if (!error) {
    return false;
  }
  if (error.code === "reauthentication_needed") {
    return true;
  }
  return /reauthentication/i.test(error.message ?? "");
}
