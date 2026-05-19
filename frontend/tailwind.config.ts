import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── HackerRank-inspired light design system ──────────────
        hr: {
          bg:          "#F5F7FA",   // page background
          surface:     "#FFFFFF",   // card surface
          surface2:    "#F0F2F5",   // alternate surface (inputs, code areas)
          sidebar:     "#1A202C",   // dark sidebar
          "sidebar-h": "#252D3D",   // sidebar hover
          border:      "#E5E7EB",   // default border
          "border-s":  "#D1D5DB",   // strong border
          green:       "#2EC866",   // primary green (HackerRank)
          "green-d":   "#1EA34E",   // green hover
          "green-l":   "#D1FAE5",   // green light bg
          "green-t":   "#065F46",   // green text on light
          yellow:      "#F59E0B",   // warning
          "yellow-l":  "#FEF3C7",   // warning light
          red:         "#EF4444",   // error
          "red-l":     "#FEE2E2",   // error light
          purple:      "#6366F1",   // secondary accent
          "purple-l":  "#EEF2FF",   // purple light
          "purple-t":  "#4338CA",   // purple text on light
          text:        "#111827",   // primary text
          "text-s":    "#4B5563",   // secondary text
          "text-m":    "#9CA3AF",   // muted text
        },

        // Legacy brand tokens (Workspace keeps dark theme)
        brand: {
          purple: "#6c63ff",
          green:  "#2EC866",
          amber:  "#F59E0B",
        },
      },
      fontFamily: {
        sans:     ["Google Sans", "system-ui", "sans-serif"],
        headline: ["Google Sans Display", "Google Sans", "sans-serif"],
        body:     ["Google Sans", "sans-serif"],
        mono:     ["Geist Mono", "monospace"],
        code:     ["Geist Mono", "monospace"],
      },
      boxShadow: {
        card:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "card-lg": "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        sm:   "0.375rem",
        DEFAULT: "0.5rem",
        md:   "0.5rem",
        lg:   "0.75rem",
        xl:   "1rem",
        "2xl": "1.25rem",
        full: "9999px",
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "node-pulse": "nodePulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        nodePulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(46,200,102,0.35)" },
          "50%":      { boxShadow: "0 0 35px rgba(46,200,102,0.60)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
