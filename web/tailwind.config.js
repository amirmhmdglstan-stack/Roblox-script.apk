/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep futuristic dark-blue surface palette
        dark: {
          600: '#1D3054',
          700: '#152442',
          800: '#0F1A2E',
          900: '#0A1222',
          950: '#060B14',
        },
        // Glowing electric cyan accent palette
        electric: {
          300: '#7DF3FF',
          400: '#3CE7FF',
          500: '#00E5FF',
          600: '#00B8DB',
        },
      },
      fontFamily: {
        persian: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(0, 229, 255, 0.25)',
        glow: '0 0 25px rgba(0, 229, 255, 0.35)',
        'glow-lg': '0 0 40px rgba(0, 229, 255, 0.45)',
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.06) 45%, transparent 70%)',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
