import type { Config } from "tailwindcss";

const config: Config = {
  // Tell Tailwind which files to scan for class names
  // It removes unused styles from the final CSS bundle
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
