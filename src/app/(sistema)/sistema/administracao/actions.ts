"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteAdministrationUserFromSupabase } from "@/lib/administration/delete-user-supabase";
import { administrationActionHref } from "@/lib/administration/pagination";
import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "gestao", "leitura"]),
});

const deleteSchema = z.object({
  userId: z.string().uuid(),
});

export async function manageProfileAction(formData: FormData) {
  await requireAdministrator();
  const page = formData.get("page");
  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirect(administrationActionHref(page, "erro"));
  }

  const supabase = await createClient();
  const result = await supabase.rpc("manage_profile", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_active: formData.get("active") === "true",
  });
  if (!result.error) {
    revalidatePath("/sistema/administracao");
  }
  redirect(administrationActionHref(page, result.error ? "erro" : "salvo"));
}

export async function deleteProfileAction(formData: FormData) {
  const context = await requireAdministrator();
  const page = formData.get("page");
  const parsed = deleteSchema.safeParse({ userId: formData.get("userId") });

  if (!parsed.success) {
    redirect(administrationActionHref(page, "erro"));
  }

  let deletionResult: "admin_protected" | "deleted";
  try {
    deletionResult = await deleteAdministrationUserFromSupabase(
      context.user.id,
      parsed.data.userId,
    );
  } catch {
    console.error("Falha ao excluir perfil pela Administração.");
    redirect(administrationActionHref(page, "erro"));
  }

  if (deletionResult === "admin_protected") {
    redirect(administrationActionHref(page, "admin-protegido"));
  }

  revalidatePath("/sistema/administracao");
  redirect(administrationActionHref(page, "excluido"));
}
