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

export function describeSignUpError(error: SupabaseAuthErrorLike | null) {
  switch (error?.code) {
    case "email_address_invalid":
      return "Informe um endereço de e-mail válido.";
    case "over_email_send_rate_limit":
      return "O serviço de confirmação por e-mail atingiu o limite temporário de envios. Tente novamente mais tarde ou continue com Google.";
    case "signup_disabled":
      return "O cadastro por e-mail está temporariamente indisponível.";
    case "weak_password":
      return "A senha não atende aos requisitos de segurança.";
    case "user_already_exists":
      return "Já existe uma conta associada a este e-mail.";
    default:
      return "Não foi possível criar a conta. Tente novamente ou continue com Google.";
  }
}

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
