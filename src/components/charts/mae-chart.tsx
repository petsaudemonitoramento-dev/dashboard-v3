"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-slate-100" aria-label="Carregando gráfico" />,
});

type ChartClick = { name?: string };

export function MaeChart({ option, ariaLabel, drilldown, componentDescriptions, height = 310 }: {
  option: EChartsOption;
  ariaLabel: string;
  drilldown?: Record<string, string>;
  componentDescriptions?: Record<string, string>;
  height?: number;
}) {
  const router = useRouter();
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
    <div role="img" aria-label={ariaLabel} className="mae-chart">
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
  );
}
