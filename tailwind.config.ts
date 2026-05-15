import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          500: "#1b86d1",
          600: "#126db0",
          700: "#10598f"
        },
        ink: "#172033"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
