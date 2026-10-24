/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05080F',
          900: '#070B14',
          850: '#0A101C',
          800: '#0D1524',
          700: '#131D31',
          600: '#1B2740',
        },
        line: 'rgba(148,163,184,0.10)',
        accent: {
          DEFAULT: '#22D3EE',
          soft: '#67E8F9',
          deep: '#0E7490',
        },
        up: '#34D399',
        down: '#F87171',
        warn: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(34,211,238,0.18)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 30px rgba(0,0,0,0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(52,211,153,0.45)' },
          '50%': { opacity: 0.75, boxShadow: '0 0 0 5px rgba(52,211,153,0)' },
        },
        scanline: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        pulseDot: 'pulseDot 2.2s ease-in-out infinite',
        scanline: 'scanline 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
