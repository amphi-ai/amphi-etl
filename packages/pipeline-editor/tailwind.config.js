/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./style/*","./src/*", "../pipeline-components-manager/src/*", "../pipeline-components-core/src/*"],
  theme: {
    extend: {
      colors: {
        primary: '#5A8F7B'
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
  plugins: [
    require('@tailwindcss/forms'),
    // ...
  ],
  important: true
}

