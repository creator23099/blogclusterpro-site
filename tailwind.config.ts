// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "bc-primary": "rgb(var(--bc-ring) / <alpha-value>)", 
        "bc-blue": "var(--bc-primary)",         // solid brand blue
        "bc-blue-hover": "var(--bc-primary-hover)",
      },
    },
  },
  plugins: [],
};

export default config;