/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bangla: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // রঙগুলো CSS ভ্যারিয়েবল থেকে আসে (lib/theme.js, app/layout.js) —
        // তাই .env এ NEXT_PUBLIC_THEME_COLOR বদলালেই পুরো অ্যাপের রঙ বদলে যায়
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
          dark: 'rgb(var(--c-primary-dark) / <alpha-value>)',
        },
        background: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          card: '#FFFFFF',
          sidebar: 'rgb(var(--c-bg-sidebar) / <alpha-value>)',
        },
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: 'rgb(var(--c-border) / <alpha-value>)',
        },
        dark: {
          background: 'rgb(var(--c-dark-bg) / <alpha-value>)',
          card: 'rgb(var(--c-dark-card) / <alpha-value>)',
          sidebar: 'rgb(var(--c-dark-sidebar) / <alpha-value>)',
          text: {
            primary: '#F3F4F6',
            secondary: '#A1AAA6',
          },
          border: 'rgb(var(--c-dark-border) / <alpha-value>)',
        },
        danger: '#DC2626',
        warning: '#D97706',
        success: '#16A34A',
      },
      keyframes: {
        'logo-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bar-load': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'logo-in': 'logo-in 0.6s ease-out forwards',
        'bar-load': 'bar-load 2.6s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};
