export type DashboardSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type DashboardScopeFact = {
  competency: string;
  district_id: number | null;
  establishment_id: string;
  team_id: string;
};

export type NormalizedDashboardFilters = {
  competency: string;
  district: "all" | "unknown" | string;
  establishmentId: string;
  teamId: string;
};

export type DashboardFilterResolution = {
  competency: string;
  district: "all" | "unknown" | string;
  establishmentId: string;
  teamId: string;
  districtIds: Set<string>;
  availableEstablishmentIds: Set<string>;
  availableTeamIds: Set<string>;
  needsRedirect: boolean;
};

export type NormalizeDashboardFiltersInput = {
  searchParams: DashboardSearchParams;
  competencies: readonly string[];
  facts: readonly DashboardScopeFact[];
};

type ScalarParam = {
  value: string | undefined;
  repeated: boolean;
};

export type DashboardCompetencyResolution = {
  competency: string;
  needsRedirect: boolean;
};

function scalarParam(value: string | string[] | undefined): ScalarParam {
  if (Array.isArray(value)) return { value: undefined, repeated: true };
  return { value, repeated: false };
}

function competencyMonth(value: string) {
  const match = /^(\d{4}-(?:0[1-9]|1[0-2]))(?:-\d{2})?$/.exec(value);
  return match?.[1] ?? null;
}

function availableCompetencies(values: readonly string[]) {
  return [...new Set(values.map(competencyMonth).filter((value): value is string => value !== null))]
    .sort();
}

export function normalizeDashboardCompetency(
  searchParams: DashboardSearchParams,
  competencies: readonly string[],
): DashboardCompetencyResolution {
  const scopedCompetencies = availableCompetencies(competencies);
  const latestCompetency = scopedCompetencies.at(-1) ?? "";
  const competencyParam = scalarParam(searchParams.competencia);
  const requestedCompetency = competencyParam.value;
  const competencyIsValid = requestedCompetency !== undefined
    && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(requestedCompetency)
    && scopedCompetencies.includes(requestedCompetency);

  return {
    competency: competencyIsValid ? requestedCompetency : latestCompetency,
    needsRedirect: competencyParam.repeated
      || (requestedCompetency !== undefined && !competencyIsValid),
  };
}

function factsForCompetency(
  facts: readonly DashboardScopeFact[],
  competency: string,
) {
  if (!competency) return [];
  return facts.filter((fact) => competencyMonth(fact.competency) === competency);
}

/**
 * Resolves URL filters against the hierarchy present in a single competency.
 * Invalid values fail closed to the nearest `all` scope and clear every
 * dependent filter, so a direct URL cannot express an incompatible scope.
 */
export function normalizeDashboardFilters(
  { searchParams, competencies, facts }: NormalizeDashboardFiltersInput,
): DashboardFilterResolution {
  const competencyResolution = normalizeDashboardCompetency(searchParams, competencies);
  const { competency } = competencyResolution;
  let needsRedirect = competencyResolution.needsRedirect;
  let clearDescendants = needsRedirect;

  const scopedFacts = factsForCompetency(facts, competency);
  const districtIds = new Set<string>();
  let hasUnknownDistrict = false;
  for (const fact of scopedFacts) {
    if (fact.district_id === null) hasUnknownDistrict = true;
    else districtIds.add(String(fact.district_id));
  }

  const districtParam = scalarParam(searchParams.distrito);
  let district: NormalizedDashboardFilters["district"] = "all";
  if (!clearDescendants) {
    const requestedDistrict = districtParam.value;
    const districtIsValid = requestedDistrict === undefined
      || requestedDistrict === "all"
      || (requestedDistrict === "unknown" && hasUnknownDistrict)
      || (requestedDistrict !== undefined && districtIds.has(requestedDistrict));

    if (districtParam.repeated || !districtIsValid) {
      needsRedirect = true;
      clearDescendants = true;
    } else if (requestedDistrict && requestedDistrict !== "all") {
      district = requestedDistrict;
    }
  }

  const factsInDistrict = scopedFacts.filter((fact) => {
    if (district === "all") return true;
    if (district === "unknown") return fact.district_id === null;
    return String(fact.district_id) === district;
  });
  const availableEstablishmentIds = new Set(
    factsInDistrict.map((fact) => fact.establishment_id),
  );

  const establishmentParam = scalarParam(searchParams.ubs);
  let establishmentId = "all";
  if (!clearDescendants) {
    const requestedEstablishment = establishmentParam.value;
    const establishmentIsValid = requestedEstablishment === undefined
      || requestedEstablishment === "all"
      || (requestedEstablishment !== undefined
        && availableEstablishmentIds.has(requestedEstablishment));

    if (establishmentParam.repeated || !establishmentIsValid) {
      needsRedirect = true;
      clearDescendants = true;
    } else if (requestedEstablishment && requestedEstablishment !== "all") {
      establishmentId = requestedEstablishment;
    }
  }

  const availableTeamIds = establishmentId === "all"
    ? new Set<string>()
    : new Set(
      factsInDistrict
        .filter((fact) => fact.establishment_id === establishmentId)
        .map((fact) => fact.team_id),
    );

  const teamParam = scalarParam(searchParams.equipe);
  let teamId = "all";
  if (!clearDescendants) {
    const requestedTeam = teamParam.value;
    const teamIsValid = requestedTeam === undefined
      || requestedTeam === "all"
      || (establishmentId !== "all"
        && requestedTeam !== undefined
        && availableTeamIds.has(requestedTeam));

    if (teamParam.repeated || !teamIsValid) {
      needsRedirect = true;
    } else if (requestedTeam && requestedTeam !== "all") {
      teamId = requestedTeam;
    }
  }

  return {
    competency,
    district,
    establishmentId,
    teamId,
    districtIds,
    availableEstablishmentIds,
    availableTeamIds,
    needsRedirect,
  };
}

export function dashboardHref(
  filters: {
    competency: string;
    district?: string;
    establishmentId?: string;
    teamId?: string;
  },
  pathname = "/sistema/gestao",
) {
  const search = new URLSearchParams();
  if (filters.competency) search.set("competencia", filters.competency);
  if (filters.district && filters.district !== "all") search.set("distrito", filters.district);
  if (filters.establishmentId && filters.establishmentId !== "all") search.set("ubs", filters.establishmentId);
  if (filters.teamId && filters.teamId !== "all") search.set("equipe", filters.teamId);
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const DASHBOARD_CLASSIFICATION_VALUES = [
  "all",
  "otimo",
  "bom",
  "suficiente",
  "regular",
  "invalido",
  "sem",
] as const;

export type DashboardClassification = typeof DASHBOARD_CLASSIFICATION_VALUES[number];

export type DashboardPeriodFilterResolution = {
  start: string;
  end: string;
  periodMonths: string[];
  district: "all" | "unknown" | string;
  establishmentId: string;
  teamId: string;
  classification: DashboardClassification;
  query: string;
  districtIds: Set<string>;
  hasUnknownDistrict: boolean;
  availableEstablishmentIds: Set<string>;
  availableTeamIds: Set<string>;
  needsRedirect: boolean;
};

/**
 * Normalizes the richer management dashboard URL while preserving its period,
 * search and classification controls. Geographic filters are always resolved
 * against facts inside the selected period; an invalid parent fails closed and
 * clears every descendant.
 */
export function normalizeDashboardPeriodFilters(
  { searchParams, competencies, facts }: NormalizeDashboardFiltersInput,
): DashboardPeriodFilterResolution {
  const scopedCompetencies = availableCompetencies(competencies);
  const firstCompetency = scopedCompetencies.at(0) ?? "";
  const lastCompetency = scopedCompetencies.at(-1) ?? "";
  const startParam = scalarParam(searchParams.inicio);
  const endParam = scalarParam(searchParams.fim);
  const legacyCompetencyParam = scalarParam(searchParams.competencia);

  const legacyCompetency = legacyCompetencyParam.value
    && scopedCompetencies.includes(legacyCompetencyParam.value)
    ? legacyCompetencyParam.value
    : null;
  const legacyCompetencyInvalid = legacyCompetencyParam.value !== undefined
    && legacyCompetency === null;
  const startCandidate = startParam.value
    ?? (startParam.value === undefined && endParam.value === undefined ? legacyCompetency : null);
  const endCandidate = endParam.value
    ?? (startParam.value === undefined && endParam.value === undefined ? legacyCompetency : null);
  const startIsValid = startCandidate === null || startCandidate === undefined
    || scopedCompetencies.includes(startCandidate);
  const endIsValid = endCandidate === null || endCandidate === undefined
    || scopedCompetencies.includes(endCandidate);

  let start = startIsValid && startCandidate ? startCandidate : firstCompetency;
  let end = endIsValid && endCandidate ? endCandidate : lastCompetency;
  let needsRedirect = startParam.repeated
    || endParam.repeated
    || legacyCompetencyParam.repeated
    || !startIsValid
    || !endIsValid
    || legacyCompetencyParam.value !== undefined;
  let clearDescendants = startParam.repeated
    || endParam.repeated
    || legacyCompetencyParam.repeated
    || !startIsValid
    || !endIsValid
    || legacyCompetencyInvalid;

  if (start && end && scopedCompetencies.indexOf(start) > scopedCompetencies.indexOf(end)) {
    [start, end] = [end, start];
    needsRedirect = true;
  }

  const startIndex = start ? scopedCompetencies.indexOf(start) : -1;
  const endIndex = end ? scopedCompetencies.indexOf(end) : -1;
  const periodMonths = startIndex >= 0 && endIndex >= startIndex
    ? scopedCompetencies.slice(startIndex, endIndex + 1)
    : [];
  const scopedFacts = facts.filter((fact) => periodMonths.includes(competencyMonth(fact.competency) ?? ""));

  const districtIds = new Set<string>();
  let hasUnknownDistrict = false;
  for (const fact of scopedFacts) {
    if (fact.district_id === null) hasUnknownDistrict = true;
    else districtIds.add(String(fact.district_id));
  }

  const districtParam = scalarParam(searchParams.distrito);
  let district: DashboardPeriodFilterResolution["district"] = "all";
  if (!clearDescendants) {
    const requestedDistrict = districtParam.value;
    const districtIsValid = requestedDistrict === undefined
      || requestedDistrict === "all"
      || (requestedDistrict === "unknown" && hasUnknownDistrict)
      || (requestedDistrict !== undefined && districtIds.has(requestedDistrict));
    if (districtParam.repeated || !districtIsValid) {
      needsRedirect = true;
      clearDescendants = true;
    } else if (requestedDistrict && requestedDistrict !== "all") {
      district = requestedDistrict;
    }
  }

  const factsInDistrict = scopedFacts.filter((fact) => {
    if (district === "all") return true;
    if (district === "unknown") return fact.district_id === null;
    return String(fact.district_id) === district;
  });
  const availableEstablishmentIds = new Set(
    factsInDistrict.map((fact) => fact.establishment_id),
  );

  const establishmentParam = scalarParam(searchParams.ubs);
  let establishmentId = "all";
  if (!clearDescendants) {
    const requestedEstablishment = establishmentParam.value;
    const establishmentIsValid = requestedEstablishment === undefined
      || requestedEstablishment === "all"
      || (requestedEstablishment !== undefined
        && availableEstablishmentIds.has(requestedEstablishment));
    if (establishmentParam.repeated || !establishmentIsValid) {
      needsRedirect = true;
      clearDescendants = true;
    } else if (requestedEstablishment && requestedEstablishment !== "all") {
      establishmentId = requestedEstablishment;
    }
  }

  const availableTeamIds = establishmentId === "all"
    ? new Set<string>()
    : new Set(
      factsInDistrict
        .filter((fact) => fact.establishment_id === establishmentId)
        .map((fact) => fact.team_id),
    );
  const teamParam = scalarParam(searchParams.equipe);
  let teamId = "all";
  if (!clearDescendants) {
    const requestedTeam = teamParam.value;
    const teamIsValid = requestedTeam === undefined
      || requestedTeam === "all"
      || (requestedTeam !== undefined && availableTeamIds.has(requestedTeam));
    if (teamParam.repeated || !teamIsValid) {
      needsRedirect = true;
    } else if (requestedTeam && requestedTeam !== "all") {
      teamId = requestedTeam;
    }
  }

  const classificationParam = scalarParam(searchParams.classificacao);
  const classification = classificationParam.value
    && DASHBOARD_CLASSIFICATION_VALUES.includes(
      classificationParam.value as DashboardClassification,
    )
    ? classificationParam.value as DashboardClassification
    : "all";
  if (classificationParam.repeated
    || (classificationParam.value !== undefined
      && !DASHBOARD_CLASSIFICATION_VALUES.includes(
        classificationParam.value as DashboardClassification,
      ))) {
    needsRedirect = true;
  }

  const queryParam = scalarParam(searchParams.busca);
  const trimmedQuery = queryParam.value?.trim() ?? "";
  const query = trimmedQuery.slice(0, 120);
  if (queryParam.repeated
    || trimmedQuery !== (queryParam.value ?? "")
    || trimmedQuery.length > 120) {
    needsRedirect = true;
  }

  return {
    start,
    end,
    periodMonths,
    district,
    establishmentId,
    teamId,
    classification,
    query,
    districtIds,
    hasUnknownDistrict,
    availableEstablishmentIds,
    availableTeamIds,
    needsRedirect,
  };
}

export function managementDashboardHref(
  filters: Pick<DashboardPeriodFilterResolution,
    "start" | "end" | "district" | "establishmentId" | "teamId" | "classification" | "query">,
  pathname = "/sistema/gestao",
) {
  const search = new URLSearchParams();
  if (filters.start) search.set("inicio", filters.start);
  if (filters.end) search.set("fim", filters.end);
  if (filters.start || filters.end) {
    search.set("distrito", filters.district || "all");
    search.set("ubs", filters.establishmentId || "all");
    search.set("equipe", filters.teamId || "all");
  }
  if (filters.classification !== "all") {
    search.set("classificacao", filters.classification);
  }
  if (filters.query) search.set("busca", filters.query);
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
