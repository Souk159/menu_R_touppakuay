import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Phetsarath OT', 'Phetsarath', 'sans-serif'],
        serif: ['Phetsarath OT', 'Phetsarath', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
