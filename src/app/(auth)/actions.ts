"use server";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/config/env";
import { isReauthenticationRequired } from "@/lib/auth/supabase-errors";
import { createClient } from "@/lib/supabase/server";
import {
  passwordRecoverySchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

export type FormState = {
  message: string;
  ok: boolean;
};

const initialError = (message: string): FormState => ({ message, ok: false });

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Origem canônica da aplicação.
 *
 * Vem exclusivamente da configuração. Nenhum cabeçalho da requisição
 * (`x-forwarded-host`, `host`, `x-forwarded-proto`) participa da decisão:
 * eles são controlados por quem faz a chamada e permitiriam apontar o link de
 * recuperação de senha para um domínio hostil, entregando o `code` da vítima.
 *
 * `getPublicEnv()` falha explicitamente no boot se a variável não estiver
 * configurada, então aqui o valor é sempre confiável.
 */
function canonicalOrigin() {
  return getPublicEnv().NEXT_PUBLIC_APP_URL;
}

export async function signInAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const result = await supabase.auth.signInWithPassword(parsed.data);
  if (result.error) {
    return initialError("E-mail ou senha inválidos.");
  }

  redirect("/sistema");
}

export async function signUpAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    passwordConfirmation: formValue(formData, "passwordConfirmation"),
  });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const origin = canonicalOrigin();
  const supabase = await createClient();
  const result = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin + "/auth/callback?next=/aguardando-aprovacao",
      data: { registration_source: "dashboard_management" },
    },
  });

  if (result.error) {
    return initialError("Não foi possível criar a conta.");
  }

  return {
    ok: true,
    message: "Conta criada. Confirme o e-mail para continuar.",
  };
}

export async function signInWithGoogleAction() {
  const origin = canonicalOrigin();
  const supabase = await createClient();
  const result = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: origin + "/auth/callback?next=/sistema",
      skipBrowserRedirect: true,
    },
  });

  if (!result.data.url) {
    redirect("/entrar?erro=oauth");
  }
  redirect(result.data.url);
}

export async function requestPasswordResetAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordRecoverySchema.safeParse({
    email: formValue(formData, "email"),
  });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "E-mail inválido.");
  }

  const origin = canonicalOrigin();
  const supabase = await createClient();
  const result = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin + "/auth/callback?next=/redefinir-senha",
  });
  if (result.error) {
    return initialError("Não foi possível enviar a recuperação.");
  }

  return {
    ok: true,
    message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
  };
}

export async function updatePasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formValue(formData, "password"),
    passwordConfirmation: formValue(formData, "passwordConfirmation"),
  });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "Senha inválida.");
  }

  const supabase = await createClient();
  const result = await supabase.auth.updateUser({ password: parsed.data.password });
  if (result.error) {
    // Com "Secure password change" ativo, o Supabase só aceita a troca quando a
    // sessão foi criada nas últimas 24h. O fluxo "Esqueci minha senha" sempre
    // satisfaz isso, porque o link de recuperação cria uma sessão nova. Uma
    // sessão antiga esquecida em dispositivo compartilhado, não — e é
    // exatamente esse caso que passa a exigir novo login.
    if (isReauthenticationRequired(result.error)) {
      return initialError(
        "Por segurança, refaça o login ou use o link de recuperação para definir uma nova senha.",
      );
    }
    return initialError("Não foi possível atualizar a senha.");
  }
  redirect("/sistema");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
