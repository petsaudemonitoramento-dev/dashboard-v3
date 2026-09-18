export type C3Components = Record<
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K",
  number
>;

export type C3Fact = {
  pointsTotal: number;
  denominator: number;
  districtId: number | null;
};

export type TerritoryFilter = number | "all" | "unknown";

export function pointsFromComponents(components: C3Components) {
  return (
    10 * components.A +
    9 * (components.B + components.C + components.D + components.E +
      components.F + components.G + components.H + components.I +
      components.J + components.K)
  );
}

export function districtLabel(name: string | null | undefined) {
  return name?.trim() || "Não informado";
}

export function aggregateC3(facts: C3Fact[], territory: TerritoryFilter = "all") {
  let teams = 0;
  let pointsTotal = 0;
  let denominator = 0;
  for (const fact of facts) {
    if (territory !== "all" &&
      (territory === "unknown" ? fact.districtId !== null : fact.districtId !== territory)) continue;
    teams += 1;
    pointsTotal += fact.pointsTotal;
    denominator += fact.denominator;
  }
  return {
    teams,
    pointsTotal,
    denominator,
    c3: denominator > 0 ? pointsTotal / denominator : null,
  };
}
