/**
 * Design Tokens
 *
 * Configuration-driven design token system.
 * Generates CSS custom properties from theme/branding configuration.
 * Framework-free SSR implementation.
 */

export const DEFAULT_TOKENS = {
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#e8d5a3',
    background: '#ffffff',
    surface: '#f9f9f9',
    text: '#333333',
    textMuted: '#666666',
    border: '#eeeeee',
    error: '#dc3545',
    success: '#28a745'
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyDisplay: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSizeBase: '16px',
    fontSizeScale: '1.25',
    lineHeight: '1.6',
    lineHeightTight: '1.3',
    lineHeightLoose: '1.8'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
    section: '3rem'
  },
  layout: {
    maxWidth: '1200px',
    maxWidthNarrow: '800px',
    maxWidthWide: '1400px',
    contentPadding: '1rem'
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)'
  },
  breakpoints: {
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1440px'
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease'
  },
  zIndex: {
    base: '0',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    tooltip: '400'
  }
}

export class DesignTokens {
  constructor(tokens = {}) {
    this.tokens = { ...DEFAULT_TOKENS, ...tokens }
  }

  generateCssVariables(branding = {}) {
    const vars = []
    const colors = this.resolveColors(branding)

    // Colors
    for (const [name, value] of Object.entries(colors)) {
      vars.push(`--color-${name}: ${value};`)
    }

    // Typography
    for (const [name, value] of Object.entries(this.tokens.typography)) {
      const cssName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
      vars.push(`--font-${cssName}: ${value};`)
    }

    // Spacing
    for (const [name, value] of Object.entries(this.tokens.spacing)) {
      vars.push(`--spacing-${name}: ${value};`)
    }

    // Layout
    for (const [name, value] of Object.entries(this.tokens.layout)) {
      const cssName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
      vars.push(`--layout-${cssName}: ${value};`)
    }

    // Radius
    for (const [name, value] of Object.entries(this.tokens.radius)) {
      vars.push(`--radius-${name}: ${value};`)
    }

    // Shadows
    for (const [name, value] of Object.entries(this.tokens.shadows)) {
      vars.push(`--shadow-${name}: ${value};`)
    }

    // Transitions
    for (const [name, value] of Object.entries(this.tokens.transitions)) {
      vars.push(`--transition-${name}: ${value};`)
    }

    // Z-index
    for (const [name, value] of Object.entries(this.tokens.zIndex)) {
      vars.push(`--zindex-${name}: ${value};`)
    }

    return vars.join('\n    ')
  }

  resolveColors(branding = {}) {
    const defaultColors = this.tokens.colors

    if (!branding.colors) {
      return defaultColors
    }

    return {
      primary: branding.colors.primary || defaultColors.primary,
      secondary: branding.colors.secondary || defaultColors.secondary,
      accent: branding.colors.accent || defaultColors.accent,
      background: branding.colors.background || defaultColors.background,
      surface: branding.colors.surface || defaultColors.surface,
      text: branding.colors.text || defaultColors.text,
      textMuted: branding.colors.textMuted || defaultColors.textMuted,
      border: branding.colors.border || defaultColors.border,
      error: branding.colors.error || defaultColors.error,
      success: branding.colors.success || defaultColors.success
    }
  }

  generateBaseStyles(branding = {}) {
    return `
      :root {
        ${this.generateCssVariables(branding)}
        --breakpoint-sm: ${this.tokens.breakpoints.sm};
        --breakpoint-md: ${this.tokens.breakpoints.md};
        --breakpoint-lg: ${this.tokens.breakpoints.lg};
        --breakpoint-xl: ${this.tokens.breakpoints.xl};
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      html {
        font-size: ${this.tokens.typography.fontSizeBase};
        line-height: ${this.tokens.typography.lineHeight};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: var(--font-family);
        color: var(--color-text);
        background-color: var(--color-background);
      }

      img {
        max-width: 100%;
        height: auto;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      ul, ol {
        list-style: none;
      }

      button {
        cursor: pointer;
        border: none;
        background: none;
        font: inherit;
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 0;
        line-height: var(--font-line-height-tight, 1.3);
      }

      p {
        margin: 0;
      }

      address {
        font-style: normal;
      }
    `
  }

  generateResponsiveStyles() {
    return `
      /* Mobile First Responsive Styles */

      /* Small devices (landscape phones, 576px and up) */
      @media (min-width: 576px) {
        :root {
          --content-padding: 1.5rem;
        }
      }

      /* Medium devices (tablets, 768px and up) */
      @media (min-width: 768px) {
        :root {
          --content-padding: 2rem;
        }
      }

      /* Large devices (desktops, 992px and up) */
      @media (min-width: 992px) {
        :root {
          --content-padding: 2.5rem;
        }
      }

      /* Extra large devices (large desktops, 1200px and up) */
      @media (min-width: 1200px) {
        :root {
          --content-padding: 3rem;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `
  }

  generateUtilityClasses() {
    return `
      /* Layout Utilities */
      .container {
        width: 100%;
        max-width: var(--layout-max-width);
        margin: 0 auto;
        padding: 0 var(--layout-content-padding);
      }

      .container-narrow {
        max-width: var(--layout-max-width-narrow);
      }

      .container-wide {
        max-width: var(--layout-max-width-wide);
      }

      /* Flex Utilities */
      .flex {
        display: flex;
      }

      .flex-col {
        flex-direction: column;
      }

      .flex-wrap {
        flex-wrap: wrap;
      }

      .items-center {
        align-items: center;
      }

      .items-start {
        align-items: flex-start;
      }

      .items-end {
        align-items: flex-end;
      }

      .justify-center {
        justify-content: center;
      }

      .justify-between {
        justify-content: space-between;
      }

      .justify-end {
        justify-content: flex-end;
      }

      .gap-xs { gap: var(--spacing-xs); }
      .gap-sm { gap: var(--spacing-sm); }
      .gap-md { gap: var(--spacing-md); }
      .gap-lg { gap: var(--spacing-lg); }
      .gap-xl { gap: var(--spacing-xl); }

      /* Grid Utilities */
      .grid {
        display: grid;
        gap: var(--spacing-lg);
      }

      .grid-cols-1 { grid-template-columns: repeat(1, 1fr); }

      @media (min-width: 768px) {
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        .md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
      }

      @media (min-width: 992px) {
        .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
        .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
      }

      /* Spacing Utilities */
      .mt-xs { margin-top: var(--spacing-xs); }
      .mt-sm { margin-top: var(--spacing-sm); }
      .mt-md { margin-top: var(--spacing-md); }
      .mt-lg { margin-top: var(--spacing-lg); }
      .mt-xl { margin-top: var(--spacing-xl); }

      .mb-xs { margin-bottom: var(--spacing-xs); }
      .mb-sm { margin-bottom: var(--spacing-sm); }
      .mb-md { margin-bottom: var(--spacing-md); }
      .mb-lg { margin-bottom: var(--spacing-lg); }
      .mb-xl { margin-bottom: var(--spacing-xl); }

      .p-xs { padding: var(--spacing-xs); }
      .p-sm { padding: var(--spacing-sm); }
      .p-md { padding: var(--spacing-md); }
      .p-lg { padding: var(--spacing-lg); }
      .p-xl { padding: var(--spacing-xl); }

      /* Text Utilities */
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }

      .text-sm { font-size: 0.875rem; }
      .text-base { font-size: 1rem; }
      .text-lg { font-size: 1.125rem; }
      .text-xl { font-size: 1.25rem; }
      .text-2xl { font-size: 1.5rem; }
      .text-3xl { font-size: 1.875rem; }
      .text-4xl { font-size: 2.25rem; }

      .font-normal { font-weight: 400; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }

      .text-muted { color: var(--color-text-muted); }
      .text-primary { color: var(--color-primary); }
      .text-secondary { color: var(--color-secondary); }

      /* Visibility */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .hidden {
        display: none;
      }

      @media (min-width: 768px) {
        .md\\:hidden { display: none; }
        .md\\:block { display: block; }
        .md\\:flex { display: flex; }
      }

      @media (min-width: 992px) {
        .lg\\:hidden { display: none; }
        .lg\\:block { display: block; }
        .lg\\:flex { display: flex; }
      }
    `
  }
}

export function createDesignTokens(tokens) {
  return new DesignTokens(tokens)
}

export default DesignTokens
