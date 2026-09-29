"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "gestao", "leitura"]) });

export async function manageProfileAction(formData: FormData) {
  await requireAdministrator();
  const parsed = schema.safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) redirect("/sistema/administracao?status=erro");
  const supabase = await createClient();
  const result = await supabase.rpc("manage_profile", { p_user_id: parsed.data.userId, p_role: parsed.data.role, p_active: formData.get("active") === "true" });
  if (!result.error) revalidatePath("/sistema/administracao");
  redirect(result.error ? "/sistema/administracao?status=erro" : "/sistema/administracao?status=salvo");
}
