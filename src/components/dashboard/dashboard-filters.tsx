"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  CalendarRange,
  CircleHelp,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  dashboardHref,
  managementDashboardHref,
  type DashboardClassification,
} from "@/lib/analytics/dashboard-filters";

export type DashboardFilterOption = {
  label: string;
  value: string;
};

function FilterHelp({ text }: { text: string }) {
  return (
    <span
      aria-label={`Ajuda: ${text}`}
      className="dashboard-help dashboard-filter-help"
      data-tooltip={text}
      role="img"
      tabIndex={0}
    >
      <CircleHelp aria-hidden="true" />
    </span>
  );
}

type DashboardFilterSelection = {
  competency: string;
  district: string;
  establishmentId: string;
  teamId: string;
};

export function DashboardFilters({
  selection: initialSelection,
  competencies,
  districts,
  establishments,
  teams,
}: {
  selection: DashboardFilterSelection;
  competencies: DashboardFilterOption[];
  districts: DashboardFilterOption[];
  establishments: DashboardFilterOption[];
  teams: DashboardFilterOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useOptimistic(initialSelection);

  function navigate(next: DashboardFilterSelection) {
    startTransition(() => {
      setSelection(next);
      router.push(dashboardHref(next), { scroll: false });
    });
  }

  return (
    <form aria-busy={isPending} className="filter-bar scroll-target" id="ubs-equipes" method="get">
      <label>
        Período
        <select
          disabled={isPending}
          name="competencia"
          onChange={(event) => navigate({ ...selection, competency: event.target.value })}
          value={selection.competency}
        >
          {competencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>
        Distrito
        <select
          disabled={isPending}
          name="distrito"
          onChange={(event) => navigate({
            competency: selection.competency,
            district: event.target.value,
            establishmentId: "all",
            teamId: "all",
          })}
          value={selection.district}
        >
          <option value="all">Município inteiro</option>
          <option value="unknown">Não informado</option>
          {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>
        UBS
        <select
          disabled={isPending || establishments.length === 0}
          name="ubs"
          onChange={(event) => navigate({
            ...selection,
            establishmentId: event.target.value,
            teamId: "all",
          })}
          value={selection.establishmentId}
        >
          <option value="all">Todas as UBS</option>
          {establishments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>
        Equipe
        <select
          disabled={isPending || selection.establishmentId === "all" || teams.length === 0}
          name="equipe"
          onChange={(event) => navigate({ ...selection, teamId: event.target.value })}
          value={selection.teamId}
        >
          <option value="all">Todas as equipes</option>
          {teams.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <button className="primary-button" disabled={isPending} type="submit">Aplicar</button>
      <span aria-live="polite" className="sr-only">
        {isPending ? "Atualizando filtros." : "Filtros atualizados."}
      </span>
    </form>
  );
}

type ManagementFilterSelection = {
  start: string;
  end: string;
  district: string;
  establishmentId: string;
  teamId: string;
  classification: DashboardClassification;
  query: string;
};

export function ManagementDashboardFilters({
  selection: initialSelection,
  competencies,
  districts,
  establishments,
  teams,
  classifications,
  showUnknownDistrict,
}: {
  selection: ManagementFilterSelection;
  competencies: DashboardFilterOption[];
  districts: DashboardFilterOption[];
  establishments: DashboardFilterOption[];
  teams: DashboardFilterOption[];
  classifications: DashboardFilterOption[];
  showUnknownDistrict: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useOptimistic(initialSelection);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const geographicParentPending = isPending && (
    selection.start !== initialSelection.start
    || selection.end !== initialSelection.end
    || selection.district !== initialSelection.district
  );
  const teamOptionsPending = geographicParentPending
    || (isPending && selection.establishmentId !== initialSelection.establishmentId);

  useEffect(() => {
    if (queryInputRef.current
      && queryInputRef.current.value !== initialSelection.query) {
      queryInputRef.current.value = initialSelection.query;
    }
  }, [initialSelection.query]);

  useEffect(() => {
    if (isPending || !pendingFocusRef.current) return;

    const name = pendingFocusRef.current;
    pendingFocusRef.current = null;
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${name}"]`)
        ?.focus();
    });
  }, [
    isPending,
    initialSelection.start,
    initialSelection.end,
    initialSelection.district,
    initialSelection.establishmentId,
    initialSelection.teamId,
    initialSelection.classification,
  ]);

  function currentQuery() {
    return queryInputRef.current?.value ?? initialSelection.query;
  }

  function navigate(next: ManagementFilterSelection, focusName?: string) {
    if (focusName) pendingFocusRef.current = focusName;
    startTransition(() => {
      setSelection(next);
      router.push(managementDashboardHref(next), { scroll: false });
    });
  }

  return (
    <form
      ref={formRef}
      aria-busy={isPending}
      className="dashboard-filter-grid"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ ...selection, query: currentQuery() });
      }}
    >
      <div className="dashboard-period-group">
        <span className="dashboard-filter-label">
          <CalendarRange aria-hidden="true" />
          Período
          <FilterHelp text="Define as competências inicial e final incluídas no recorte. Indicadores acumulados somam os dados das competências selecionadas." />
        </span>
        <div className="dashboard-period-selects">
          <label className="sr-only" htmlFor="dashboard-inicio">Início do período</label>
          <select
            id="dashboard-inicio"
            name="inicio"
            onChange={(event) => navigate({
              ...selection,
              start: event.target.value,
              query: currentQuery(),
            }, event.currentTarget.name)}
            value={selection.start}
          >
            {competencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="dashboard-fim">Fim do período</label>
          <select
            id="dashboard-fim"
            name="fim"
            onChange={(event) => navigate({
              ...selection,
              end: event.target.value,
              query: currentQuery(),
            }, event.currentTarget.name)}
            value={selection.end}
          >
            {competencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <label>
        <span className="dashboard-filter-label"><MapPin aria-hidden="true" />Distrito <FilterHelp text="Restringe a análise ao distrito sanitário informado no cadastro territorial. Ao trocar o distrito, UBS e equipe são redefinidas para evitar combinações incompatíveis." /></span>
        <select
          name="distrito"
          onChange={(event) => navigate({
            ...selection,
            district: event.target.value,
            establishmentId: "all",
            teamId: "all",
            query: currentQuery(),
          }, event.currentTarget.name)}
          value={selection.district}
        >
          <option value="all">Todos os distritos</option>
          {showUnknownDistrict ? <option value="unknown">Não informado</option> : null}
          {districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>

      <label>
        <span className="dashboard-filter-label"><Building2 aria-hidden="true" />UBS <FilterHelp text="Filtra os indicadores pela Unidade Básica de Saúde vinculada aos registros do SIAPS no recorte selecionado." /></span>
        <select
          disabled={geographicParentPending || establishments.length === 0}
          name="ubs"
          onChange={(event) => navigate({
            ...selection,
            establishmentId: event.target.value,
            teamId: "all",
            query: currentQuery(),
          }, event.currentTarget.name)}
          value={selection.establishmentId}
        >
          <option value="all">Todas as UBS</option>
          {establishments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>

      <label>
        <span className="dashboard-filter-label"><Users aria-hidden="true" />Equipe <FilterHelp text="Refina a análise para uma equipe específica da UBS selecionada, identificada pelo vínculo territorial disponível nos dados." /></span>
        <select
          disabled={teamOptionsPending || selection.establishmentId === "all" || teams.length === 0}
          name="equipe"
          onChange={(event) => navigate({
            ...selection,
            teamId: event.target.value,
            query: currentQuery(),
          }, event.currentTarget.name)}
          value={selection.teamId}
        >
          <option value="all">Todas as equipes</option>
          {teams.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>

      <div className="dashboard-filter-secondary">
        <label>
          <span className="dashboard-filter-label"><SlidersHorizontal aria-hidden="true" />Classificação C3 <FilterHelp text="Classificação do C3 agregado no recorte: Ótimo acima de 75; Bom acima de 50; Suficiente acima de 25; Regular até 25." /></span>
          <select
            name="classificacao"
            onChange={(event) => navigate({
              ...selection,
              classification: event.target.value as DashboardClassification,
              query: currentQuery(),
            }, event.currentTarget.name)}
            value={selection.classification}
          >
            {classifications.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <label className="dashboard-search-filter">
          <span className="dashboard-filter-label"><Search aria-hidden="true" />Busca <FilterHelp text="Localiza UBS ou equipes por nome, CNES ou INE dentro do recorte territorial disponível." /></span>
          <input
            defaultValue={initialSelection.query}
            maxLength={120}
            name="busca"
            placeholder="Nome, CNES ou INE"
            ref={queryInputRef}
          />
        </label>

        <div className="dashboard-filter-actions">
          <button disabled={isPending} type="submit"><Activity aria-hidden="true" className="size-4" /> Aplicar filtros</button>
          <Link href="/sistema/gestao">Limpar</Link>
        </div>
      </div>

      <span aria-live="polite" className="sr-only">
        {isPending ? "Atualizando filtros." : "Filtros atualizados."}
      </span>
    </form>
  );
}
