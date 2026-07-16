import type { Config } from "tailwindcss";

/**
 * Tokens del design system "Pulse CRM DS PBV".
 * Fuente: design/PROY CRM Pulse/_ds/pulse-crm-ds-pbv-.../tokens/*.css
 * y design/Pulse CRM Design System.md
 * Marca indigo #4F46E5, neutros slate, Plus Jakarta Sans (UI) + JetBrains Mono (cifras).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          active: "#3730A3",
          subtle: "#EEF2FF",
          border: "#C7D2FE",
        },
        accent: "#7C3AED",
        success: { DEFAULT: "#059669", fg: "#047857", bg: "#ECFDF5", border: "#D1FAE5" },
        warning: { DEFAULT: "#F59E0B", fg: "#B45309", bg: "#FFFBEB", border: "#FEF3C7" },
        danger: { DEFAULT: "#DC2626", fg: "#B91C1C", bg: "#FEF2F2", border: "#FEE2E2" },
        info: { DEFAULT: "#2563EB", fg: "#1D4ED8", bg: "#EFF6FF", border: "#DBEAFE" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15,23,42,0.06)",
        sm: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        md: "0 4px 8px -2px rgba(15,23,42,0.10), 0 2px 4px -2px rgba(15,23,42,0.06)",
        lg: "0 12px 20px -4px rgba(15,23,42,0.12), 0 4px 8px -4px rgba(15,23,42,0.06)",
        xl: "0 24px 40px -8px rgba(15,23,42,0.18), 0 8px 16px -8px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
