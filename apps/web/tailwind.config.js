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
        postty: {
          bg: '#0f1117',
          sidebar: '#161922',
          card: '#1e222d',
          border: '#2a2e3d',
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          accent: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
