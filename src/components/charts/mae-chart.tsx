"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-slate-100" aria-label="Carregando gráfico" />,
});

type ChartClick = { name?: string };

export type AccessibleChartRow = {
  id: string;
  label: string;
  value: string;
  description?: string;
  href?: string;
};

export function MaeChart({ option, ariaLabel, accessibleData, drilldown, componentDescriptions, height = 310 }: {
  option: EChartsOption;
  ariaLabel: string;
  accessibleData: AccessibleChartRow[];
  drilldown?: Record<string, string>;
  componentDescriptions?: Record<string, string>;
  height?: number;
}) {
  const router = useRouter();
  const hasDescriptions = accessibleData.some((item) => item.description);
  const hasDrilldown = accessibleData.some((item) => item.href);
  const resolved: EChartsOption = componentDescriptions ? {
    ...option,
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter(params: unknown) {
        const item = Array.isArray(params) ? params[0] as { axisValue?: string; value?: number } : null;
        const code = item?.axisValue ?? "";
        return `<strong>${code}</strong><br/>${componentDescriptions[code] ?? ""}<br/><strong>${Number(item?.value ?? 0).toLocaleString("pt-BR")}</strong>`;
      },
    },
  } : option;

  return (
    <figure className="mae-chart">
      <div aria-label={ariaLabel} role="img">
        <ReactECharts
          option={{
            animationDuration: 750,
            animationDurationUpdate: 500,
            animationEasing: "cubicOut",
            ...resolved,
          }}
          notMerge
          lazyUpdate
          style={{ height, width: "100%" }}
          onEvents={drilldown ? { click: (event: ChartClick) => {
            const href = event.name ? drilldown[event.name] : undefined;
            if (href) router.push(href);
          } } : undefined}
        />
      </div>
      <details className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3">
        <summary className="cursor-pointer font-bold text-sky-800">Ver dados do gráfico</summary>
        <div aria-label={`Dados de ${ariaLabel}`} className="table-scroll mt-3" role="region" tabIndex={0}>
          <table className="data-table bg-white">
            <caption className="sr-only">{ariaLabel} em formato de tabela</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Valor</th>
                {hasDescriptions ? <th scope="col">Descrição</th> : null}
                {hasDrilldown ? <th scope="col">Ação</th> : null}
              </tr>
            </thead>
            <tbody>
              {accessibleData.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td>{item.value}</td>
                  {hasDescriptions ? <td>{item.description ?? "—"}</td> : null}
                  {hasDrilldown ? <td>{item.href ? <Link className="font-bold text-sky-800 underline" href={item.href}>Aprofundar</Link> : "—"}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
