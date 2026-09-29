import type { EChartsOption } from "echarts";
import { Activity, BarChart3, CalendarRange, ListChecks } from "lucide-react";

import { MaeChart } from "@/components/charts/mae-chart";
import { C3_COMPONENTS, classifyC3 } from "@/lib/analytics/c3";
import {
  fetchPracticeSummary,
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

const SHORT_LABELS: Record<string, string> = {
  A: "1ª consulta até 12 semanas",
  B: "7+ consultas",
  C: "Pressão arterial",
  D: "Peso e altura",
  E: "Visitas domiciliares",
  F: "dTpa",
  G: "Testes do 1º trimestre",
  H: "Sífilis/HIV no 3º trimestre",
  I: "Consulta puerperal",
  J: "Visita puerperal",
  K: "Saúde bucal",
};

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`)).replace(".", "");
}

export default async function IndicatorsPage() {
  await enforceRouteGuard(() => requireDashboardAccess());
  const supabase = await createClient();
  const [facts, practices] = await Promise.all([
    fetchTeamMonthly(supabase),
    fetchPracticeSummary(supabase),
  ]);

  const overall = ratioOfSums(facts);
  const competencies = [...new Set(facts.map((row) => row.competency))].sort();

  const practiceRows = Object.keys(C3_COMPONENTS).map((code) => {
    const rows = practices.filter((row) => row.practice_code === code);
    const fulfilled = rows.reduce((sum, row) => sum + row.fulfilled, 0);
    const denominator = rows.reduce((sum, row) => sum + row.denominator, 0);
    return {
      code,
      label: SHORT_LABELS[code],
      description: C3_COMPONENTS[code as keyof typeof C3_COMPONENTS],
      fulfilled,
      denominator,
      rate: denominator > 0 ? (fulfilled / denominator) * 100 : null,
    };
  });

  const monthly = competencies.map((competency) => {
    const monthFacts = facts.filter((row) => row.competency === competency);
    const monthSummary = ratioOfSums(monthFacts);
    return {
      competency,
      c3: monthSummary.c3,
      denominator: monthSummary.denominator,
    };
  });

  const lowest = [...practiceRows]
    .filter((row) => row.rate !== null)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))[0];
  const highest = [...practiceRows]
    .filter((row) => row.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

  const c3Option: EChartsOption = {
    tooltip: { trigger: "axis", confine: true },
    grid: { left: 44, right: 18, top: 22, bottom: 35 },
    xAxis: {
      type: "category",
      data: monthly.map((row) => monthLabel(row.competency)),
      axisLabel: { color: "#5d7187" },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: "#5d7187" },
      splitLine: { lineStyle: { color: "#edf2f7" } },
    },
    series: [{
      name: "C3",
      type: "line",
      smooth: true,
      symbolSize: 7,
      lineStyle: { width: 3 },
      data: monthly.map((row) => row.c3),
    }],
  };

  const practicesOption: EChartsOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true },
    grid: { left: 44, right: 18, top: 20, bottom: 36 },
    xAxis: {
      type: "category",
      data: practiceRows.map((row) => row.code),
      axisLabel: { color: "#5d7187", fontWeight: 700 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: "#5d7187" },
      splitLine: { lineStyle: { color: "#edf2f7" } },
    },
    series: [{
      type: "bar",
      barMaxWidth: 38,
      data: practiceRows.map((row) => row.rate ?? 0),
    }],
  };

  return (
    <div className="management-module">
      <header className="module-header">
        <div>
          <span>Indicador C3 · visão aprofundada</span>
          <h1>Indicadores</h1>
          <p>Detalhamento do resultado consolidado e das práticas A–K que compõem o C3 de Gestação e Puerpério.</p>
        </div>
        <div className="module-header-badge"><CalendarRange /> {competencies.length} competências</div>
      </header>

      <section className="module-stat-grid">
        <article><BarChart3 /><span>C3 consolidado</span><strong>{formatC3(overall.c3)}</strong><small>{classifyC3(overall.c3)}</small></article>
        <article><ListChecks /><span>Denominador acumulado</span><strong>{formatInteger(overall.denominator)}</strong><small>registros elegíveis</small></article>
        <article><Activity /><span>Menor cobertura</span><strong>{lowest ? `${lowest.code} · ${formatPercent(lowest.rate)}` : "—"}</strong><small>{lowest?.label ?? "Sem dados"}</small></article>
        <article><Activity /><span>Maior cobertura</span><strong>{highest ? `${highest.code} · ${formatPercent(highest.rate)}` : "—"}</strong><small>{highest?.label ?? "Sem dados"}</small></article>
      </section>

      <section className="module-two-column">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span>Evolução</span><h2>C3 por competência</h2><p>Acompanhamento temporal do resultado consolidado.</p></div>
          </div>
          <MaeChart option={c3Option} ariaLabel="Evolução do C3 por competência" height={320} />
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span>Práticas</span><h2>Cobertura geral A–K</h2><p>Percentual de cumprimento de cada componente no período disponível.</p></div>
          </div>
          <MaeChart option={practicesOption} ariaLabel="Cobertura das práticas A a K" height={320} />
        </article>
      </section>

      <section className="dashboard-card module-table-card">
        <div className="dashboard-card-heading">
          <div><span>Detalhamento</span><h2>Práticas que compõem o C3</h2><p>Valores calculados pela razão entre cumprimentos e denominadores agregados.</p></div>
        </div>
        <div className="table-scroll">
          <table className="data-table module-data-table">
            <thead>
              <tr>
                <th>Prática</th><th>Descrição</th><th>Cumprimentos</th><th>Denominador</th><th>Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {practiceRows.map((row) => (
                <tr key={row.code}>
                  <td><strong>{row.code}</strong><br/><small>{row.label}</small></td>
                  <td>{row.description}</td>
                  <td>{formatInteger(row.fulfilled)}</td>
                  <td>{formatInteger(row.denominator)}</td>
                  <td><strong>{formatPercent(row.rate)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
