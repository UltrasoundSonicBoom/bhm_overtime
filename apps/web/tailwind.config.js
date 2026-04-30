/** @type {import('tailwindcss').Config} */
// Phase 7-1: Tailwind v3 + neo/dark token bridge (legacy `brand-*` utilities).
// design-system Slice 2: ds.* color/spacing/fontSize/ring tokens added (primitive→semantic).
// Two namespaces coexist: `ds.*` for new tokens, `brand.*` for Phase 7 backward compat.
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // ── Design System (semantic) — 신규 ──
        ds: {
          'text-primary':   'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted':     'var(--color-text-muted)',
          'text-inverse':   'var(--color-text-inverse)',
          'text-link':      'var(--color-text-link)',
          'bg-page':        'var(--color-bg-page)',
          'bg-surface':     'var(--color-bg-surface)',
          'bg-elevated':    'var(--color-bg-elevated)',
          'bg-muted':       'var(--color-bg-muted)',
          'bg-hover':       'var(--color-bg-hover)',
          'border-default': 'var(--color-border-default)',
          'border-strong':  'var(--color-border-strong)',
          'border-focus':   'var(--color-border-focus)',
          'brand-primary':       'var(--color-brand-primary)',
          'brand-primary-hover': 'var(--color-brand-primary-hover)',
          'brand-secondary':     'var(--color-brand-secondary)',
          'status-success':    'var(--color-status-success)',
          'status-warning':    'var(--color-status-warning)',
          'status-error':      'var(--color-status-error)',
          'status-info':       'var(--color-status-info)',
          'status-success-bg': 'var(--color-status-success-bg)',
          'status-warning-bg': 'var(--color-status-warning-bg)',
          'status-error-bg':   'var(--color-status-error-bg)',
          'status-info-bg':    'var(--color-status-info-bg)',
          'duty-day':         'var(--color-duty-day)',
          'duty-day-bg':      'var(--color-duty-day-bg)',
          'duty-evening':     'var(--color-duty-evening)',
          'duty-evening-bg':  'var(--color-duty-evening-bg)',
          'duty-night':       'var(--color-duty-night)',
          'duty-night-bg':    'var(--color-duty-night-bg)',
          'duty-off':         'var(--color-duty-off)',
          'duty-off-bg':      'var(--color-duty-off-bg)',
          'duty-leave':       'var(--color-duty-leave)',
          'duty-leave-bg':    'var(--color-duty-leave-bg)',
          'duty-recovery':    'var(--color-duty-recovery)',
          'duty-recovery-bg': 'var(--color-duty-recovery-bg)',
          'duty-holiday':     'var(--color-duty-holiday)',
          'duty-holiday-bg':  'var(--color-duty-holiday-bg)',
        },
        // ── Legacy brand-* (Phase 7) — 호환 유지 ──
        brand: {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-card': 'var(--bg-card)',
          'bg-glass': 'var(--bg-glass)',
          'bg-glass-hover': 'var(--bg-glass-hover)',
          'border-glass': 'var(--border-glass)',
          'border-active': 'var(--border-active)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          'accent-indigo': 'var(--accent-indigo)',
          'accent-blue': 'var(--accent-blue)',
          'accent-cyan': 'var(--accent-cyan)',
          'accent-emerald': 'var(--accent-emerald)',
          'accent-amber': 'var(--accent-amber)',
          'accent-amber-text': 'var(--accent-amber-text)',
          'accent-rose': 'var(--accent-rose)',
          'accent-violet': 'var(--accent-violet)',
          'gradient-primary': 'var(--gradient-primary)',
          'gradient-success': 'var(--gradient-success)',
          'gradient-warning': 'var(--gradient-warning)',
          'gradient-info': 'var(--gradient-info)',
        },
      },
      // Design System spacing — 4px grid via CSS vars (px units intentional).
      // These keys override Tailwind defaults at numeric positions (1, 2, ..., 20). Project-wide
      // px convention (matches existing globals.css, supports browser page-zoom which scales px).
      // For accessibility text-size zoom, users should rely on browser default page-zoom rather
      // than font-size override. Tailwind defaults at non-extended keys (1.5, 2.5, 7, 9, etc.)
      // remain rem-based — avoid mixing those with our px-based ds spacing.
      spacing: {
        '0':  'var(--space-0)',
        '1':  'var(--space-1)',
        '2':  'var(--space-2)',
        '3':  'var(--space-3)',
        '4':  'var(--space-4)',
        '5':  'var(--space-5)',
        '6':  'var(--space-6)',
        '8':  'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
      },
      fontSize: {
        'ds-display': ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)', fontWeight: 'var(--font-weight-bold)' }],
        'ds-h1':      ['var(--font-size-h1)',      { lineHeight: 'var(--line-height-tight)', fontWeight: 'var(--font-weight-bold)' }],
        'ds-h2':      ['var(--font-size-h2)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-bold)' }],
        'ds-h3':      ['var(--font-size-h3)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-semibold)' }],
        'ds-h4':      ['var(--font-size-h4)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-semibold)' }],
        'ds-body-lg': ['var(--font-size-body-lg)', { lineHeight: 'var(--line-height-relaxed)' }],
        'ds-body-md': ['var(--font-size-body-md)', { lineHeight: 'var(--line-height-normal)' }],
        'ds-body-sm': ['var(--font-size-body-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'ds-label':   ['var(--font-size-label)',   { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-medium)' }],
        'ds-caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-snug)' }],
        // Legacy fontSize keys — bare strings (no lineHeight). Backward-compat with Phase 7;
        // new code should use ds-* keys which include lineHeight + fontWeight.
        'brand-amount-huge': 'var(--text-amount-huge)',
        'brand-amount-large': 'var(--text-amount-large)',
        'brand-title-large': 'var(--text-title-large)',
        'brand-body-large': 'var(--text-body-large)',
        'brand-body-normal': 'var(--text-body-normal)',
        'brand-label-small': 'var(--text-label-small)',
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
      ringColor: {
        'ds-focus': 'var(--focus-ring-color)',
      },
      ringWidth: {
        'ds': 'var(--focus-ring-width)',
      },
      ringOffsetWidth: {
        'ds': 'var(--focus-ring-offset)',
      },
      transitionProperty: {
        brand: 'all',
      },
    },
  },
  plugins: [],
};
