/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: 'var(--ink)',
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        muted: 'var(--muted)',
        subtle: 'var(--subtle)',
        accent: 'var(--accent)',
        brand: 'var(--brand)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04)',
        elevated: '0 12px 32px -12px rgba(17, 24, 39, 0.16), 0 2px 6px rgba(17, 24, 39, 0.04)',
        drawer: '-20px 0 60px -20px rgba(17, 24, 39, 0.18)',
      },
      borderRadius: {
        xl2: '1.125rem',
      },
      gridTemplateColumns: {
        14: 'repeat(14, minmax(0, 1fr))',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
