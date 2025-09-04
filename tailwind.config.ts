import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        petro: {
          red: "#A3272A",
          redDark: "#8C1F22",
          redLight: "#D45659",
          ink: "#111111",
          charcoal: "#2B2B2B",
          paper: "#FFFFFF",
          off: "#F7F7F7",
          line: "#D9D9D9",
        },
      },
    },
  },
  plugins: [],
}

export default config