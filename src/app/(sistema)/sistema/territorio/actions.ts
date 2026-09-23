"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTerritoryAdministrator } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const territorySchema = z.object({
  establishmentId: z.string().uuid(),
  districtId: z.string(),
  validFrom: z.string().regex(/^20\d{2}-\d{2}-\d{2}$/),
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
