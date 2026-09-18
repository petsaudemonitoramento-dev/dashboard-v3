import { describe, expect, it } from "vitest";

import { aggregateC3, districtLabel, pointsFromComponents } from "@/lib/analytics/c3";

describe("C3 da Gestão", () => {
  it("pesa A por 10 e B–K por 9", () => {
    expect(pointsFromComponents({
      A: 2, B: 1, C: 1, D: 1, E: 1, F: 1,
      G: 1, H: 1, I: 1, J: 1, K: 1,
    })).toBe(110);
  });

  it.each([
    ["JAN/26", 203, 2595, 94286, 36.33],
    ["FEV/26", 203, 2540, 92054, 36.24],
    ["MAR/26", 187, 2492, 92765, 37.23],
    ["ABR/26", 153, 2423, 90885, 37.51],
    ["MAI/26", 157, 2467, 92477, 37.49],
    ["JUN/26", 156, 2443, 89979, 36.83],
  ])("reproduz o golden set %s", (_month, teams, denominator, points, expected) => {
    const facts = Array.from({ length: teams }, (_, index) => ({
      pointsTotal: index === 0 ? points : 0,
      denominator: index === 0 ? denominator : 0,
      districtId: null,
    }));
    const result = aggregateC3(facts);
    expect(result.teams).toBe(teams);
    expect(result.denominator).toBe(denominator);
    expect(Number(result.c3?.toFixed(2))).toBe(expected);
  });

  it("usa razão das somas, nunca média simples", () => {
    const result = aggregateC3([
      { pointsTotal: 10, denominator: 1, districtId: 1 },
      { pointsTotal: 0, denominator: 9, districtId: 2 },
    ]);
    expect(result.c3).toBe(1);
  });

  it("mantém território desconhecido na análise municipal e no filtro próprio", () => {
    const facts = [
      { pointsTotal: 40, denominator: 2, districtId: null },
      { pointsTotal: 30, denominator: 1, districtId: 1 },
    ];
    expect(aggregateC3(facts).teams).toBe(2);
    expect(aggregateC3(facts, "unknown")).toMatchObject({
      teams: 1, pointsTotal: 40, denominator: 2,
    });
    expect(districtLabel(null)).toBe("Não informado");
  });
});
