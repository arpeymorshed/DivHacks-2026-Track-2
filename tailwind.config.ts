import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--sf)",
        line: {
          DEFAULT: "var(--bd)",
          soft: "var(--bdL)",
        },
        ink: {
          DEFAULT: "var(--tx)",
          muted: "var(--txM)",
          faint: "var(--txL)",
        },
        accent: {
          DEFAULT: "var(--ac)",
          soft: "var(--acL)",
        },
        ok: {
          DEFAULT: "var(--ok)",
          soft: "var(--okL)",
        },
        danger: {
          DEFAULT: "var(--no)",
          soft: "var(--noL)",
        },
        warn: {
          DEFAULT: "var(--am)",
          soft: "var(--amL)",
        },
        info: {
          DEFAULT: "var(--bl)",
          soft: "var(--blL)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "560" }],
        hero: ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "560" }],
      },
      boxShadow: {
        panel: "0 4px 16px rgba(26,26,24,0.08)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease",
        rise: "rise 0.18s ease",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
