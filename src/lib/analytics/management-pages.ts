import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TeamMonthlyRow = {
  competency: string;
  district_id: number | null;
  district_name: string | null;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  team_id: string;
  ine: string;
  team_name: string;
  denominator: number;
  points_total: number | string;
  c3: number | string | null;
  classification: string;
};

export type PracticeSummaryRow = {
  competency: string;
  district_id: number | null;
  district_name: string | null;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  practice_code: string;
  fulfilled: number;
  denominator: number;
};

export type EstablishmentMonthlyRow = {
  competency: string;
  district_id: number | null;
  district_name: string | null;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  points_total: number | string;
  denominator: number;
  c3: number | string | null;
  teams: number;
};

export type DistrictMonthlyRow = {
  competency: string;
  district_id: number | null;
  district_name: string | null;
  points_total: number | string;
  denominator: number;
  c3: number | string | null;
  establishments: number;
  teams: number;
};

export type TeamDirectoryRow = {
  team_id: string;
  ine: string;
  team_name: string;
  team_type: string | null;
  establishment_id: string | null;
  cnes: string | null;
  establishment_name: string | null;
  district_id: number | null;
  district_name: string | null;
};

async function fetchPaged<T>(
  supabase: Client,
  table: string,
  columns: string,
  orderBy: string,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const result = await supabase
      .schema("analytics")
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(offset, offset + pageSize - 1);

    if (result.error) {
      throw new Error("Não foi possível carregar os dados analíticos.");
    }

    const page = (result.data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function ratioOfSums(
  rows: Array<{ points_total: number | string; denominator: number }>,
) {
  const points = rows.reduce((sum, row) => sum + toNumber(row.points_total), 0);
  const denominator = rows.reduce((sum, row) => sum + row.denominator, 0);
  return {
    points,
    denominator,
    c3: denominator > 0 ? points / denominator : null,
  };
}

export function formatC3(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;
}

export function formatInteger(value: number) {
  return value.toLocaleString("pt-BR");
}

export async function fetchTeamMonthly(supabase: Client) {
  return fetchPaged<TeamMonthlyRow>(
    supabase,
    "dashboard_c3_team_monthly",
    "competency,district_id,district_name,establishment_id,cnes,establishment_name,team_id,ine,team_name,denominator,points_total,c3,classification",
    "competency",
  );
}

export async function fetchPracticeSummary(supabase: Client) {
  return fetchPaged<PracticeSummaryRow>(
    supabase,
    "dashboard_c3_practice_summary",
    "competency,district_id,district_name,establishment_id,cnes,establishment_name,practice_code,fulfilled,denominator",
    "competency",
  );
}

export async function fetchEstablishmentMonthly(supabase: Client) {
  return fetchPaged<EstablishmentMonthlyRow>(
    supabase,
    "dashboard_c3_establishment_monthly",
    "competency,district_id,district_name,establishment_id,cnes,establishment_name,points_total,denominator,c3,teams",
    "competency",
  );
}

export async function fetchDistrictMonthly(supabase: Client) {
  return fetchPaged<DistrictMonthlyRow>(
    supabase,
    "dashboard_c3_district_monthly",
    "competency,district_id,district_name,points_total,denominator,c3,establishments,teams",
    "competency",
  );
}

export async function fetchTeamDirectory(supabase: Client) {
  return fetchPaged<TeamDirectoryRow>(
    supabase,
    "dashboard_team_directory",
    "team_id,ine,team_name,team_type,establishment_id,cnes,establishment_name,district_id,district_name",
    "ine",
  );
}
