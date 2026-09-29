"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireTerritoryAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const territorySchema = z.object({
  establishmentId: z.uuid(), districtId: z.string(),
  validFrom: z.string().regex(/^20\d{2}-\d{2}-\d{2}$/), confirmation: z.literal("true"),
});
const identitySchema = z.object({
  establishmentId: z.uuid(), name: z.string().trim().min(2).max(160),
  cnes: z.string().regex(/^\d{7}$/), confirmation: z.literal("true"),
});

async function finishMutation(rpc: "update_establishment_territory" | "update_establishment_identity", parameters: Record<string, unknown>) {
  await requireTerritoryAdministrator();
  const supabase = await createClient();
  const result = await supabase.rpc(rpc, parameters);
  if (!result.error) {
    revalidatePath("/sistema/territorio");
    revalidatePath("/sistema/gestao");
  }
  redirect(result.error ? "/sistema/territorio?status=erro" : "/sistema/territorio?status=salvo");
}

export async function updateTerritoryAction(formData: FormData) {
  const parsed = territorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sistema/territorio?status=erro");
  await finishMutation("update_establishment_territory", {
    p_establishment_id: parsed.data.establishmentId,
    p_district_id: parsed.data.districtId ? Number(parsed.data.districtId) : null,
    p_valid_from: parsed.data.validFrom,
  });
}

export async function updateEstablishmentIdentityAction(formData: FormData) {
  const parsed = identitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sistema/territorio?status=erro");
  await finishMutation("update_establishment_identity", {
    p_establishment_id: parsed.data.establishmentId, p_name: parsed.data.name, p_cnes: parsed.data.cnes,
  });
}
