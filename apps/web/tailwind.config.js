/** @type {import('tailwindcss').Config} */
// Phase 7-1: Tailwind v3 + neo/dark token bridge.
// 모든 brand-* color/shadow/radius utility 는 globals.css :root 의 CSS variable 을 참조.
// preflight: false — 기존 globals.css reset 충돌 방지.
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          // ── Backgrounds ──
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-card': 'var(--bg-card)',
          'bg-glass': 'var(--bg-glass)',
          'bg-glass-hover': 'var(--bg-glass-hover)',
          // ── Borders ──
          'border-glass': 'var(--border-glass)',
          'border-active': 'var(--border-active)',
          // ── Text ──
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          // ── Accents ──
          'accent-indigo': 'var(--accent-indigo)',
          'accent-blue': 'var(--accent-blue)',
          'accent-cyan': 'var(--accent-cyan)',
          'accent-emerald': 'var(--accent-emerald)',
          'accent-amber': 'var(--accent-amber)',
          'accent-amber-text': 'var(--accent-amber-text)',
          'accent-rose': 'var(--accent-rose)',
          'accent-violet': 'var(--accent-violet)',
          // ── Gradients (solid color refs) ──
          'gradient-primary': 'var(--gradient-primary)',
          'gradient-success': 'var(--gradient-success)',
          'gradient-warning': 'var(--gradient-warning)',
          'gradient-info': 'var(--gradient-info)',
        },
      },
      boxShadow: {
        'brand-sm': 'var(--shadow-sm)',
        'brand-md': 'var(--shadow-md)',
        'brand-lg': 'var(--shadow-lg)',
        'brand-glow': 'var(--shadow-glow)',
      },
      borderRadius: {
        'brand-sm': 'var(--radius-sm)',
        'brand-md': 'var(--radius-md)',
        'brand-lg': 'var(--radius-lg)',
        'brand-xl': 'var(--radius-xl)',
        'brand-full': 'var(--radius-full)',
      },
      fontSize: {
        'brand-amount-huge': 'var(--text-amount-huge)',
        'brand-amount-large': 'var(--text-amount-large)',
        'brand-title-large': 'var(--text-title-large)',
        'brand-body-large': 'var(--text-body-large)',
        'brand-body-normal': 'var(--text-body-normal)',
        'brand-label-small': 'var(--text-label-small)',
      },
      transitionProperty: {
        brand: 'all',
      },
    },
  },
  plugins: [],
};
