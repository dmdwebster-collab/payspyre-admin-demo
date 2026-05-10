import type { Config } from "tailwindcss";

// Palette ported from legacy/v1-static-demo/style.css :root vars.
// Keep names semantic so they survive future visual tweaks.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#06101d",
          800: "#0a1628",
          700: "#0f1e33",
          600: "#152940",
          500: "#1d3350",
        },
        gold: {
          DEFAULT: "#c8a951",
          bright: "#e4c673",
          dim: "#8f7a3a",
        },
        line: {
          DEFAULT: "#1f3555",
          soft: "#182b46",
        },
        ink: {
          DEFAULT: "#e8eef7",
          dim: "#9fb0c7",
          mute: "#6e819c",
        },
        ok: {
          DEFAULT: "#4ade80",
          dark: "#1e5e3a",
        },
        info: {
          DEFAULT: "#60a5fa",
          dark: "#1e3a5f",
        },
        warn: {
          DEFAULT: "#fb923c",
          dark: "#733a18",
        },
        danger: {
          DEFAULT: "#f87171",
          dark: "#5b1f1f",
        },
        accent: {
          DEFAULT: "#a78bfa",
          dark: "#3d2a66",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "JetBrains Mono",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
