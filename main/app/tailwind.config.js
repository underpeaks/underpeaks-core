module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",        // 👈 required for Next.js App Router
    "./components/**/*.{js,ts,jsx,tsx}",
    "./nxf-ui/**/*.{js,ts,jsx,tsx}",     // 👈 if you're importing from this custom package
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
