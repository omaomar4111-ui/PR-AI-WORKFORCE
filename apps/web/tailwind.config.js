/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#0d0e12",
        surface: "#14161f",
        surfaceBorder: "#222634",
        primary: {
          DEFAULT: "#8b5cf6",
          hover: "#7c3aed",
          light: "#a78bfa",
          dark: "#6d28d9"
        },
        textPrimary: "#ffffff",
        textSecondary: "#9ca3af",
        textMuted: "#6b7280"
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
