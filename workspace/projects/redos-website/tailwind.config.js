// Tailwind v4 uses CSS-first config via @theme in globals.css
// This file is kept for any PostCSS plugin compatibility
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
};
