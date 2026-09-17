"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getPublicEnv } from "@/config/env";
import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  adminProfileUpdateSchema,
  completeProfileSchema,
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

async function requestOrigin() {
  const env = getPublicEnv();
  if (env.NEXT_PUBLIC_APP_URL) {
    return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Configure NEXT_PUBLIC_APP_URL para autenticação.");
  }
  return protocol + "://" + host;
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

  const origin = await requestOrigin();
  const supabase = await createClient();
  const result = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin + "/auth/callback?next=/completar-cadastro",
      data: { registration_source: "public_professional" },
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
  const origin = await requestOrigin();
  const supabase = await createClient();
  const result = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: origin + "/auth/callback?next=/completar-cadastro",
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

  const origin = await requestOrigin();
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
    return initialError("Não foi possível atualizar a senha.");
  }
  redirect("/sistema");
}

export async function completeProfileAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = completeProfileSchema.safeParse({
    fullName: formValue(formData, "fullName"),
    phone: formValue(formData, "phone"),
    professionalRegistration: formValue(formData, "professionalRegistration"),
  });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const authResult = await supabase.auth.getUser();
  if (!authResult.data.user) {
    redirect("/entrar");
  }

  const result = await supabase.schema("security").rpc("complete_profile", {
    p_full_name: parsed.data.fullName,
    p_phone: parsed.data.phone,
    p_professional_registration: parsed.data.professionalRegistration,
  });
  if (result.error) {
    return initialError("Não foi possível completar o cadastro.");
  }

  redirect("/aguardando-aprovacao?status=pendente");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function updateProfileByAdministratorAction(formData: FormData) {
  await requireAdministrator();

  const parsed = adminProfileUpdateSchema.safeParse({
    userId: formValue(formData, "userId"),
    role: formValue(formData, "role"),
    approvalStatus: formValue(formData, "approvalStatus"),
    isActive: formValue(formData, "isActive") === "true",
    isBlocked: formValue(formData, "isBlocked") === "true",
  });
  if (!parsed.success) {
    throw new Error("Alteração administrativa inválida.");
  }

  const supabase = await createClient();
  const result = await supabase.schema("security").rpc("admin_update_profile", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_approval_status: parsed.data.approvalStatus,
    p_is_active: parsed.data.isActive,
    p_blocked: parsed.data.isBlocked,
  });
  if (result.error) {
    throw new Error("Não foi possível atualizar o perfil.");
  }

  redirect("/sistema/administracao");
}
