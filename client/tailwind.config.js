/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sidebar: { DEFAULT: 'rgb(24 24 27)', border: 'rgb(39 39 42)' },
        surface: { DEFAULT: 'rgb(39 39 42)', hover: 'rgb(63 63 70)' },
      },
    },
  },
  plugins: [],
};
