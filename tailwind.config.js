/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Courier New'", "monospace", "ui-monospace"],
        crt: ["'VT323'", "'Courier New'", "monospace"],
      },
      colors: {
        tv: {
          chassis: "#a0a5aa",
          bezel: "#1c1e22",
          dark: "#0d0f12",
          osd: "#39ff14",
        }
      }
    },
  },
  plugins: [],
};
