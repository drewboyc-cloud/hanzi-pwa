/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a2e',
        paper: '#f5f0e8',
        cinnabar: '#e63946',
        gold: '#f4a261',
      },
      fontFamily: {
        hanzi: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
