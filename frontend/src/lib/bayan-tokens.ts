/**
 * Typed reference to the approved Bayan Design System tokens.
 * Prefer CSS variables in components; use these definitions for programmatic computations and documentation.
 * Preserves full backwards compatibility with approved branding and legacy screens.
 */
export const bayanTokens = {
  brand: {
    navy: "#0A2342",
    turquoise: "#00A6B2",
    gold: "#D29E2C",
    navyDark: "#061527",
    tealAction: "#007681",
  },
  surfaces: {
    app: "#F8FAFC",
    card: "#FFFFFF",
    raised: "#FFFFFF",
    subtle: "#F1F5F9",
    soft: "#EFFBFC",
    info: "#EFF6FF",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#64748B",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
  },
  border: {
    subtle: "#E2E8F0",
    strong: "#CBD5E1",
    focus: "#008B96",
  },
  feedback: {
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#2563EB",
  },
  feedbackBg: {
    success: "#ECFDF5",
    warning: "#FFFBEB",
    danger: "#FEF2F2",
    info: "#EFF6FF",
  },
  fontFamily: "var(--font-bayan-arabic), 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
  fontMono: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
  fontSizes: {
    "2xs": 11,
    xs: 12,
    sm: 14,
    md: 16,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  spacingPx: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radiusPx: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    "2xl": 28,
    pill: 9999,
  },
  controlHeightsPx: {
    sm: 36,
    md: 42,
    lg: 48,
  },
  breakpointsPx: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440,
  },
} as const;
