"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireTerritoryAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const territorySchema = z.object({
  establishmentId: z.string().uuid(),
  districtId: z.string(),
  validFrom: z.string().regex(/^20\d{2}-\d{2}-\d{2}$/),
});

const identitySchema = z.object({
  establishmentId: z.string().uuid(),
  cnes: z.string().regex(/^\d{7}$/),
  name: z.string().trim().min(3).max(200),
  confirmOfficial: z.literal("on"),
  confirmRisk: z.literal("on"),
  returnQuery: z.string().max(500).default(""),
});

export async function updateTerritoryAction(formData: FormData) {
  await requireTerritoryAdministrator();
  const input = territorySchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const result = await supabase.rpc("update_establishment_territory", {
    p_establishment_id: input.establishmentId,
    p_district_id: input.districtId ? Number(input.districtId) : null,
    p_valid_from: input.validFrom,
  });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/sistema/territorio");
  revalidatePath("/sistema/gestao");
}

export async function updateEstablishmentIdentityAction(formData: FormData) {
  await requireTerritoryAdministrator();
  const parsed = identitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const id = String(formData.get("establishmentId") ?? "");
    const returnQuery = String(formData.get("returnQuery") ?? "");
    redirect(`/sistema/territorio?cadastro=${encodeURIComponent(id)}&${returnQuery}&erro=${encodeURIComponent("Revise nome, CNES e as duas confirmações obrigatórias.")}`);
  }

  const input = parsed.data;
  const supabase = await createClient();
  const result = await supabase.rpc("update_establishment_identity", {
    p_establishment_id: input.establishmentId,
    p_cnes: input.cnes,
    p_name: input.name,
    p_confirm_official: true,
    p_confirm_impact: true,
  });

  if (result.error) {
    redirect(`/sistema/territorio?cadastro=${encodeURIComponent(input.establishmentId)}&${input.returnQuery}&erro=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/sistema/territorio");
  revalidatePath("/sistema/gestao");
  redirect(`/sistema/territorio?${input.returnQuery}`);
}
