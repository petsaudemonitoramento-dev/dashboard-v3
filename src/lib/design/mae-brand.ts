/**
 * Paleta de identidade oficial MAE APS (Manual, p. 24).
 * Usar somente em superfícies institucionais e séries sem semântica clínica.
 * Estados de risco e alertas mantêm suas próprias cores e rótulos.
 */
export const MAE_PALETTE = {
  purple: "#280063",
  mutedPurple: "#5C4798",
  lilac: "#AB87F3",
  cream: "#F9F3EF",
  blue: "#284FD8",
  orange: "#F44E04",
} as const;

export const MAE_CHART_COLORS = [
  MAE_PALETTE.mutedPurple,
  MAE_PALETTE.blue,
  MAE_PALETTE.lilac,
  MAE_PALETTE.orange,
] as const;
