import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4332",
          dark: "#1B4332",
          light: "#2D6A4F",
        },
        secondary: "#2D6A4F",
        accent: "#52B788",
        background: "#FFFFFF",
        surface: "#F9FAFB",
        border: "#F3F4F6",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
        error: "#EF4444",
        success: "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontWeight: {
        normal: "400",
        semibold: "600",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "logo-slide": "logoSlide 1.2s ease-in-out infinite",
        "shake": "shake 0.5s ease-in-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-2px)" },
        },
        logoSlide: {
          "0%": { transform: "translateX(-100%)" },
          "40%": { transform: "translateX(100%)" },
          "50%": { transform: "translateX(100%)" },
          "90%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
