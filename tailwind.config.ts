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
          deep: "#0a5555",
        },
        ok: {
          DEFAULT: "var(--ok)",
          soft: "var(--okL)",
        },
        danger: {
          DEFAULT: "var(--no)",
          soft: "var(--noL)",
          deep: "#a02e22",
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
        sans: ["var(--font-dm-sans)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "DM Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "var(--sh)",
        lift: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
        pop: "0 8px 30px rgba(0,0,0,0.12)",
        fab: "0 4px 16px rgba(13,110,110,0.3)",
        bubble: "0 2px 8px rgba(13,110,110,0.2)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        msgPop: {
          from: { opacity: "0", transform: "scale(0.95) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        toastSlide: {
          from: { opacity: "0", transform: "translateX(30px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        stepIn: {
          from: { opacity: "0", transform: "translateX(-6px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "msg-pop": "msgPop 0.2s ease",
        "toast-in": "toastSlide 0.25s ease",
        spin: "spin 1s linear infinite",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
        "step-in": "stepIn 0.25s ease",
      },
    },
  },
  plugins: [],
};
export default config;
