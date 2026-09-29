import Link from "next/link";
import { Building2, Search, Users } from "lucide-react";

import { classifyC3 } from "@/lib/analytics/c3";
import {
  fetchTeamMonthly,
  formatC3,
  formatInteger,
  ratioOfSums,
  type TeamMonthlyRow,
} from "@/lib/analytics/management-pages";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Aggregate = {
  id: string;
  name: string;
  code: string;
  district: string;
  rows: TeamMonthlyRow[];
  teamIds: Set<string>;
};

function classificationCode(value: ReturnType<typeof classifyC3>) {
  if (value === "Ótimo") return "otimo";
  if (value === "Bom") return "bom";
  if (value === "Suficiente") return "suficiente";
  if (value === "Regular") return "regular";
  if (value === "Valor inválido") return "invalido";
  return "sem";
}

export default async function EstablishmentsTeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await enforceRouteGuard(() => requireDashboardAccess());
  const params = await searchParams;
  const supabase = await createClient();
  const facts = await fetchTeamMonthly(supabase);

  const districts = [...new Set(facts.map((row) => row.district_name ?? "Não informado"))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const query = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const districtFilter = params.distrito ?? "all";
  const classificationFilter = params.classificacao ?? "all";

  const establishmentGroups = new Map<string, Aggregate>();
  for (const row of facts) {
    const current = establishmentGroups.get(row.establishment_id) ?? {
      id: row.establishment_id,
      name: row.establishment_name,
      code: row.cnes,
      district: row.district_name ?? "Não informado",
      rows: [],
      teamIds: new Set<string>(),
    };
    current.rows.push(row);
    current.teamIds.add(row.team_id);
    establishmentGroups.set(row.establishment_id, current);
  }

  const establishments = [...establishmentGroups.values()]
    .map((item) => {
      const summary = ratioOfSums(item.rows);
      return {
        ...item,
        denominator: summary.denominator,
        c3: summary.c3,
        classification: classifyC3(summary.c3),
      };
    })
    .filter((item) => {
      if (districtFilter !== "all" && item.district !== districtFilter) return false;
      if (classificationFilter !== "all" && classificationCode(item.classification) !== classificationFilter) return false;
      if (query && !`${item.name} ${item.code} ${item.district}`.toLocaleLowerCase("pt-BR").includes(query)) return false;
      return true;
    })
    .sort((a, b) => (a.c3 ?? -1) - (b.c3 ?? -1));

  const teamGroups = new Map<string, Aggregate>();
  for (const row of facts) {
    const current = teamGroups.get(row.team_id) ?? {
      id: row.team_id,
      name: row.team_name || "Equipe sem nome",
      code: row.ine,
      district: row.district_name ?? "Não informado",
      rows: [],
      teamIds: new Set<string>(),
    };
    current.rows.push(row);
    current.teamIds.add(row.team_id);
    teamGroups.set(row.team_id, current);
  }

  const establishmentByTeam = new Map(
    facts.map((row) => [row.team_id, { id: row.establishment_id, name: row.establishment_name, cnes: row.cnes }]),
  );

  const teams = [...teamGroups.values()]
    .map((item) => {
      const summary = ratioOfSums(item.rows);
      return {
        ...item,
        denominator: summary.denominator,
        c3: summary.c3,
        classification: classifyC3(summary.c3),
        establishment: establishmentByTeam.get(item.id),
      };
    })
    .filter((item) => {
      if (districtFilter !== "all" && item.district !== districtFilter) return false;
      if (classificationFilter !== "all" && classificationCode(item.classification) !== classificationFilter) return false;
      if (query) {
        const haystack = `${item.name} ${item.code} ${item.district} ${item.establishment?.name ?? ""} ${item.establishment?.cnes ?? ""}`
          .toLocaleLowerCase("pt-BR");
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.c3 ?? -1) - (b.c3 ?? -1));

  return (
    <div className="management-module">
      <header className="module-header">
        <div>
          <span>Território assistencial</span>
          <h1>UBS e equipes</h1>
          <p>Visão detalhada do desempenho por unidade e equipe, preservando CNES, INE e distrito informado no cadastro territorial.</p>
        </div>
        <div className="module-header-badge"><Building2 /> {establishmentGroups.size} UBS · {teamGroups.size} equipes</div>
      </header>

      <form className="module-filter-bar" method="get">
        <label>
          Busca
          <div className="module-search-field"><Search /><input name="busca" defaultValue={params.busca} placeholder="Nome, CNES ou INE" /></div>
        </label>
        <label>
          Distrito
          <select name="distrito" defaultValue={districtFilter}>
            <option value="all">Todos</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </label>
        <label>
          Classificação
          <select name="classificacao" defaultValue={classificationFilter}>
            <option value="all">Todas</option>
            <option value="otimo">Ótimo</option>
            <option value="bom">Bom</option>
            <option value="suficiente">Suficiente</option>
            <option value="regular">Regular</option>
            <option value="sem">Sem população elegível</option>
            <option value="invalido">Valor inválido</option>
          </select>
        </label>
        <div className="module-filter-actions">
          <button type="submit">Aplicar</button>
          <Link href="/sistema/gestao/ubs-equipes">Limpar</Link>
        </div>
      </form>

      <section className="module-stat-grid compact">
        <article><Building2 /><span>UBS no recorte</span><strong>{formatInteger(establishments.length)}</strong><small>{establishmentGroups.size} cadastradas no conjunto</small></article>
        <article><Users /><span>Equipes no recorte</span><strong>{formatInteger(teams.length)}</strong><small>{teamGroups.size} cadastradas no conjunto</small></article>
      </section>

      <section className="dashboard-card module-table-card">
        <div className="dashboard-card-heading">
          <div><span>Unidades</span><h2>Desempenho consolidado por UBS</h2><p>Ordenado do menor para o maior C3 para facilitar a identificação de unidades que merecem aprofundamento.</p></div>
        </div>
        <div className="table-scroll">
          <table className="data-table module-data-table">
            <thead><tr><th>UBS</th><th>Distrito</th><th>Equipes</th><th>Denominador</th><th>C3</th><th>Classificação</th><th></th></tr></thead>
            <tbody>
              {establishments.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><br/><small>CNES {item.code}</small></td>
                  <td>{item.district}</td>
                  <td>{item.teamIds.size}</td>
                  <td>{formatInteger(item.denominator)}</td>
                  <td><strong>{formatC3(item.c3)}</strong></td>
                  <td><span className="module-classification">{item.classification}</span></td>
                  <td><Link className="module-detail-link" href={`/sistema/gestao?ubs=${item.id}`}>Abrir análise</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-card module-table-card">
        <div className="dashboard-card-heading">
          <div><span>Equipes</span><h2>Desempenho consolidado por equipe</h2><p>Detalhamento por INE com vínculo à UBS de referência.</p></div>
        </div>
        <div className="table-scroll">
          <table className="data-table module-data-table">
            <thead><tr><th>Equipe</th><th>UBS</th><th>Distrito</th><th>Denominador</th><th>C3</th><th>Classificação</th><th></th></tr></thead>
            <tbody>
              {teams.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><br/><small>INE {item.code}</small></td>
                  <td>{item.establishment?.name ?? "Não informado"}<br/><small>{item.establishment?.cnes ? `CNES ${item.establishment.cnes}` : ""}</small></td>
                  <td>{item.district}</td>
                  <td>{formatInteger(item.denominator)}</td>
                  <td><strong>{formatC3(item.c3)}</strong></td>
                  <td><span className="module-classification">{item.classification}</span></td>
                  <td><Link className="module-detail-link" href={`/sistema/gestao?equipe=${item.id}`}>Abrir análise</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
