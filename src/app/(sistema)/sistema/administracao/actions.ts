"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { adminActionSchema } from "@/lib/validation/admin";

export type AdminActionState = {
  ok: boolean;
  message: string;
};

/**
 * Camadas de proteção desta ação, nesta ordem:
 *   1. `requireAdministrator()` — perfil verificado no servidor;
 *   2. validação estrita da entrada;
 *   3. `security.admin_apply_profile_action` — revalida o papel no banco,
 *      aplica a invariante de último administrador e dispara a auditoria;
 *   4. RLS/grants — `core.profiles` só concede SELECT a `authenticated`.
 *
 * Esconder o botão na interface não é uma dessas camadas.
 */
export async function applyAdminProfileAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdministrator();

  const parsed = adminActionSchema.safeParse({
    userId: formData.get("userId"),
    action: formData.get("action"),
    role: formData.get("role") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ação administrativa inválida.",
    };
  }

  const supabase = await createClient();
  const result = await supabase
    .schema("security")
    .rpc("admin_apply_profile_action", {
      p_user_id: parsed.data.userId,
      p_action: parsed.data.action,
      p_role: parsed.data.role ?? null,
    });

  if (result.error) {
    return { ok: false, message: describeAdminError(result.error.message) };
  }

  revalidatePath("/sistema/administracao");
  return { ok: true, message: "Alteração aplicada e registrada na auditoria." };
}

/**
 * Traduz as exceções conhecidas do banco. Erros inesperados recebem mensagem
 * genérica: nada de detalhe interno, nome de tabela ou dado de outro usuário
 * na resposta.
 */
function describeAdminError(message: string) {
  if (message.includes("without an active administrator")) {
    return "Recusado: o sistema ficaria sem nenhum administrador ativo.";
  }
  if (message.includes("cannot revoke own access")) {
    return "Recusado: um administrador não pode remover o próprio acesso.";
  }
  if (message.includes("administrator required")) {
    return "Recusado: apenas administradores executam esta ação.";
  }
  if (message.includes("profile not found")) {
    return "Perfil não encontrado.";
  }
  return "Não foi possível aplicar a alteração.";
}
