import { describe, expect, it } from "vitest";

import { normalizeDashboardFilters } from "@/lib/analytics/dashboard-filters";
import {
  buildDashboardModel,
  type DashboardTeamRow,
} from "@/lib/analytics/dashboard-model";

const teamRows: DashboardTeamRow[] = [
  { competency: "2026-06-01", district_id: 1, district_name: "Norte", establishment_id: "ubs-a", cnes: "1000001", establishment_name: "UBS A", team_id: "team-a1", ine: "1000000001", team_name: "Equipe A1", denominator: 2, points_total: 110 },
  { competency: "2026-06-01", district_id: 1, district_name: "Norte", establishment_id: "ubs-a", cnes: "1000001", establishment_name: "UBS A", team_id: "team-a2", ine: "1000000002", team_name: "Equipe A2", denominator: 1, points_total: 100 },
  { competency: "2026-06-01", district_id: 2, district_name: "Sul", establishment_id: "ubs-b", cnes: "1000002", establishment_name: "UBS B", team_id: "team-b", ine: "1000000003", team_name: "Equipe B", denominator: 3, points_total: 0 },
  { competency: "2026-06-01", district_id: null, district_name: null, establishment_id: "ubs-unknown", cnes: "1000003", establishment_name: "UBS sem distrito", team_id: "team-unknown", ine: "1000000004", team_name: null, denominator: 0, points_total: 0 },
];

function model(searchParams: Record<string, string | undefined> = {}) {
  const competencies = ["2026-05", "2026-06", "2026-07"];
  const filters = normalizeDashboardFilters({
    competencies,
    facts: teamRows,
    searchParams: { competencia: "2026-06", ...searchParams },
  });
  return buildDashboardModel({
    competencies,
    filters,
    practiceTotals: [{ practice_code: "A", fulfilled: "3" }],
    teamRows,
    trendRows: [
      { competency: "2026-05-01", denominator: 2, points_total: 100 },
      { competency: "2026-07-01", denominator: 4, points_total: 300 },
    ],
  });
}

describe("view-model do dashboard", () => {
  it("mantém razão das somas e preenche meses ausentes com nulo", () => {
    const result = model();

    expect(result.summary).toMatchObject({
      c3: 35,
      denominator: 6,
      pointsTotal: 210,
      teams: 4,
    });
    expect(result.evolution).toEqual([
      { month: "2026-05", value: 50 },
      { month: "2026-06", value: null },
      { month: "2026-07", value: 75 },
    ]);
  });

  it("preenche componentes ausentes com zero", () => {
    const result = model();

    expect(result.componentTotals.A).toBe(3);
    expect(result.componentTotals.B).toBe(0);
    expect(result.componentTotals.K).toBe(0);
  });

  it("ordena valores nulos por último e preserva drill-down hierárquico", () => {
    const result = model();

    expect(result.comparison.map((item) => [item.id, item.value])).toEqual([
      ["1", 70],
      ["2", 0],
      ["unknown", null],
    ]);
    expect(result.drilldown["Não informado"]).toBe(
      "/sistema/gestao?competencia=2026-06&distrito=unknown",
    );
  });

  it("unknown não mistura UBS nem equipes com distrito", () => {
    const result = model({
      distrito: "unknown",
      ubs: "ubs-unknown",
      equipe: "team-unknown",
    });

    expect(result.establishments).toEqual([
      { label: "UBS sem distrito · 1000003", value: "ubs-unknown" },
    ]);
    expect(result.teams).toEqual([
      { label: "Equipe · 1000000004", value: "team-unknown" },
    ]);
    expect(result.summary.c3).toBeNull();
  });

  it("limita a comparação aos dezoito maiores recortes", () => {
    const manyRows = Array.from({ length: 20 }, (_, index): DashboardTeamRow => ({
      competency: "2026-06-01",
      district_id: index + 1,
      district_name: `Distrito ${index + 1}`,
      establishment_id: `ubs-${index}`,
      cnes: String(index).padStart(7, "0"),
      establishment_name: `UBS ${index}`,
      team_id: `team-${index}`,
      ine: String(index).padStart(10, "0"),
      team_name: `Equipe ${index}`,
      denominator: 1,
      points_total: index,
    }));
    const filters = normalizeDashboardFilters({
      competencies: ["2026-06"],
      facts: manyRows,
      searchParams: { competencia: "2026-06" },
    });
    const result = buildDashboardModel({
      competencies: ["2026-06"],
      filters,
      practiceTotals: [],
      teamRows: manyRows,
      trendRows: [],
    });

    expect(result.comparison).toHaveLength(18);
    expect(result.comparison[0].value).toBe(19);
    expect(result.comparison.at(-1)?.value).toBe(2);
  });
});
