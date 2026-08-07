/**
 * Platform Seed — Themes
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial theme configurations for destinations.
 * These are template themes that can be assigned to destinations.
 */

export const THEMES_SEED = [
  {
    slug: 'valdivia-default',
    name: 'Valdivia Default',
    type: 'light',
    colors: {
      primary: '#2E7D32',
      secondary: '#558B2F',
      accent: '#FF8F00',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      error: '#D32F2F',
      success: '#388E3C',
      warning: '#F57C00',
      info: '#1976D2',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      headingFont: 'system-ui, -apple-system, sans-serif',
      bodyFont: 'system-ui, -apple-system, sans-serif',
      sizes: {
        h1: '2.5rem',
        h2: '2rem',
        h3: '1.5rem',
        body: '1rem',
      },
    },
    isDefault: true,
  },
  {
    slug: 'patagonia-default',
    name: 'Patagonia Default',
    type: 'light',
    colors: {
      primary: '#1565C0',
      secondary: '#0277BD',
      accent: '#FF6F00',
      background: '#F5F5F5',
      surface: '#FFFFFF',
      error: '#C62828',
      success: '#2E7D32',
      warning: '#EF6C00',
      info: '#0277BD',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      headingFont: 'system-ui, -apple-system, sans-serif',
      bodyFont: 'system-ui, -apple-system, sans-serif',
      sizes: {
        h1: '2.5rem',
        h2: '2rem',
        h3: '1.5rem',
        body: '1rem',
      },
    },
    isDefault: false,
  },
  {
    slug: 'chiloe-default',
    name: 'Chiloé Default',
    type: 'light',
    colors: {
      primary: '#6A1B9A',
      secondary: '#8E24AA',
      accent: '#FFD600',
      background: '#FFF8E1',
      surface: '#FFFFFF',
      error: '#B71C1C',
      success: '#1B5E20',
      warning: '#FF8F00',
      info: '#4527A0',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      headingFont: 'system-ui, -apple-system, sans-serif',
      bodyFont: 'system-ui, -apple-system, sans-serif',
      sizes: {
        h1: '2.5rem',
        h2: '2rem',
        h3: '1.5rem',
        body: '1rem',
      },
    },
    isDefault: false,
  },
]

export default THEMES_SEED
