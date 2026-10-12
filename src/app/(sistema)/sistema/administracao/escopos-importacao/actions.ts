"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdministrator } from "@/lib/auth/guards";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

const formSchema = z.object({
  action: z.enum(["grant", "revoke"]),
  target: z.string().uuid(),
  scope: z.enum(["municipio", "equipe"]),
  ine: z.string().optional(),
  confirmMunicipality: z.string().optional(),
});

export async function manageImportScopeAction(formData: FormData) {
  const context = await requireAdministrator();
  const submitted = formSchema.safeParse({
    action: formData.get("action"),
    target: formData.get("target"),
    scope: formData.get("scope"),
    ine: formData.get("ine") || undefined,
    confirmMunicipality: formData.get("confirmMunicipality") || undefined,
  });
  if (!submitted.success) redirect("/sistema/administracao/escopos-importacao?result=erro");
  const data = submitted.data;
  const ine = data.scope === "equipe" ? (data.ine ?? "").trim() : null;
  if (data.scope === "equipe" && !/^\d{10}$/.test(ine ?? "")) {
    redirect("/sistema/administracao/escopos-importacao?result=ine-invalido");
  }
  if (data.action === "grant" && data.scope === "municipio" && data.confirmMunicipality !== "yes") {
    redirect("/sistema/administracao/escopos-importacao?result=confirmar-municipio");
  }

  const privileged = createPrivilegedClient();
  const result = await privileged.rpc("manage_siaps_c3_scope_v3", {
    p_actor: context.user.id,
    p_target: data.target,
    p_action: data.action,
    p_scope_kind: data.scope,
    p_ine: ine,
  });
  if (result.error) {
    // Erro genérico: evita exibir detalhes internos da autorização e do banco.
    console.error(JSON.stringify({ area: "siaps_scope_admin", code: result.error.code }));
    redirect("/sistema/administracao/escopos-importacao?result=erro");
  }
  revalidatePath("/sistema/administracao/escopos-importacao");
  redirect("/sistema/administracao/escopos-importacao?result=salvo");
}
