/** Typed reference to the approved Bayan Design System tokens.
 * Prefer CSS variables in components; use these definitions for documentation.
 * Values intentionally preserve the approved branding and do not alter legacy screens.
 */
export const bayanTokens = {
  brand: { navy: "#0A2342", turquoise: "#00A6B2" },
  surfaces: { app: "#F5F9FD", card: "#FFFFFF", soft: "#EAF7F8" },
  text: { primary: "#122B48", secondary: "#52677F" },
  border: { subtle: "#DCE7F2" },
  feedback: {
    success: "#188D57", warning: "#9A6700", danger: "#C52B35", info: "#2368A2"
  },
  fontFamily: "Cairo, Noto Sans Arabic, Tahoma, Arial, sans-serif",
  fontSizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, "2xl": 32 },
  spacingPx: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radiusPx: { sm: 6, md: 10, lg: 16, xl: 22 },
  breakpointsPx: { mobile: 480, tablet: 768, desktop: 1024, wide: 1440 }
} as const;
