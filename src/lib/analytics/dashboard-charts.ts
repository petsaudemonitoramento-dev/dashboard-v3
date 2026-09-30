import type { EChartsOption } from "echarts";

import { C3_COMPONENTS } from "@/lib/analytics/c3";

type ComparisonRow = { id: string; name: string; value: number | null };
type EvolutionRow = { month: string; value: number | null };

export function dashboardMonthLabel(value: string) {
  const date = value.length === 7 ? `${value}-01` : value.slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
    year: "2-digit",
  }).format(new Date(`${date}T00:00:00Z`)).replace(" de ", "/").toUpperCase();
}

export function formatC3(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
}

export function createDashboardCharts({
  comparison,
  componentTotals,
  drilldown,
  evolution,
}: {
  comparison: ComparisonRow[];
  componentTotals: Record<string, number>;
  drilldown: Record<string, string>;
  evolution: EvolutionRow[];
}) {
  const baseAxis = {
    axisLabel: { color: "#526477" },
    axisLine: { lineStyle: { color: "#cbd5e1" } },
  };
  const evolutionOption: EChartsOption = {
    grid: { bottom: 44, left: 48, right: 24, top: 30 },
    series: [{
      animationDuration: 650,
      areaStyle: { color: "rgba(11,114,231,.10)" },
      data: evolution.map((item) => item.value),
      itemStyle: { color: "#17b6b2" },
      lineStyle: { color: "#0b72e7", width: 4 },
      smooth: true,
      symbolSize: 9,
      type: "line",
    }],
    tooltip: { trigger: "axis" },
    xAxis: {
      ...baseAxis,
      data: evolution.map((item) => dashboardMonthLabel(item.month)),
      type: "category",
    },
    yAxis: { ...baseAxis, max: 100, min: 0, type: "value" },
  };
  const componentsOption: EChartsOption = {
    grid: { bottom: 38, left: 48, right: 24, top: 28 },
    series: [{
      animationDuration: 650,
      data: Object.values(componentTotals),
      itemStyle: { borderRadius: [6, 6, 0, 0], color: "#16a6a1" },
      type: "bar",
    }],
    xAxis: { ...baseAxis, data: Object.keys(C3_COMPONENTS), type: "category" },
    yAxis: { ...baseAxis, type: "value" },
  };
  const comparisonOption: EChartsOption = {
    grid: { bottom: 28, left: 150, right: 28, top: 16 },
    series: [{
      animationDuration: 650,
      data: comparison.map((item) => item.value),
      itemStyle: { borderRadius: [0, 6, 6, 0], color: "#ff9f43" },
      type: "bar",
    }],
    tooltip: { axisPointer: { type: "shadow" }, trigger: "axis" },
    xAxis: { ...baseAxis, max: 100, min: 0, type: "value" },
    yAxis: {
      axisLabel: { color: "#526477", overflow: "truncate", width: 130 },
      data: comparison.map((item) => item.name),
      type: "category",
    },
  };

  return {
    comparison: {
      accessibleData: comparison.map((item) => ({
        href: drilldown[item.name],
        id: item.id,
        label: item.name,
        value: formatC3(item.value),
      })),
      option: comparisonOption,
    },
    components: {
      accessibleData: Object.entries(C3_COMPONENTS).map(([code, description]) => ({
        description,
        id: code,
        label: code,
        value: componentTotals[code].toLocaleString("pt-BR"),
      })),
      option: componentsOption,
    },
    evolution: {
      accessibleData: evolution.map((item) => ({
        id: item.month,
        label: dashboardMonthLabel(item.month),
        value: formatC3(item.value),
      })),
      option: evolutionOption,
    },
  };
}
