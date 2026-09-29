import type { EChartsOption } from "echarts";
import Link from "next/link";
import { GitCompareArrows, MapPinned, Scale } from "lucide-react";

import { MaeChart } from "@/components/charts/mae-chart";
import { classifyC3 } from "@/lib/analytics/c3";
import {
  fetchDistrictMonthly,
  fetchEstablishmentMonthly,
  formatC3,
  formatInteger,
  ratioOfSums,
} from "@/lib/analytics/management-pages";
import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`)).replace(".", "");
}

export default async function ComparisonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await enforceRouteGuard(() => requireDashboardAccess());
  const params = await searchParams;
  const supabase = await createClient();

  const [districtRows, establishmentRows] = await Promise.all([
    fetchDistrictMonthly(supabase),
    fetchEstablishmentMonthly(supabase),
  ]);

  const establishmentMap = new Map<string, {
    id: string;
    name: string;
    cnes: string;
    district: string;
    rows: typeof establishmentRows;
  }>();

  for (const row of establishmentRows) {
    const current = establishmentMap.get(row.establishment_id) ?? {
      id: row.establishment_id,
      name: row.establishment_name,
      cnes: row.cnes,
      district: row.district_name ?? "Não informado",
      rows: [],
    };
    current.rows.push(row);
    establishmentMap.set(row.establishment_id, current);
  }

  const establishments = [...establishmentMap.values()]
    .map((item) => ({ ...item, summary: ratioOfSums(item.rows) }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const selectedA = establishments.find((item) => item.id === params.a) ?? establishments[0];
  const selectedB = establishments.find((item) => item.id === params.b)
    ?? establishments.find((item) => item.id !== selectedA?.id)
    ?? establishments[0];

  const months = [...new Set([
    ...(selectedA?.rows.map((row) => row.competency) ?? []),
    ...(selectedB?.rows.map((row) => row.competency) ?? []),
  ])].sort();

  const comparisonOption: EChartsOption = {
    tooltip: { trigger: "axis", confine: true },
    legend: {
      top: 0,
      data: [selectedA?.name ?? "UBS A", selectedB?.name ?? "UBS B"],
      textStyle: { color: "#53657c" },
    },
    grid: { left: 44, right: 18, top: 48, bottom: 38 },
    xAxis: {
      type: "category",
      data: months.map(monthLabel),
      axisLabel: { color: "#5d7187" },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: "#5d7187" },
      splitLine: { lineStyle: { color: "#edf2f7" } },
    },
    series: [
      {
        name: selectedA?.name ?? "UBS A",
        type: "line",
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        data: months.map((month) => {
          const row = selectedA?.rows.find((item) => item.competency === month);
          return row?.c3 === null || row?.c3 === undefined ? null : Number(row.c3);
        }),
      },
      {
        name: selectedB?.name ?? "UBS B",
        type: "line",
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        data: months.map((month) => {
          const row = selectedB?.rows.find((item) => item.competency === month);
          return row?.c3 === null || row?.c3 === undefined ? null : Number(row.c3);
        }),
      },
    ],
  };

  const districtGroups = new Map<string, typeof districtRows>();
  for (const row of districtRows) {
    const key = row.district_name ?? "Não informado";
    districtGroups.set(key, [...(districtGroups.get(key) ?? []), row]);
  }

  const districts = [...districtGroups.entries()]
    .map(([name, rows]) => ({ name, summary: ratioOfSums(rows) }))
    .sort((a, b) => (b.summary.c3 ?? -1) - (a.summary.c3 ?? -1));

  const ranking = [...establishments]
    .sort((a, b) => (b.summary.c3 ?? -1) - (a.summary.c3 ?? -1));
  const best = ranking.slice(0, 8);
  const attention = [...ranking].reverse().slice(0, 8);

  return (
    <div className="management-module">
      <header className="module-header">
        <div>
          <span>Análise comparativa</span>
          <h1>Comparativos</h1>
          <p>Compare territórios e unidades no mesmo indicador, mantendo a regra de agregação pela razão entre somas.</p>
        </div>
        <div className="module-header-badge"><GitCompareArrows /> Comparação lado a lado</div>
      </header>

      <section className="dashboard-card module-comparison-selector">
        <div className="dashboard-card-heading">
          <div><span>UBS × UBS</span><h2>Escolha duas unidades para comparar</h2><p>A comparação usa todas as competências atualmente publicadas.</p></div>
        </div>
        <form method="get" className="module-compare-form">
          <label>Unidade A
            <select name="a" defaultValue={selectedA?.id}>
              {establishments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.cnes}</option>)}
            </select>
          </label>
          <label>Unidade B
            <select name="b" defaultValue={selectedB?.id}>
              {establishments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.cnes}</option>)}
            </select>
          </label>
          <button type="submit"><Scale /> Comparar</button>
        </form>
      </section>

      <section className="module-two-column comparison-focus">
        <article className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><span>Evolução</span><h2>C3 das unidades selecionadas</h2></div>
          </div>
          <MaeChart option={comparisonOption} ariaLabel="Comparação temporal do C3 entre duas UBS" height={340} />
        </article>

        <article className="dashboard-card module-comparison-summary">
          <div>
            <span className="module-compare-label">Unidade A</span>
            <h3>{selectedA?.name ?? "Sem unidade"}</h3>
            <p>{selectedA?.district ?? "Não informado"} · CNES {selectedA?.cnes ?? "—"}</p>
            <strong>{formatC3(selectedA?.summary.c3 ?? null)}</strong>
            <small>{classifyC3(selectedA?.summary.c3 ?? null)}</small>
          </div>
          <div className="module-compare-divider">×</div>
          <div>
            <span className="module-compare-label">Unidade B</span>
            <h3>{selectedB?.name ?? "Sem unidade"}</h3>
            <p>{selectedB?.district ?? "Não informado"} · CNES {selectedB?.cnes ?? "—"}</p>
            <strong>{formatC3(selectedB?.summary.c3 ?? null)}</strong>
            <small>{classifyC3(selectedB?.summary.c3 ?? null)}</small>
          </div>
        </article>
      </section>

      <section className="dashboard-card module-table-card">
        <div className="dashboard-card-heading">
          <div><span>Distritos</span><h2>Comparação consolidada por distrito</h2><p>Unidades sem vínculo territorial confirmado permanecem em “Não informado”.</p></div>
          <MapPinned className="size-5 text-blue-600" />
        </div>
        <div className="table-scroll">
          <table className="data-table module-data-table">
            <thead><tr><th>Distrito</th><th>Denominador</th><th>C3</th><th>Classificação</th></tr></thead>
            <tbody>
              {districts.map((item) => (
                <tr key={item.name}>
                  <td><strong>{item.name}</strong></td>
                  <td>{formatInteger(item.summary.denominator)}</td>
                  <td><strong>{formatC3(item.summary.c3)}</strong></td>
                  <td>{classifyC3(item.summary.c3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="module-two-column">
        <article className="dashboard-card module-ranking-card">
          <div className="dashboard-card-heading">
            <div><span>Destaques</span><h2>Maiores resultados por UBS</h2></div>
          </div>
          <ol>
            {best.map((item) => (
              <li key={item.id}>
                <span><strong>{item.name}</strong><small>{item.district} · CNES {item.cnes}</small></span>
                <b>{formatC3(item.summary.c3)}</b>
              </li>
            ))}
          </ol>
        </article>

        <article className="dashboard-card module-ranking-card">
          <div className="dashboard-card-heading">
            <div><span>Atenção</span><h2>Menores resultados por UBS</h2></div>
          </div>
          <ol>
            {attention.map((item) => (
              <li key={item.id}>
                <span><strong>{item.name}</strong><small>{item.district} · CNES {item.cnes}</small></span>
                <b>{formatC3(item.summary.c3)}</b>
              </li>
            ))}
          </ol>
          <Link className="module-detail-link" href="/sistema/gestao/ubs-equipes">Abrir lista completa de UBS e equipes</Link>
        </article>
      </section>
    </div>
  );
}
