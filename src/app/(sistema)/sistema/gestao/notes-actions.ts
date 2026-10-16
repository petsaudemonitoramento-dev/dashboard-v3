"use server";

import { z } from "zod";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type PrivateNoteState = { ok: boolean; message: string; body: string };
const schema = z.object({
  periodStart: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  periodEnd: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  body: z.string().max(2000),
  operation: z.enum(["save","delete"]),
});

/** A identidade nunca é recebida do browser: deriva da sessão verificada.
 * Nenhuma operação usa service_role para ler/escrever notas.
 */
export async function managePrivateNote(
  _previous: PrivateNoteState, formData: FormData,
): Promise<PrivateNoteState> {
  const { user } = await requireDashboardAccess();
  const parsed = schema.safeParse({
    periodStart: formData.get("period_start"),
    periodEnd: formData.get("period_end"),
    body: formData.get("body"),
    operation: formData.get("operation"),
  });
  if (!parsed.success) {
    return { ok: false, body: "", message: "Anotação inválida ou acima do limite de 2.000 caracteres." };
  }
  const { periodStart, periodEnd, operation } = parsed.data;
  if (periodEnd < periodStart) {
    return { ok: false, body: "", message: "Período inválido." };
  }
  const body = parsed.data.body.trim();
  const supabase = await createClient();
  const scope = {
    user_id: user.id,
    period_start: `${periodStart}-01`,
    period_end: `${periodEnd}-01`,
  };

  if (operation === "delete" || !body) {
    const result = await supabase.schema("app").from("management_private_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("period_start", scope.period_start)
      .eq("period_end", scope.period_end);
    return result.error
      ? { ok: false, body: parsed.data.body, message: "Não foi possível apagar sua anotação." }
      : { ok: true, body: "", message: "Anotação apagada deste período." };
  }
  const result = await supabase.schema("app").from("management_private_notes")
    .upsert({ ...scope, body, updated_at: new Date().toISOString() }, {
      onConflict: "user_id,period_start,period_end",
    });
  return result.error
    ? { ok: false, body: parsed.data.body, message: "Não foi possível salvar. Confira a conexão e tente novamente." }
    : { ok: true, body, message: "Anotação salva somente na sua conta." };
}
