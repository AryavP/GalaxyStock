/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0e27',
        'space-blue': '#1a1f3a',
        'cosmic-purple': '#6366f1',
        'stellar-cyan': '#22d3ee',
        'nebula-pink': '#ec4899',
      },
    },
  },
  plugins: [],
}
