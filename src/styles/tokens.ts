/**
 * Jyotsvan Enterprise Design Tokens
 * Single source of truth for design variables, colors, typography scales,
 * spacing, and elevation across the application shell and modules.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Canvas & Surfaces
    background: '#F8FAFC', // slate-50
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9', // slate-100
    surfaceMuted: '#F8FAFC', // slate-50

    // Typography
    foreground: '#0F172A', // slate-900 (>10:1 AAA contrast)
    foregroundMuted: '#475569', // slate-600
    foregroundSubtle: '#94A3B8', // slate-400
    foregroundInverse: '#FFFFFF',

    // Primary Brand
    primary: '#0F172A', // Deep Charcoal / Slate 900
    primaryHover: '#1E293B', // Slate 800
    primaryForeground: '#FFFFFF',

    // Borders & Dividers
    border: '#E2E8F0', // slate-200
    borderMuted: '#F1F5F9', // slate-100
    borderFocus: '#0F172A', // slate-900

    // Sidebar & Shell Dark Palette
    sidebarBg: '#0F172A', // slate-900
    sidebarBorder: '#1E293B', // slate-800
    sidebarHover: '#1E293B', // slate-800
    sidebarActive: '#1E293B', // slate-800
    sidebarText: '#CBD5E1', // slate-300
    sidebarTextActive: '#FFFFFF',
    sidebarTextMuted: '#64748B', // slate-500

    // Semantic Status Tokens
    success: '#059669', // emerald-600
    successBg: '#ECFDF5', // emerald-50
    successBorder: '#A7F3D0', // emerald-200

    warning: '#D97706', // amber-600
    warningBg: '#FFFBEB', // amber-50
    warningBorder: '#FDE68A', // amber-200

    error: '#DC2626', // red-600
    errorBg: '#FEF2F2', // red-50
    errorBorder: '#FECACA', // red-200

    info: '#0284C7', // sky-600
    infoBg: '#F0F9FF', // sky-50
    infoBorder: '#BAE6FD', // sky-200
  },

  radii: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    full: '9999px',
  },

  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    scales: {
      pageTitle: 'text-xl sm:text-2xl font-semibold tracking-tight',
      sectionTitle: 'text-sm sm:text-base font-semibold text-slate-900',
      bodyPrimary: 'text-sm text-slate-700 leading-normal',
      bodySmall: 'text-xs text-slate-500 leading-relaxed',
      micro: 'text-[11px] font-medium uppercase tracking-wider',
    },
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    sidebar: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  layout: {
    headerHeight: '3.5rem', // 56px / h-14
    sidebarWidthExpanded: '16rem', // 256px / w-64
    sidebarWidthCollapsed: '4rem', // 64px / w-16
    maxContainerWidth: '80rem', // 1280px / max-w-7xl
  },
} as const;
