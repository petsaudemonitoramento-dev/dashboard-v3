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

export type C3Classification =
  | "Ótimo"
  | "Bom"
  | "Suficiente"
  | "Regular"
  | "Sem população elegível";

export function classifyC3(value: number | null): C3Classification {
  if (value === null) return "Sem população elegível";
  if (value > 75) return "Ótimo";
  if (value > 50) return "Bom";
  if (value > 25) return "Suficiente";
  return "Regular";
}

export const C3_COMPONENTS = {
  A: "Primeira consulta presencial ou remota com médica(o) ou enfermeira(o) até a 12ª semana de gestação.",
  B: "Pelo menos sete consultas presenciais ou remotas com médica(o) ou enfermeira(o) durante a gestação.",
  C: "Pelo menos sete registros de aferição de pressão arterial durante a gestação.",
  D: "Pelo menos sete registros simultâneos de peso e altura durante a gestação.",
  E: "Pelo menos três visitas domiciliares por ACS/TACS após a primeira consulta de pré-natal.",
  F: "Registro da vacina dTpa a partir da 20ª semana de cada gestação.",
  G: "Testes rápidos ou exames de sífilis, HIV e hepatites B e C no primeiro trimestre.",
  H: "Testes rápidos ou exames de sífilis e HIV no terceiro trimestre.",
  I: "Pelo menos uma consulta presencial ou remota com médica(o) ou enfermeira(o) durante o puerpério.",
  J: "Pelo menos uma visita domiciliar por ACS/TACS durante o puerpério.",
  K: "Pelo menos uma atividade de saúde bucal com dentista ou técnica(o) de saúde bucal durante a gestação.",
} satisfies Record<keyof C3Components, string>;

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
