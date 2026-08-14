import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        indigo: { DEFAULT: "var(--indigo)", soft: "var(--indigo-soft)" },
        coral: { DEFAULT: "var(--coral)", soft: "var(--coral-soft)" },
        teal: { DEFAULT: "var(--teal)", soft: "var(--teal-soft)" },
        amber: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)" },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jbmono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
