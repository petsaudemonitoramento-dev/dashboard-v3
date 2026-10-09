import { describe, expect, it } from "vitest";

import { MAE_CHART_COLORS, MAE_PALETTE } from "@/lib/design/mae-brand";

describe("Identidade visual oficial MAE APS", () => {
  it("mantém exatamente as seis cores especificadas no manual", () => {
    expect(MAE_PALETTE).toEqual({
      purple: "#280063",
      mutedPurple: "#5C4798",
      lilac: "#AB87F3",
      cream: "#F9F3EF",
      blue: "#284FD8",
      orange: "#F44E04",
    });
  });

  it("limita o esquema base de gráficos às cores institucionais", () => {
    for (const color of MAE_CHART_COLORS) {
      expect(Object.values(MAE_PALETTE)).toContain(color);
    }
    expect(new Set(MAE_CHART_COLORS).size).toBe(MAE_CHART_COLORS.length);
  });
});
