import "server-only";

import {
  normalizeDashboardCompetency,
  normalizeDashboardFilters,
  type DashboardSearchParams,
} from "@/lib/analytics/dashboard-filters";
import {
  buildDashboardModel,
  type DashboardPracticeTotalRow,
  type DashboardTeamRow,
  type DashboardTrendRow,
} from "@/lib/analytics/dashboard-model";
import { createClient } from "@/lib/supabase/server";

const QUERY_PAGE_SIZE = 500;

async function loadTeamRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  competency: string,
) {
  if (!competency) return [];
  const rows: DashboardTeamRow[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const result = await supabase
      .schema("analytics")
      .from("dashboard_c3_team_monthly")
      .select("competency, district_id, district_name, establishment_id, cnes, establishment_name, team_id, ine, team_name, denominator, points_total")
      .eq("competency", `${competency}-01`)
      .order("team_id")
      .range(offset, offset + QUERY_PAGE_SIZE - 1);
    if (result.error) throw new Error("Não foi possível consultar o recorte mensal do dashboard.");
    const page = (result.data ?? []) as DashboardTeamRow[];
    rows.push(...page);
    if (page.length < QUERY_PAGE_SIZE) break;
  }
  return rows;
}

async function loadTrend(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ReturnType<typeof normalizeDashboardFilters>,
) {
  const select = "competency, denominator, points_total";
  let query = filters.teamId !== "all"
    ? supabase.schema("analytics").from("dashboard_c3_team_monthly").select(select)
        .eq("team_id", filters.teamId)
        .eq("establishment_id", filters.establishmentId)
    : filters.establishmentId !== "all"
      ? supabase.schema("analytics").from("dashboard_c3_establishment_monthly").select(select).eq("establishment_id", filters.establishmentId)
      : filters.district !== "all"
        ? supabase.schema("analytics").from("dashboard_c3_district_monthly").select(select)
        : supabase.schema("analytics").from("dashboard_competencies").select(select);

  if (filters.district === "unknown") {
    query = query.is("district_id", null);
  } else if (filters.district !== "all") {
    query = query.eq("district_id", Number(filters.district));
  }
  const result = await query.order("competency");
  if (result.error) throw new Error("Não foi possível consultar a evolução do C3.");
  return (result.data ?? []) as DashboardTrendRow[];
}

async function loadPracticeTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ReturnType<typeof normalizeDashboardFilters>,
) {
  const result = await supabase.schema("analytics").rpc(
    "dashboard_c3_practice_totals",
    {
      p_competency: `${filters.competency}-01`,
      p_district_id: filters.district !== "all" && filters.district !== "unknown"
        ? Number(filters.district)
        : null,
      p_establishment_id: filters.establishmentId === "all"
        ? null
        : filters.establishmentId,
      p_team_id: filters.teamId === "all" ? null : filters.teamId,
      p_without_district: filters.district === "unknown",
    },
  );
  if (result.error) throw new Error("Não foi possível consultar os componentes A–K.");
  return (result.data ?? []) as DashboardPracticeTotalRow[];
}

export type DashboardPracticePeriodTotalRow = {
  month: string;
  practice_code: string;
  fulfilled: number;
};

export async function loadDashboardPracticeTotalsForPeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    months: readonly string[];
    district: string;
    establishmentId: string;
    teamId: string;
  },
) {
  const pages = await Promise.all(input.months.map(async (month) => {
    const result = await supabase.schema("analytics").rpc(
      "dashboard_c3_practice_totals",
      {
        p_competency: `${month}-01`,
        p_district_id: input.district !== "all" && input.district !== "unknown"
          ? Number(input.district)
          : null,
        p_establishment_id: input.establishmentId === "all"
          ? null
          : input.establishmentId,
        p_team_id: input.teamId === "all" ? null : input.teamId,
        p_without_district: input.district === "unknown",
      },
    );
    if (result.error) {
      throw new Error("Não foi possível consultar os componentes A–K do período.");
    }
    return ((result.data ?? []) as DashboardPracticeTotalRow[]).map((row) => ({
      month,
      practice_code: row.practice_code,
      fulfilled: Number(row.fulfilled),
    }));
  }));
  return pages.flat() satisfies DashboardPracticePeriodTotalRow[];
}

export async function loadDashboardData(searchParams: DashboardSearchParams) {
  const supabase = await createClient();
  const competenciesResult = await supabase
    .schema("analytics")
    .from("dashboard_competencies")
    .select("competency")
    .order("competency");
  if (competenciesResult.error) throw new Error("Não foi possível consultar as competências do dashboard.");
  const competencies = (competenciesResult.data ?? []).map((row) => String(row.competency).slice(0, 7));
  const competency = normalizeDashboardCompetency(searchParams, competencies).competency;
  const teamRows = await loadTeamRows(supabase, competency);
  const filters = normalizeDashboardFilters({
    competencies,
    facts: teamRows,
    searchParams,
  });

  if (filters.needsRedirect) {
    return { competencies, filters, model: null };
  }

  const [trendRows, practiceTotals] = filters.competency
    ? await Promise.all([
        loadTrend(supabase, filters),
        loadPracticeTotals(supabase, filters),
      ])
    : [[], []];
  const model = buildDashboardModel({
    competencies,
    filters,
    practiceTotals,
    teamRows,
    trendRows,
  });
  return { competencies, filters, model };
}
