/**
 * Experience Composer
 * 
 * Composes the final experience from resolved context.
 * Builds theme, branding, navigation, SEO, and i18n.
 */

import { ExperienceCompositionError } from '../experience.errors.js'

export class ExperienceComposer {
  #config = null

  constructor(config = {}) {
    this.#config = { ...config }
  }

  get name() {
    return 'composition'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    return true
  }

  async compose(context) {
    if (!context || !context.config) {
      throw new ExperienceCompositionError('Invalid context', { context })
    }

    try {
      const platform = context.platform || 'valdi'
      const resolved = {
        ...context,
        platform,
        theme: this.#composeTheme(context),
        branding: this.#composeBranding(context),
        navigation: this.#composeNavigation(context),
        seo: this.#composeSEO(context),
        i18n: this.#composeI18n(context),
        maps: this.#composeMaps(context),
        analytics: this.#composeAnalytics(context),
        providers: this.#composeProviders(context)
      }

      return resolved
    } catch (error) {
      throw new ExperienceCompositionError(`Composition failed: ${error.message}`, {
        error: error.message,
        context
      })
    }
  }

  #composeTheme(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}
    
    const defaultTheme = {
      mode: 'dark',
      borderRadius: '8px',
      spacing: '8px'
    }

    const theme = {
      ...defaultTheme,
      ...(config.theme || {}),
      ...(destination.theme || {})
    }

    return theme
  }

  #composeBranding(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}
    const company = context.company || config.company || {}

    const defaultBranding = {
      logo: '/assets/branding/default-logo.svg',
      favicon: '/assets/branding/favicon.ico',
      colors: {
        primary: '#c8a55c',
        secondary: '#1a1a2e',
        accent: '#e8d5a3'
      },
      fonts: {
        display: 'Inter',
        body: 'Inter'
      }
    }

    const branding = {
      ...defaultBranding,
      ...(destination.branding || {}),
      ...(company.branding || {}),
      colors: {
        ...defaultBranding.colors,
        ...(destination.branding?.colors || {}),
        ...(company.branding?.colors || {})
      },
      fonts: {
        ...defaultBranding.fonts,
        ...(destination.branding?.fonts || {}),
        ...(company.branding?.fonts || {})
      }
    }

    return branding
  }

  #composeNavigation(context) {
    const config = context.config || {}
    const destination = config.destination || {}
    const company = config.company || {}

    const defaultNavigation = {
      header: {
        items: [
          { label: 'Inicio', path: '/' },
          { label: 'Nosotros', path: '/nosotros' },
          { label: 'Contacto', path: '/contacto' }
        ]
      },
      footer: {
        columns: [
          { title: 'Empresa', items: [] },
          { title: 'Servicios', items: [] },
          { title: 'Legal', items: [] }
        ]
      }
    }

    const navigation = {
      ...defaultNavigation,
      header: {
        ...defaultNavigation.header,
        ...(destination.navigation?.header || {}),
        items: destination.navigation?.header?.items || defaultNavigation.header.items
      },
      footer: {
        ...defaultNavigation.footer,
        ...(destination.navigation?.footer || {})
      }
    }

    return navigation
  }

  #composeSEO(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}
    const company = context.company || config.company || {}

    const destinationName = destination.name || 'Valdi'
    const description = destination.description || ''

    const seo = {
      ...(destination.seo || {}),
      titleTemplate: destination.seo?.defaultTitle || `{name} — ${destinationName}`,
      descriptionTemplate: destination.seo?.defaultDescription || description,
      ogImage: destination.seo?.ogImage || '/assets/og-default.jpg',
      keywords: destination.seo?.keywords || [],
      noIndex: destination.seo?.noIndex || false
    }

    return seo
  }

  #composeI18n(context) {
    const config = context.config || {}
    const country = context.country || config.country || {}
    const destination = context.destination || config.destination || {}

    const i18n = {
      ...(config.i18n || {}),
      ...(country.i18n || {}),
      ...(destination.i18n || {}),
      defaultLocale: country.i18n?.defaultLocale || destination.i18n?.defaultLocale || 'es-CL',
      fallbackLocale: country.i18n?.fallbackLocale || destination.i18n?.fallbackLocale || 'es',
      supportedLocales: [
        ...new Set([
          ...(country.i18n?.supportedLocales || []),
          ...(destination.i18n?.supportedLocales || ['es', 'en'])
        ])
      ]
    }

    return i18n
  }

  #composeMaps(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}

    const maps = {
      ...(destination.maps || {}),
      provider: destination.maps?.provider || 'mapbox',
      defaultCenter: destination.maps?.defaultCenter || [-41.7545, -73.1269],
      defaultZoom: destination.maps?.defaultZoom || 12,
      style: destination.maps?.style || 'mapbox://styles/mapbox/outdoors-v12'
    }

    return maps
  }

  #composeAnalytics(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}

    const analytics = {
      ...(destination.analytics || {}),
      enabled: destination.analytics?.enabled ?? true,
      providers: destination.analytics?.providers || []
    }

    return analytics
  }

  #composeProviders(context) {
    const config = context.config || {}
    const destination = context.destination || config.destination || {}

    const providers = {
      storage: destination.providers?.storage || 'local',
      media: destination.providers?.media || 'local',
      maps: destination.providers?.maps || destination.maps?.provider || 'mapbox',
      analytics: destination.analytics?.providers || []
    }

    return providers
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'ExperienceComposer'
    }
  }

  async stop() {
    return true
  }
}

export default ExperienceComposer
