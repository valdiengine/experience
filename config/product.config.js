/**
 * Product Configuration — Dronestica
 *
 * Product-specific tenant configuration.
 * This file contains all Dronestica-specific hardcoded values
 * that were previously embedded in engine/core/bootstrap.js.
 *
 * @IMPORTANT: This is the ONLY file that should contain
 * product-specific (tenant) hardcoded values.
 */

import { PLATFORM_CONFIG } from './platform.config.js'

export const PRODUCT_CONFIG = {
  id: 'dronestica',
  name: 'Dronestica',
  slug: 'dronestica',
  domain: 'dronestica.com',

  branding: {
    colors: {
      primary: '#c8a55c',
      secondary: '#1a1a2e',
    },
  },

  provider: {
    type: 'json',
    config: {},
  },

  capabilities: ['gallery', 'booking', 'notifications', 'pwa'],

  routes: {
    home: '/',
    services: '/servicios',
    portfolio: '/portfolio',
    about: '/nosotros',
    contact: '/contacto',
    booking: '/agendar',
  },

  contact: {
    email: 'hola@dronestica.com',
    bookingUrl: 'https://dronestica.com/agendar',
  },

  social: {
    instagram: 'https://instagram.com/dronestica',
    vimeo: 'https://vimeo.com/dronestica',
    youtube: 'https://youtube.com/@dronestica',
    linkedin: 'https://linkedin.com/company/dronestica',
    tiktok: 'https://tiktok.com/@dronestica',
    twitter: 'https://x.com/dronestica',
  },
}

export const THEME_STORAGE_KEY = `${PLATFORM_CONFIG.id}-theme`

export default PRODUCT_CONFIG
