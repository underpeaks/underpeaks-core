module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",        // Next.js App Router
    "./components/**/*.{js,ts,jsx,tsx}",  // existing shadcn-ui components
    "./components_cus/**/*.{js,ts,jsx,tsx}", // your renamed custom components folder
    "./nxf-ui/**/*.{js,ts,jsx,tsx}",     // your custom package
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
