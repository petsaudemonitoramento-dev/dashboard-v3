import { aggregateC3, districtLabel, type C3Fact } from "@/lib/analytics/c3";
import {
  dashboardHref,
  type DashboardFilterResolution,
} from "@/lib/analytics/dashboard-filters";

export type DashboardTeamRow = {
  competency: string;
  district_id: number | null;
  district_name: string | null;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  team_id: string;
  ine: string;
  team_name: string | null;
  denominator: number;
  points_total: number | string;
};

export type DashboardTrendRow = {
  competency: string;
  denominator: number | string;
  points_total: number | string;
};

export type DashboardPracticeTotalRow = {
  practice_code: string;
  fulfilled: number | string;
};

function aggregateRows(rows: DashboardTeamRow[]) {
  return aggregateC3(rows.map((row): C3Fact => ({
    denominator: Number(row.denominator),
    districtId: row.district_id,
    pointsTotal: Number(row.points_total),
  })));
}

function matchesScope(row: DashboardTeamRow, filters: DashboardFilterResolution) {
  if (filters.district === "unknown" && row.district_id !== null) return false;
  if (filters.district !== "all" && filters.district !== "unknown"
    && row.district_id !== Number(filters.district)) return false;
  if (filters.establishmentId !== "all"
    && row.establishment_id !== filters.establishmentId) return false;
  return filters.teamId === "all" || row.team_id === filters.teamId;
}

export function buildDashboardModel({
  competencies,
  filters,
  practiceTotals,
  teamRows,
  trendRows,
}: {
  competencies: string[];
  filters: DashboardFilterResolution;
  practiceTotals: DashboardPracticeTotalRow[];
  teamRows: DashboardTeamRow[];
  trendRows: DashboardTrendRow[];
}) {
  const districtNames = new Map<number, string>();
  const establishmentNames = new Map<string, string>();
  const teamNames = new Map<string, string>();
  for (const row of teamRows) {
    if (row.district_id !== null && row.district_name) {
      districtNames.set(row.district_id, row.district_name);
    }
    establishmentNames.set(
      row.establishment_id,
      `${row.establishment_name} · ${row.cnes}`,
    );
    teamNames.set(row.team_id, `${row.team_name || "Equipe"} · ${row.ine}`);
  }

  const selectedRows = teamRows.filter((row) => matchesScope(row, filters));
  const summary = aggregateRows(selectedRows);
  const ubsCount = new Set(selectedRows.map((row) => row.establishment_id)).size;
  const trendByMonth = new Map(trendRows.map((row) => [row.competency.slice(0, 7), row]));
  const evolution = competencies.map((month) => {
    const row = trendByMonth.get(month);
    if (!row) return { month, value: null };
    const denominator = Number(row.denominator);
    const pointsTotal = Number(row.points_total);
    return {
      month,
      value: denominator > 0 ? pointsTotal / denominator : null,
    };
  });

  const componentTotals = Object.fromEntries(
    "ABCDEFGHIJK".split("").map((code) => [code, 0]),
  ) as Record<string, number>;
  for (const row of practiceTotals) {
    if (row.practice_code in componentTotals) {
      componentTotals[row.practice_code] = Number(row.fulfilled);
    }
  }

  const groupMode = filters.establishmentId !== "all" || filters.teamId !== "all"
    ? "team"
    : filters.district !== "all" ? "ubs" : "district";
  const grouped = new Map<string, { rows: DashboardTeamRow[]; name: string }>();
  for (const row of selectedRows) {
    const id = groupMode === "team" ? row.team_id
      : groupMode === "ubs" ? row.establishment_id
        : row.district_id === null ? "unknown" : String(row.district_id);
    const name = groupMode === "team"
      ? (teamNames.get(row.team_id) ?? `Equipe · ${row.team_id}`)
      : groupMode === "ubs"
        ? (establishmentNames.get(row.establishment_id) ?? `UBS · ${row.establishment_id}`)
        : districtLabel(row.district_name);
    const group = grouped.get(id) ?? { rows: [], name };
    group.rows.push(row);
    grouped.set(id, group);
  }
  const comparison = [...grouped.entries()]
    .map(([id, group]) => ({
      id,
      name: group.name,
      value: aggregateRows(group.rows).c3,
    }))
    .sort((left, right) => {
      if (left.value === null) return right.value === null ? 0 : 1;
      if (right.value === null) return -1;
      return right.value - left.value;
    })
    .slice(0, 18);
  const drilldown = groupMode === "district"
    ? Object.fromEntries(comparison.map((item) => [item.name, dashboardHref({
        competency: filters.competency,
        district: item.id,
        establishmentId: "all",
        teamId: "all",
      })]))
    : groupMode === "ubs"
      ? Object.fromEntries(comparison.map((item) => [item.name, dashboardHref({
          competency: filters.competency,
          district: filters.district,
          establishmentId: item.id,
          teamId: "all",
        })]))
      : {};

  const districts = [...districtNames.entries()]
    .filter(([id]) => filters.districtIds.has(String(id)))
    .map(([id, name]) => ({ label: name, value: String(id) }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const establishments = [...establishmentNames.entries()]
    .filter(([id]) => filters.availableEstablishmentIds.has(id))
    .map(([id, name]) => ({ label: name, value: id }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const teams = [...teamNames.entries()]
    .filter(([id]) => filters.availableTeamIds.has(id))
    .map(([id, name]) => ({ label: name, value: id }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    comparison,
    componentTotals,
    districtNames,
    districts,
    drilldown,
    establishmentNames,
    establishments,
    evolution,
    summary,
    teamNames,
    teams,
    ubsCount,
  };
}
