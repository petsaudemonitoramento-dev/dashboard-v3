"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveProfileContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { ok: boolean; message: string; name: string };
const nameSchema = z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.")
  .max(80, "O nome deve ter no máximo 80 caracteres.")
  .refine((value) => !/[<>\u0000-\u001f\u007f]/.test(value), "Nome contém caracteres inválidos.");

export async function updateDisplayNameAction(
  _previous: ProfileFormState, formData: FormData,
): Promise<ProfileFormState> {
  // O guard confere autenticação, perfil ativo e vínculo do usuário.
  await getActiveProfileContext();
  const result = nameSchema.safeParse(formData.get("display_name"));
  if (!result.success) {
    return { ok: false, name: "", message: result.error.issues[0]?.message ?? "Nome inválido." };
  }
  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  if (!auth.data.user || auth.error) return { ok: false, name: "", message: "Sessão expirada. Entre novamente." };
  // Apenas metadados de apresentação. NUNCA editar perfil RBAC, e-mail ou papel.
  const updated = await supabase.auth.updateUser({ data: { display_name: result.data } });
  if (updated.error) return { ok: false, name: "", message: "Não foi possível salvar o nome." };
  revalidatePath("/sistema", "layout");
  return { ok: true, name: result.data, message: "Nome atualizado no seu perfil." };
}
