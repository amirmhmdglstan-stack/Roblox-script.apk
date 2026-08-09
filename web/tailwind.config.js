/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Reconstructed from the original project's own CSS values
        dark: {
          600: '#152442',
          700: '#0F1A2E',
          800: '#0A1222',
          900: '#060B14',
          950: '#030812',
        },
        electric: {
          300: '#66F0FF',
          400: '#33EAFF',
          500: '#00E5FF',
          600: '#00B8CC',
        },
      },
      fontFamily: {
        persian: ['Vazirmatn', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(0, 229, 255, 0.25)',
        glow: '0 0 20px rgba(0, 229, 255, 0.35)',
        'glow-lg': '0 0 35px rgba(0, 229, 255, 0.5)',
      },
      keyframes: {
        fade: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fade: 'fade 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
