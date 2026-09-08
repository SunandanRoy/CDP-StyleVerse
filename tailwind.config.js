/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand-accent)',
          soft: 'var(--brand-accent-soft)',
          text: 'var(--brand-accent-text)'
        },
        surface: 'var(--surface)',
        surfacealt: 'var(--surface-alt)',
        ink: 'var(--ink)',
        inkmute: 'var(--ink-mute)',
        edge: 'var(--edge)'
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)'
      },
      letterSpacing: {
        brandwide: 'var(--tracking-heading)'
      }
    }
  },
  plugins: []
}
