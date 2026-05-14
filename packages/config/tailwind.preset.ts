import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        indigo: {
          950: '#111135',
          900: '#17154b',
          700: '#3730a3',
          500: '#635bff'
        },
        royal: '#246bfe',
        cyan: '#28d7ef',
        graphite: '#151923',
        line: '#e6e9f1',
        muted: '#667085',
        surface: '#f7f8fb'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(36, 107, 254, .22)',
        soft: '0 18px 50px rgba(15, 23, 42, .08)'
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
