/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        beige: {
          50:  '#FAF8F5',
          100: '#F2EDE6',
          200: '#E8DFD4',
          300: '#D4C5B0',
          400: '#B8A090',
          500: '#9A8070',
          600: '#7A6255',
          900: '#1C1917',
        },
        accent: '#C4A882',
        'accent-dark': '#8C6E52',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: [
    function scrollbarNone({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    },
  ],
}
