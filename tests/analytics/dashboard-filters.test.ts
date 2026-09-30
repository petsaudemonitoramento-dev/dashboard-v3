import { describe, expect, it } from "vitest";

import {
  dashboardHref,
  managementDashboardHref,
  normalizeDashboardCompetency,
  normalizeDashboardFilters,
  normalizeDashboardPeriodFilters,
  type DashboardScopeFact,
} from "@/lib/analytics/dashboard-filters";

const competencies = ["2026-05", "2026-06"];
const facts: DashboardScopeFact[] = [
  { competency: "2026-05-01", district_id: 1, establishment_id: "ubs-old", team_id: "team-old" },
  { competency: "2026-06-01", district_id: 1, establishment_id: "ubs-a", team_id: "team-a1" },
  { competency: "2026-06-01", district_id: 1, establishment_id: "ubs-a", team_id: "team-a2" },
  { competency: "2026-06-01", district_id: 1, establishment_id: "ubs-b", team_id: "team-b" },
  { competency: "2026-06-01", district_id: 2, establishment_id: "ubs-c", team_id: "team-c" },
  { competency: "2026-06-01", district_id: null, establishment_id: "ubs-unknown", team_id: "team-unknown" },
];

function resolve(searchParams: Record<string, string | string[] | undefined>) {
  return normalizeDashboardFilters({ searchParams, competencies, facts });
}

describe("filtros hierárquicos do dashboard", () => {
  it("resolve a competência antes de consultar o diretório mensal", () => {
    expect(normalizeDashboardCompetency({}, competencies)).toEqual({
      competency: "2026-06",
      needsRedirect: false,
    });
    expect(normalizeDashboardCompetency({ competencia: ["2026-05"] }, competencies)).toEqual({
      competency: "2026-06",
      needsRedirect: true,
    });
  });

  it("usa a competência mais recente e constrói o escopo municipal", () => {
    const result = resolve({});

    expect(result).toMatchObject({
      competency: "2026-06",
      district: "all",
      establishmentId: "all",
      teamId: "all",
    });
    expect(result.districtIds).toEqual(new Set(["1", "2"]));
    expect(result.availableEstablishmentIds).toEqual(
      new Set(["ubs-a", "ubs-b", "ubs-c", "ubs-unknown"]),
    );
    expect(result.availableTeamIds).toEqual(new Set());
    expect(result.needsRedirect).toBe(false);
  });

  it("restringe UBS ao distrito e equipes à UBS selecionada", () => {
    const result = resolve({
      competencia: "2026-06",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-a2",
    });

    expect(result).toMatchObject({
      competency: "2026-06",
      district: "1",
      establishmentId: "ubs-a",
      teamId: "team-a2",
    });
    expect(result.availableEstablishmentIds).toEqual(new Set(["ubs-a", "ubs-b"]));
    expect(result.availableTeamIds).toEqual(new Set(["team-a1", "team-a2"]));
    expect(result.needsRedirect).toBe(false);
  });

  it("mantém no filtro unknown somente UBS realmente sem distrito", () => {
    const result = resolve({
      competencia: "2026-06",
      distrito: "unknown",
      ubs: "ubs-unknown",
      equipe: "team-unknown",
    });

    expect(result).toMatchObject({
      district: "unknown",
      establishmentId: "ubs-unknown",
      teamId: "team-unknown",
    });
    expect(result.availableEstablishmentIds).toEqual(new Set(["ubs-unknown"]));
    expect(result.availableTeamIds).toEqual(new Set(["team-unknown"]));
    expect(result.needsRedirect).toBe(false);
  });

  it("limpa UBS e equipe quando a UBS não pertence ao distrito", () => {
    const result = resolve({
      competencia: "2026-06",
      distrito: "2",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      district: "2",
      establishmentId: "all",
      teamId: "all",
    });
    expect(result.availableEstablishmentIds).toEqual(new Set(["ubs-c"]));
    expect(result.availableTeamIds).toEqual(new Set());
    expect(result.needsRedirect).toBe(true);
  });

  it("limpa somente a equipe quando ela pertence a outra UBS", () => {
    const result = resolve({
      competencia: "2026-06",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-b",
    });

    expect(result).toMatchObject({
      district: "1",
      establishmentId: "ubs-a",
      teamId: "all",
    });
    expect(result.availableTeamIds).toEqual(new Set(["team-a1", "team-a2"]));
    expect(result.needsRedirect).toBe(true);
  });

  it("não aceita equipe específica sem uma UBS específica", () => {
    const result = resolve({ competencia: "2026-06", distrito: "1", equipe: "team-a1" });

    expect(result.establishmentId).toBe("all");
    expect(result.teamId).toBe("all");
    expect(result.availableTeamIds).toEqual(new Set());
    expect(result.needsRedirect).toBe(true);
  });

  it("normaliza distrito inválido e todos os seus descendentes", () => {
    const result = resolve({
      competencia: "2026-06",
      distrito: "999",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      competency: "2026-06",
      district: "all",
      establishmentId: "all",
      teamId: "all",
    });
    expect(result.needsRedirect).toBe(true);
  });

  it("trata parâmetros repetidos como inválidos e limpa descendentes", () => {
    const repeatedDistrict = resolve({
      competencia: "2026-06",
      distrito: ["1", "2"],
      ubs: "ubs-a",
      equipe: "team-a1",
    });
    expect(repeatedDistrict).toMatchObject({
      district: "all",
      establishmentId: "all",
      teamId: "all",
    });
    expect(repeatedDistrict.needsRedirect).toBe(true);

    const repeatedTeam = resolve({
      competencia: "2026-06",
      distrito: "1",
      ubs: "ubs-a",
      equipe: ["team-a1"],
    });
    expect(repeatedTeam).toMatchObject({
      district: "1",
      establishmentId: "ubs-a",
      teamId: "all",
    });
    expect(repeatedTeam.needsRedirect).toBe(true);
  });

  it("substitui competência inválida pela mais recente e limpa descendentes", () => {
    const result = resolve({
      competencia: "2025-12",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      competency: "2026-06",
      district: "all",
      establishmentId: "all",
      teamId: "all",
    });
    expect(result.needsRedirect).toBe(true);
  });

  it("recusa unknown quando a competência não possui fatos sem distrito", () => {
    const result = resolve({ competencia: "2026-05", distrito: "unknown", ubs: "ubs-old" });

    expect(result).toMatchObject({
      competency: "2026-05",
      district: "all",
      establishmentId: "all",
      teamId: "all",
    });
    expect(result.districtIds).toEqual(new Set(["1"]));
    expect(result.needsRedirect).toBe(true);
  });

  it("gera href canônico sem filtros all redundantes", () => {
    expect(dashboardHref({
      competency: "2026-06",
      district: "unknown",
      establishmentId: "ubs-unknown",
      teamId: "team-unknown",
    })).toBe(
      "/sistema/gestao?competencia=2026-06&distrito=unknown&ubs=ubs-unknown&equipe=team-unknown",
    );
  });
});

describe("filtros por período da interface de Gestão", () => {
  function resolvePeriod(searchParams: Record<string, string | string[] | undefined>) {
    return normalizeDashboardPeriodFilters({ searchParams, competencies, facts });
  }

  it("mantém o período mais recente da interface sem perder o escopo municipal", () => {
    const result = resolvePeriod({});

    expect(result).toMatchObject({
      start: "2026-05",
      end: "2026-06",
      periodMonths: ["2026-05", "2026-06"],
      district: "all",
      establishmentId: "all",
      teamId: "all",
      classification: "all",
      query: "",
      needsRedirect: false,
    });
    expect(result.availableEstablishmentIds).toEqual(
      new Set(["ubs-old", "ubs-a", "ubs-b", "ubs-c", "ubs-unknown"]),
    );
  });

  it("restringe unknown e seus descendentes aos fatos sem distrito no período", () => {
    const result = resolvePeriod({
      inicio: "2026-06",
      fim: "2026-06",
      distrito: "unknown",
      ubs: "ubs-unknown",
      equipe: "team-unknown",
    });

    expect(result).toMatchObject({
      district: "unknown",
      establishmentId: "ubs-unknown",
      teamId: "team-unknown",
      needsRedirect: false,
    });
    expect(result.availableEstablishmentIds).toEqual(new Set(["ubs-unknown"]));
    expect(result.availableTeamIds).toEqual(new Set(["team-unknown"]));
  });

  it("limpa UBS e equipe incompatíveis recebidas diretamente pela URL", () => {
    const result = resolvePeriod({
      inicio: "2026-06",
      fim: "2026-06",
      distrito: "2",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      district: "2",
      establishmentId: "all",
      teamId: "all",
      needsRedirect: true,
    });
    expect(result.availableEstablishmentIds).toEqual(new Set(["ubs-c"]));
  });

  it("normaliza período inválido e limpa o recorte territorial dependente", () => {
    const result = resolvePeriod({
      inicio: "2099-01",
      fim: "2026-06",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      start: "2026-05",
      end: "2026-06",
      district: "all",
      establishmentId: "all",
      teamId: "all",
      needsRedirect: true,
    });
  });

  it("converte a URL legada de competência para o período canônico", () => {
    const result = resolvePeriod({
      competencia: "2026-06",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-a2",
    });

    expect(result).toMatchObject({
      start: "2026-06",
      end: "2026-06",
      district: "1",
      establishmentId: "ubs-a",
      teamId: "team-a2",
      needsRedirect: true,
    });
  });

  it("recusa competência legada inválida e limpa o recorte territorial", () => {
    const result = resolvePeriod({
      competencia: "2099-01",
      distrito: "1",
      ubs: "ubs-a",
      equipe: "team-a1",
    });

    expect(result).toMatchObject({
      start: "2026-05",
      end: "2026-06",
      district: "all",
      establishmentId: "all",
      teamId: "all",
      needsRedirect: true,
    });
  });

  it("gera URL canônica explicitando a limpeza dos descendentes", () => {
    expect(managementDashboardHref({
      start: "2026-06",
      end: "2026-06",
      district: "2",
      establishmentId: "all",
      teamId: "all",
      classification: "all",
      query: "",
    })).toBe(
      "/sistema/gestao?inicio=2026-06&fim=2026-06&distrito=2&ubs=all&equipe=all",
    );
  });
});
