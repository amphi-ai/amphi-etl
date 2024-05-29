/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./style/*","./src/*"],
  theme: {
    extend: {
      colors: {
        primary: '#5A8F7B', // Replace '#yourColorValue' with your desired color value
        pastel: '#c4eddd',
      },
    },
  }
}

