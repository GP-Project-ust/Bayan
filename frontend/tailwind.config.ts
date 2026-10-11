import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // هوية بيان: أزرق داكن مؤسسي + ذهبي للتمييز
        bayan: {
          50: "#eef4fb",
          100: "#d9e6f6",
          200: "#b3cdec",
          300: "#84acdf",
          400: "#5289d0",
          500: "#326bbd",
          600: "#26559d",
          700: "#20467f",
          800: "#1d3a68",
          900: "#1b3057",
          950: "#12203a",
        },
        gold: {
          400: "#e3b34c",
          500: "#d29e2c",
        },
      },
      fontFamily: {
        arabic: [
          "Tajawal",
          "Cairo",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
