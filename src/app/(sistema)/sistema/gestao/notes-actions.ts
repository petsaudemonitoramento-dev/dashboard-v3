"use server";

import { z } from "zod";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type PrivateNote = { id: string; body: string; created_at: string; updated_at: string };
export type PrivateNoteState = { ok: boolean; message: string; entry?: PrivateNote };
const schema = z.object({
  periodStart: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  periodEnd: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  body: z.string().trim().max(2000),
  operation: z.enum(["create", "update", "delete"]),
  id: z.string().uuid().optional(),
});

export async function managePrivateNote(formData: FormData): Promise<PrivateNoteState> {
  const { user } = await requireDashboardAccess();
  const parsed = schema.safeParse({
    periodStart: formData.get("period_start"),
    periodEnd: formData.get("period_end"),
    body: formData.get("body"),
    operation: formData.get("operation"),
    id: formData.get("id") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Anotação inválida." };
  const { periodStart, periodEnd, operation, id, body } = parsed.data;
  if (periodEnd < periodStart || (operation !== "create" && !id) || (operation !== "delete" && !body)) {
    return { ok: false, message: "Confira a anotação e o período." };
  }
  const supabase = await createClient();
  const scope = { user_id: user.id, period_start: `${periodStart}-01`, period_end: `${periodEnd}-01` };
  const table = supabase.schema("app").from("management_private_note_entries");
  if (operation === "delete") {
    const result = await table.delete().eq("id", id!).eq("user_id", scope.user_id)
      .eq("period_start", scope.period_start).eq("period_end", scope.period_end).select("id").maybeSingle();
    return result.error || !result.data
      ? { ok: false, message: "Não foi possível excluir a anotação." }
      : { ok: true, message: "Anotação excluída." };
  }
  const fields = "id,body,created_at,updated_at";
  const result = operation === "create"
    ? await table.insert({ ...scope, body }).select(fields).single()
    : await table.update({ body, updated_at: new Date().toISOString() }).eq("id", id!)
        .eq("user_id", scope.user_id).eq("period_start", scope.period_start).eq("period_end", scope.period_end)
        .select(fields).maybeSingle();
  return result.error || !result.data
    ? { ok: false, message: "Não foi possível salvar. Confira a conexão e tente novamente." }
    : { ok: true, entry: result.data as PrivateNote, message: "Anotação salva somente na sua conta." };
}
