/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F7A693",    // Peach
        secondary: "#4EBA6F",  // Green
        accent: "#1BB0CE",     // Blue
        background: "#FAF8F5", // Ivory Luxe
        dark: "#1A1A1A",       // Charcoal
      },
      fontFamily: {
        sans: ["Work Sans", "sans-serif"],
        heading: ["Roboto", "sans-serif"],
        drama: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
}
