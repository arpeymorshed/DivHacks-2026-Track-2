import type { Config } from "tailwindcss";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

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
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["3rem", { lineHeight: "0.98", letterSpacing: "-0.045em", fontWeight: "700" }],
        hero: ["2.125rem", { lineHeight: "1.1", letterSpacing: "-0.035em", fontWeight: "700" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(12,18,16,0.04)",
        float: "0 18px 50px rgba(12,18,16,0.12)",
        lift: "0 8px 24px rgba(12,18,16,0.08)",
      },
      transitionTimingFunction: {
        snappy: ease,
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        msgPop: {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        sheetIn: {
          from: { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        tabSlide: {
          from: { transform: "scaleX(0.6)", opacity: "0.4" },
          to: { transform: "scaleX(1)", opacity: "1" },
        },
        softPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
      },
      animation: {
        "fade-up": `fadeUp 0.45s ${ease}`,
        "msg-pop": `msgPop 0.28s ${ease}`,
        "toast-in": `toastIn 0.3s ${ease}`,
        "sheet-in": `sheetIn 0.35s ${ease}`,
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
        "tab-slide": `tabSlide 0.28s ${ease}`,
        "soft-pulse": "softPulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
