/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0D11",
        panel: {
          DEFAULT: "#12151C",
          subtle: "#0B0D11",
          hover: "#191D26",
          active: "#202531",
        },
        border: {
          DEFAULT: "#242936",
          subtle: "#1B1E28",
          strong: "#323849",
        },
        brand: {
          50: "#EDFDF7",
          100: "#D4F9EC",
          200: "#ACF3D9",
          300: "#75E9BF",
          400: "#3BD8A0",
          500: "#13BD82",
          600: "#099867",
          700: "#0A7954",
          800: "#0C5F43",
          900: "#0C4F39",
          950: "#042C20",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}
