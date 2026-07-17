import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50:  '#E7EFFC',
          100: '#B6CFF5',
          200: '#92B7F0',
          300: '#6196EA',
          400: '#89B7FF',
          500: '#115ACB',
          600: '#0044AE',
          700: '#0D469E',
          800: '#0A367B',
          900: '#082A5E',
        },
        grey: {
          25:  '#FAFAFA',
          50:  '#F0F0F1',
          100: '#DADADB',
          200: '#C1C2C3',
          300: '#8F9193',
          400: '#5E6062',
          500: '#4A4C4F',
          600: '#2C2F32',
          700: '#25272B',
          800: '#151719',
          900: '#070A0E',
        },
        green: {
          50:  '#E7F6E7',
          500: '#13A10E',
          700: '#0D720A',
        },
        red: {
          50:  '#FAEBEB',
          500: '#D13438',
          700: '#942528',
        },
        yellow: {
          50:  '#FFF9F0',
          500: '#FFAA33',
          800: '#B36800',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
