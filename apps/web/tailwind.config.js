/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors
        'felt': '#1a472a',
        'felt-light': '#2d5a3f',
        'felt-dark': '#0f2d1a',
      },
    },
  },
  plugins: [],
};
