/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'one': '#00296f',
        'wizpay-red': '#C62A2B',
        'wizpay-gray': '#F2F2F2',
      }
    },
  },
  plugins: [],
};
