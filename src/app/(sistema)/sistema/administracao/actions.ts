"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "gestao", "leitura"]),
});

export async function manageProfileAction(formData: FormData) {
  await requireAdministrator();
  const input = schema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  const supabase = await createClient();
  const active = formData.get("active") === "true";
  const result = await supabase.rpc("manage_profile", {
    p_user_id: input.userId,
    p_role: input.role,
    p_active: active,
  });

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/sistema/administracao");
  redirect(
    `/sistema/administracao?salvo=${encodeURIComponent(input.userId)}&papel=${encodeURIComponent(input.role)}&ativo=${active ? "1" : "0"}`,
  );
}
