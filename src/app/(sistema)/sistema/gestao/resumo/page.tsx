import { AlertTriangle, CalendarRange, CheckCircle2, Database, MapPinned } from "lucide-react";

import { C3_COMPONENTS, classifyC3 } from "@/lib/analytics/c3";
import {
  fetchPracticeSummary,
  fetchTeamDirectory,
  fetchTeamMonthly,
  formatC3,
  formatInteger,
  formatPercent,
  ratioOfSums,
} from "@/lib/analytics/management-pages";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function longMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`));
}

export default async function ManagementSummaryPage() {
  const { profile } = await enforceRouteGuard(() => requireDashboardAccess());
  const supabase = await createClient();

  const [facts, practices, directory] = await Promise.all([
    fetchTeamMonthly(supabase),
    fetchPracticeSummary(supabase),
    fetchTeamDirectory(supabase),
  ]);

  const overall = ratioOfSums(facts);
  const competencies = [...new Set(facts.map((row) => row.competency))].sort();
  const establishments = new Set(facts.map((row) => row.establishment_id));
  const teams = new Set(facts.map((row) => row.team_id));

  const unknownEstablishments = new Set(
    directory
      .filter((row) => row.establishment_id && row.district_id === null)
      .map((row) => row.establishment_id),
  );

  const teamGroups = new Map<string, typeof facts>();
  for (const row of facts) {
    teamGroups.set(row.team_id, [...(teamGroups.get(row.team_id) ?? []), row]);
  }

  const classificationCounts: Record<string, number> = {
    "Ótimo": 0,
    "Bom": 0,
    "Suficiente": 0,
    "Regular": 0,
    "Valor inválido": 0,
    "Sem população elegível": 0,
  };

  for (const rows of teamGroups.values()) {
    classificationCounts[classifyC3(ratioOfSums(rows).c3)] += 1;
  }

  const practiceRows = Object.keys(C3_COMPONENTS).map((code) => {
    const rows = practices.filter((row) => row.practice_code === code);
    const fulfilled = rows.reduce((sum, row) => sum + row.fulfilled, 0);
    const denominator = rows.reduce((sum, row) => sum + row.denominator, 0);
    return {
      code,
      description: C3_COMPONENTS[code as keyof typeof C3_COMPONENTS],
      rate: denominator > 0 ? (fulfilled / denominator) * 100 : null,
    };
  });

  const orderedPractices = [...practiceRows]
    .filter((row) => row.rate !== null)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  const lowest = orderedPractices.slice(0, 4);
  const highest = [...orderedPractices].reverse().slice(0, 3);

  let recentImports: Array<{
    id: string;
    filename: string;
    competency: string;
    status: string;
    rows_total: number;
    uploaded_at: string;
  }> = [];

  if (profile.role === "gestao") {
    const result = await supabase
      .schema("siaps")
      .from("imports")
      .select("id,filename,competency,status,rows_total,uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(5);

    if (!result.error) recentImports = result.data ?? [];
  }

  return (
    <div className="management-module">
      <header className="module-header">
        <div>
          <span>Síntese gerencial</span>
          <h1>Resumo</h1>
          <p>Leitura executiva do conjunto publicado, com resultado consolidado, distribuição das equipes, pontos de atenção e qualidade territorial.</p>
        </div>
        <div className="module-header-badge"><Database /> Dados oficiais SIAPS</div>
      </header>

      <section className="module-stat-grid">
        <article><CheckCircle2 /><span>C3 consolidado</span><strong>{formatC3(overall.c3)}</strong><small>{classifyC3(overall.c3)}</small></article>
        <article><CalendarRange /><span>Competências</span><strong>{competencies.length}</strong><small>{competencies.length ? `${longMonth(competencies[0])} a ${longMonth(competencies.at(-1)!)}` : "Sem dados"}</small></article>
        <article><Database /><span>Escopo</span><strong>{formatInteger(teams.size)}</strong><small>{formatInteger(establishments.size)} UBS</small></article>
        <article><MapPinned /><span>UBS sem distrito</span><strong>{formatInteger(unknownEstablishments.size)}</strong><small>vínculo territorial não informado</small></article>
      </section>

      <section className="module-two-column">
        <article className="dashboard-card module-summary-narrative">
          <div className="dashboard-card-heading">
            <div><span>Leitura executiva</span><h2>Situação geral do C3</h2></div>
          </div>
          <p>
            O conjunto disponível apresenta C3 consolidado de <strong>{formatC3(overall.c3)}</strong>,
            classificado como <strong>{classifyC3(overall.c3)}</strong>, com
            <strong> {formatInteger(overall.denominator)}</strong> registros elegíveis distribuídos em
            <strong> {formatInteger(teams.size)}</strong> equipes e <strong>{formatInteger(establishments.size)}</strong> UBS.
          </p>
          {orderedPractices.length > 0 && (
            <p>
              A prática com menor cobertura é <strong>{orderedPractices[0].code}</strong> ({formatPercent(orderedPractices[0].rate)}),
              enquanto a maior cobertura aparece em <strong>{orderedPractices.at(-1)!.code}</strong> ({formatPercent(orderedPractices.at(-1)!.rate)}).
            </p>
          )}
          {unknownEstablishments.size > 0 && (
            <p className="module-warning-line">
              <AlertTriangle /> Existem <strong>{unknownEstablishments.size} UBS</strong> sem distrito confirmado. Elas continuam no consolidado municipal e aparecem como “Não informado”.
            </p>
          )}
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span>Classificação</span><h2>Equipes por faixa de resultado</h2></div>
          </div>
          <div className="module-classification-grid">
            {Object.entries(classificationCounts).map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{formatInteger(value)}</strong></div>
            ))}
          </div>
        </article>
      </section>

      <section className="module-two-column">
        <article className="dashboard-card module-ranking-card">
          <div className="dashboard-card-heading">
            <div><span>Pontos de atenção</span><h2>Menores coberturas entre A–K</h2></div>
          </div>
          <ol>
            {lowest.map((item) => (
              <li key={item.code}>
                <span><strong>{item.code}</strong><small>{item.description}</small></span>
                <b>{formatPercent(item.rate)}</b>
              </li>
            ))}
          </ol>
        </article>

        <article className="dashboard-card module-ranking-card">
          <div className="dashboard-card-heading">
            <div><span>Destaques</span><h2>Maiores coberturas entre A–K</h2></div>
          </div>
          <ol>
            {highest.map((item) => (
              <li key={item.code}>
                <span><strong>{item.code}</strong><small>{item.description}</small></span>
                <b>{formatPercent(item.rate)}</b>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="dashboard-card module-table-card">
        <div className="dashboard-card-heading">
          <div>
            <span>Rastreabilidade</span>
            <h2>{profile.role === "gestao" ? "Últimas importações" : "Origem dos dados"}</h2>
            <p>{profile.role === "gestao" ? "Histórico recente de publicações SIAPS disponíveis ao perfil Gestão." : "O histórico de arquivos é restrito à Gestão; o perfil Leitura consulta apenas os dados publicados."}</p>
          </div>
        </div>

        {profile.role === "gestao" ? (
          <div className="table-scroll">
            <table className="data-table module-data-table">
              <thead><tr><th>Data</th><th>Arquivo</th><th>Competência</th><th>Registros</th><th>Status</th></tr></thead>
              <tbody>
                {recentImports.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.uploaded_at).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}</td>
                    <td>{item.filename}</td>
                    <td>{longMonth(item.competency)}</td>
                    <td>{formatInteger(item.rows_total)}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
                {!recentImports.length && <tr><td colSpan={5}>Nenhuma importação registrada.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="module-readable-note">Os indicadores apresentados são derivados das competências oficiais publicadas no MAE APS. Nenhum valor simulado é utilizado nesta área.</p>
        )}
      </section>
    </div>
  );
}
