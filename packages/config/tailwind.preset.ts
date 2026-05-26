import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        indigo: {
          950: '#111135',
          900: '#17154b',
          700: '#3730a3',
          500: '#635bff'
        },
        royal: 'rgb(var(--color-royal) / <alpha-value>)',
        cyan: 'rgb(var(--color-cyan) / <alpha-value>)',
        graphite: '#151923',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        'panel-muted': 'rgb(var(--color-panel-muted) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(39, 232, 166, .18)',
        soft: '0 18px 50px rgba(0, 0, 0, .18)',
        luxe: '0 28px 90px rgba(0, 0, 0, .32), inset 0 1px 0 rgba(255, 255, 255, .06)'
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Satoshi', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '8px',
        '2xl': '12px'
      }
    }
  }
} satisfies Config;
