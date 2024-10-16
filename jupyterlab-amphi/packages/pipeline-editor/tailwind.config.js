/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./style/*","./src/*", "../pipeline-components-manager/src/*", "../pipeline-components-core/src/*"],
  theme: {
    extend: {
      colors: {
        primary: '#5a8f7b'
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  important: true
}

