import { createClient } from "@/lib/supabase/server";

/**
 * Leitura do painel institucional.
 *
 * Todo cálculo vem das views de `analytics_gestao`: a aplicação não recompõe
 * indicador em TypeScript. É o que garante que o painel Next.js e qualquer
 * outro consumidor futuro leiam exatamente o mesmo número.
 */

export type MunicipalityResult = {
  competency: string;
  districts_total: number;
  establishments_total: number;
  teams_total: number;
  teams_evaluated: number;
  denominator: number;
  points_total: number;
  result: number | null;
  classification: string | null;
};

export type DistrictResult = {
  competency: string;
  district_id: string | null;
  district_name: string;
  establishments_total: number;
  teams_total: number;
  teams_evaluated: number;
  denominator: number;
  result: number | null;
  classification: string | null;
};

export type TeamResult = {
  competency: string;
  ine: string;
  team_name: string | null;
  team_type: string | null;
  cnes: string;
  establishment_name: string | null;
  district_name: string | null;
  denominator: number;
  points_total: number;
  result: number | null;
  classification: string | null;
  situation: string;
};

export type PracticeResult = {
  competency: string;
  practice_code: string;
  weight: number;
  fulfilled: number;
  denominator: number;
  fulfillment_rate: number | null;
  contribution: number | null;
  points_lost: number;
};

export type DataState = {
  latest_competency: string | null;
  earliest_competency: string | null;
  published_competencies: number;
  last_import_at: string | null;
  latest_source_status: string | null;
  latest_generated_at: string | null;
};

export type GestaoFilters = {
  competency?: string;
  districtId?: string;
  cnes?: string;
  teamType?: string;
};

export async function getDataState(): Promise<DataState | null> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_data_state")
    .select("*")
    .maybeSingle();
  if (result.error) return null;
  return (result.data as DataState | null) ?? null;
}

export async function listCompetencies(): Promise<string[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_municipality")
    .select("competency")
    .order("competency", { ascending: false });
  if (result.error) return [];
  return (result.data ?? []).map((row) => (row as { competency: string }).competency);
}

export async function getMunicipality(
  competency: string,
): Promise<MunicipalityResult | null> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_municipality")
    .select("*")
    .eq("competency", competency)
    .maybeSingle();
  if (result.error) return null;
  return (result.data as MunicipalityResult | null) ?? null;
}

export async function getMunicipalitySeries(): Promise<MunicipalityResult[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_municipality")
    .select("*")
    .order("competency", { ascending: true });
  if (result.error) return [];
  return (result.data ?? []) as MunicipalityResult[];
}

export async function listDistricts(
  competency: string,
): Promise<DistrictResult[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_district")
    .select("*")
    .eq("competency", competency)
    .order("result", { ascending: true, nullsFirst: false });
  if (result.error) return [];
  return (result.data ?? []) as DistrictResult[];
}

export async function listTeams(
  filters: GestaoFilters,
): Promise<TeamResult[]> {
  const supabase = await createClient();
  let query = supabase
    .schema("analytics_gestao")
    .from("vw_c3_team")
    .select(
      "competency, ine, team_name, team_type, cnes, establishment_name, district_name, denominator, points_total, result, classification, situation",
    );

  if (filters.competency) query = query.eq("competency", filters.competency);
  if (filters.districtId) query = query.eq("district_id", filters.districtId);
  if (filters.cnes) query = query.eq("cnes", filters.cnes);
  if (filters.teamType) query = query.eq("team_type", filters.teamType);

  const result = await query.order("result", {
    ascending: true,
    nullsFirst: false,
  });
  if (result.error) return [];
  return (result.data ?? []) as TeamResult[];
}

export async function listPractices(
  competency: string,
): Promise<PracticeResult[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_practice_municipality")
    .select("*")
    .eq("competency", competency)
    .order("practice_code", { ascending: true });
  if (result.error) return [];
  return (result.data ?? []) as PracticeResult[];
}

export type EstablishmentResult = {
  competency: string;
  cnes: string;
  establishment_name: string | null;
  district_name: string | null;
  teams_total: number;
  teams_evaluated: number;
  denominator: number;
  result: number | null;
  classification: string | null;
};

export async function listEstablishments(
  competency: string,
): Promise<EstablishmentResult[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("analytics_gestao")
    .from("vw_c3_establishment")
    .select("*")
    .eq("competency", competency)
    .order("result", { ascending: true, nullsFirst: false });
  if (result.error) return [];
  return (result.data ?? []) as EstablishmentResult[];
}

export type ImportRecord = {
  id: string;
  filename: string;
  competency: string | null;
  source_status: string | null;
  generated_at: string | null;
  imported_at: string;
  status: string;
  is_current: boolean;
  rows_total: number | null;
  rows_eligible: number | null;
  rows_excluded: number | null;
  publication_block: string | null;
};

export async function listImports(limit = 20): Promise<ImportRecord[]> {
  const supabase = await createClient();
  const result = await supabase
    .schema("siaps")
    .from("imports")
    .select(
      "id, filename, competency, source_status, generated_at, imported_at, status, is_current, rows_total, rows_eligible, rows_excluded, publication_block",
    )
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (result.error) return [];
  return (result.data ?? []) as ImportRecord[];
}
