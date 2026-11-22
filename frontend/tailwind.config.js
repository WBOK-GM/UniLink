/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          hover: '#283548'
        },
        campus: {
          950: '#070b1e',
          900: '#0b1028',
          850: '#0f1638',
          800: '#141d47',
          700: '#1e2b68',
        },
        uptc: {
          950: '#070b1e',
          900: '#0b1028',
          850: '#0f1638',
          800: '#141d47',
          700: '#1e2b68',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      }
    },
  },
  plugins: [],
}
