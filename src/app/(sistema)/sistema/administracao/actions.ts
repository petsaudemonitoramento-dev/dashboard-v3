"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "gestao", "leitura"]) });

export async function manageProfileAction(formData: FormData) {
  await requireAdministrator();
  const input = schema.parse({ userId: formData.get("userId"), role: formData.get("role") });
  const supabase = await createClient();
  const result = await supabase.rpc("manage_profile", { p_user_id: input.userId, p_role: input.role, p_active: formData.get("active") === "true" });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/sistema/administracao");
}
