/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./style/*","./src/*"],
  theme: {
    extend: {
      colors: {
        primary: '#5a8f7b', // Replace '#yourColorValue' with your desired color value
        pastel: '#c4eddd',
      },
    },
  }
}

