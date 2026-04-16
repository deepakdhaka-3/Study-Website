/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        'study-blue': {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          950: '#082f49',
        },
        'study-purple': {
          500: '#a855f7',
          600: '#9333ea',
          950: '#3f0f5c',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(56, 189, 248, 0.22)',
        'glow-blue': '0 0 30px rgba(14, 165, 233, 0.15)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.15)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
