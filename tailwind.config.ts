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
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["2.75rem", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        hero: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "600" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10,15,14,0.04)",
        float: "0 12px 40px rgba(10,15,14,0.08)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        msgPop: {
          from: { opacity: "0", transform: "scale(0.98) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease",
        "msg-pop": "msgPop 0.2s ease",
        "toast-in": "toastIn 0.25s ease",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
