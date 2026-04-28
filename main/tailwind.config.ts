import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"

const config: Config = {
  content: [
    "app/**/*.{js,ts,jsx,tsx}",
    "components/**/*.{js,ts,jsx,tsx}",
    "components_cus/**/*.{js,ts,jsx,tsx}",
    "nxf-ui/**/*.{js,ts,jsx,tsx}",
    "lib/**/*.{js,ts,jsx,tsx}",
    "hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
     animate
  ],
}

export default config