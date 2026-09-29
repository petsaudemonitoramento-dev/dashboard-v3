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

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirect("/sistema/administracao?erro=1");
  }

  const active = formData.get("active") === "true";
  const supabase = await createClient();
  const result = await supabase.rpc("manage_profile", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_active: active,
  });

  if (result.error) {
    redirect("/sistema/administracao?erro=1");
  }

  revalidatePath("/sistema/administracao");
  redirect(
    `/sistema/administracao?salvo=${encodeURIComponent(parsed.data.userId)}&papel=${encodeURIComponent(parsed.data.role)}&ativo=${active ? "1" : "0"}`,
  );
}
