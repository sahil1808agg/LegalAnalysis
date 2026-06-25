import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: {
          DEFAULT: '#112E81',
          hover: '#0E276E',
        },
        secondary: {
          DEFAULT: '#4647AE',
          hover: '#3B3C96',
        },
        accent: {
          DEFAULT: '#AACCD6',
          light: '#D8E8ED',
        },
        // Light theme surfaces
        background: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',
        },
        surface: {
          DEFAULT: '#F1F5F9',
          elevated: '#FFFFFF',
        },
        // Borders
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        // Text
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
        // Semantic
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
        info: '#0284C7',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
        '3xl': '48px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
    },
  },
  plugins: [],
}

export default config
