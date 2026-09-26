/**
 * HTML Renderer
 *
 * Renders Experience ViewModel to HTML using string templates.
 * Framework-free SSR implementation.
 * Uses Design Tokens for CSS variables.
 */

import { renderDocument, createOrganizationSchema, createWebSiteSchema, createBreadcrumbList } from '../templates/document.template.js'
import {
  renderHeader,
  renderHero,
  renderServices,
  renderGallery,
  renderCompanies,
  renderContact,
  renderQuote,
  renderBookingSection,
  renderFooter,
  renderInstallCTA,
  renderCategories,
  renderFeatured,
  renderZoneNavigation
} from '../templates/component.templates.js'
import { escapeHtml, escapeUrl } from './html.escape.js'
import { DesignTokens, createDesignTokens } from './design.tokens.js'

function hasContactData(contact = {}) {
  return Boolean(contact.email || contact.phone || contact.address || contact.whatsapp)
}

const NAV_LABEL_ANCHORS = {
  inicio: 'inicio',
  home: 'inicio',
  contacto: 'contacto',
  contact: 'contacto',
  servicios: 'servicios',
  services: 'servicios',
  galeria: 'galeria',
  gallery: 'galeria',
  categorias: 'categorias',
  categories: 'categorias',
  destacados: 'destacados',
  featured: 'destacados',
  empresas: 'empresas',
  companies: 'empresas'
}

/**
 * Navigation must only contain traveler-visible targets that actually render.
 * Explicit hrefs are kept as-is. Path-only items (inherited destination
 * navigation) are resolved by label to same-page anchors ONLY when the
 * corresponding section is actually rendered; otherwise the item is omitted.
 */
function resolveNavItem(item, rendered = {}) {
  const explicitHref = typeof item?.href === 'string' ? item.href : ''
  if (explicitHref && explicitHref !== '#' && explicitHref.trim() !== '') {
    return explicitHref
  }
  const label = String(item?.label || item?.text || '').toLowerCase().trim()
  const anchor = NAV_LABEL_ANCHORS[label]
  if (!anchor || !rendered[anchor]) return null
  return `#${anchor}`
}

function normalizeNavigation(navigation = {}, rendered = {}) {
  const headerItems = navigation.header?.items || []
  const footerColumns = navigation.footer?.columns || []

  const header = { items: [] }
  for (const item of headerItems) {
    const href = resolveNavItem(item, rendered)
    if (!href) continue
    header.items.push({
      label: item.label || item.text || '',
      href
    })
  }

  const footer = { columns: [] }
  for (const column of footerColumns) {
    const items = []
    for (const item of column.items || []) {
      const href = resolveNavItem(item, rendered)
      if (!href) continue
      items.push({ label: item.label || item.text || '', href })
    }
    if (items.length > 0) {
      footer.columns.push({ title: column.title || '', items })
    }
  }

  return { header, footer }
}

export class HtmlRenderer {
  constructor(options = {}) {
    this.options = options
    this.designTokens = createDesignTokens()
  }

  render(presentation, request = {}) {
    const viewModel = this.buildViewModel(presentation)

    const body = this.renderBody(viewModel)
    const seo = this.renderSeo(viewModel, request)
    const canonical = this.buildCanonical(request)
    const jsonLd = this.buildJsonLd(viewModel, canonical)

    const pwaConfig = viewModel.pwa?.config
    const pwaEnabled = viewModel.pwa?.enabled

    return renderDocument({
      title: seo.title,
      description: seo.description,
      language: viewModel.language || 'es-CL',
      canonical,
      robots: seo.robots || 'index, follow',
      og: {
        title: seo.title,
        description: seo.description,
        image: viewModel.heroImage || seo.image,
        url: canonical,
        siteName: viewModel.branding?.name || viewModel.destinationName,
        locale: viewModel.locale || 'es-CL'
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.title,
        description: seo.description,
        image: viewModel.heroImage || seo.image
      },
      jsonLd,
      manifest: pwaEnabled ? viewModel.pwa.manifestUrl : '/manifest.json',
      body,
      styles: this.renderStyles(viewModel),
      scripts: this.renderScripts(viewModel),
      favicon: pwaConfig?.favicon || viewModel.branding?.favicon || null,
      appleTouchIcon: pwaConfig?.appleTouchIcon || viewModel.branding?.appleTouchIcon || null,
      themeColor: pwaConfig?.themeColor || null,
      dataApplicationScope: viewModel.zonePresentation?.cssScope || null,
      appleWebApp: pwaEnabled ? {
        capable: true,
        title: pwaConfig?.name || viewModel.branding?.name || 'Application',
        statusBarStyle: 'black-translucent'
      } : null
    })
  }

  buildViewModel(presentation) {
    const destination = presentation.destination || {}
    const company = presentation.company || {}
    const branding = presentation.branding || {}

    const services = this.extractServices(presentation)
    const gallery = this.extractGallery(presentation)
    const companies = this.extractCompanies(presentation)
    const quote = this.extractQuote(presentation)
    const booking = this.extractBooking(presentation)
    const categories = destination.categories || null
    const featured = destination.featured || null

    const rendered = {
      inicio: true,
      contacto: hasContactData(presentation.contact || {}),
      servicios: services.length > 0,
      galeria: gallery.length > 0,
      empresas: companies.length > 0,
      categorias: categories && typeof categories === 'object' && Object.keys(categories).length > 0,
      destacados: Boolean(featured && featured.enabled && featured.categories && featured.categories.length > 0)
    }

    const normalizedNavigation = normalizeNavigation(presentation.navigation || {}, rendered)

    const vm = {
      identity: presentation.identity || {},
      company,
      destinationName: destination.name || presentation.metadata?.destinationName || '',
      destinationSlug: destination.slug || presentation.metadata?.destination || '',
      language: presentation.metadata?.language || 'es',
      locale: presentation.metadata?.locale || 'es-CL',
      branding: {
        ...branding,
        name: branding.name || company.name || destination.name || ''
      },
      navigation: normalizedNavigation,
      zoneNavigation: presentation.zoneNavigation || null,
      zoneContent: presentation.zoneContent || null,
      zonePresentation: presentation.zonePresentation || null,
      seo: this.buildSeo(presentation),
      contact: normalizeContact(presentation.contact || {}),
      hero: {
        title: company.name || null,
        subtitle: company.description || null
      },
      heroImage: this.extractHeroImage(presentation),
      services,
      gallery,
      companies,
      footer: normalizedNavigation.footer || { columns: [] },
      copyright: this.buildCopyright(branding, company, destination),
      quote,
      booking,
      pwa: presentation.pwa || { enabled: false },
      categories,
      featured
    }

    return vm
  }

  buildSeo(presentation) {
    const seo = presentation.seo || {}
    const destination = presentation.destination || {}
    const company = presentation.company || {}

    const enrich = (base) => ({
      ...base,
      description: base.description || company.description || ''
    })

    if (seo.title) {
      return enrich(seo)
    }
    if (destination.name === 'Valdi' && destination.slug === 'valdi') {
      return enrich({
        ...seo,
        title: 'Valdi — Turismo en Valdivia',
        description: seo.description || 'Descubre los mejores servicios turísticos, alojamiento, restaurantes y experiencias en Valdivia y Los Ríos, Chile.'
      })
    }
    return enrich(seo)
  }

  extractHeroImage(presentation) {
    if (presentation.rendered?.branding?.heroImage) {
      return presentation.rendered.branding.heroImage
    }
    if (presentation.branding?.heroImage) {
      return presentation.branding.heroImage
    }
    return null
  }

  extractServices(presentation) {
    const modules = presentation.modules || []
    const servicesModule = modules.find(m => m.type === 'services' || m.name === 'services')

    if (servicesModule?.items) {
      return servicesModule.items.map(item => ({
        name: item.name || item.title,
        description: item.description || item.excerpt || '',
        icon: item.icon || '',
        href: item.href || item.url || `/services/${item.slug || item.id}`
      }))
    }

    return []
  }

  extractGallery(presentation) {
    const modules = presentation.modules || []
    const galleryModule = modules.find(m => m.type === 'gallery' || m.name === 'gallery')

    if (galleryModule?.items) {
      return galleryModule.items.map(item => ({
        src: item.src || item.url || item.image,
        alt: item.alt || item.title || '',
        caption: item.caption || ''
      }))
    }

    return []
  }

  extractCompanies(presentation) {
    const modules = presentation.modules || []
    const companiesModule = modules.find(m => m.type === 'companies' || m.name === 'companies')

    if (companiesModule?.items) {
      return companiesModule.items.map(item => ({
        name: item.name,
        description: item.description || item.excerpt || '',
        logo: item.logo || item.image,
        href: item.href || item.url || `/business/${item.slug || item.id}`,
        location: item.location || item.address || ''
      }))
    }

    return []
  }

  extractQuote(presentation) {
    const capabilities = presentation.capabilities || []
    const quoteCap = capabilities.find(c =>
      typeof c === 'object' && c.name === 'quote'
    )

    if (!quoteCap || !quoteCap.configuration) {
      return null
    }

    const config = quoteCap.configuration
    return {
      enabled: config.enabled ?? true,
      title: config.title || 'Solicitar Cotización',
      description: config.description || 'Complete el formulario para recibir una cotización',
      currency: config.currency || 'CLP',
      options: config.options || [],
      customerFields: config.customerFields || [],
      calculatedResult: null
    }
  }

  extractBooking(presentation) {
    if (presentation.booking && typeof presentation.booking === 'object') {
      const booking = presentation.booking
      const bookingSlug = typeof booking.slug === 'string' && booking.slug ? booking.slug : null
      return {
        ...booking,
        reservationEndpoint: typeof booking.reservationEndpoint === 'string' && booking.reservationEndpoint
          ? booking.reservationEndpoint
          : bookingSlug ? `/api/v1/booking/companies/${encodeURIComponent(bookingSlug)}/reservations` : null
      }
    }

    const capabilities = presentation.capabilities || []
    const bookingCap = capabilities.find(c =>
      typeof c === 'object' && c.name === 'booking'
    )

    if (bookingCap?.configuration) {
      const config = bookingCap.configuration
      const configSlug = typeof config.slug === 'string' && config.slug ? config.slug : null
      return {
        enabled: config.enabled === true,
        slug: config.slug || null,
        title: config.title || null,
        description: config.description || null,
        availabilityEndpoint: config.availabilityEndpoint || null,
        reservationEndpoint: typeof config.reservationEndpoint === 'string' && config.reservationEndpoint
          ? config.reservationEndpoint
          : configSlug ? `/api/v1/booking/companies/${encodeURIComponent(configSlug)}/reservations` : null
      }
    }

    return { enabled: false }
  }

  buildCopyright(branding = {}, company = {}, destination = {}) {
    const year = new Date().getFullYear()
    const name = branding.name || company.name || destination.name || ''
    return `© ${year} ${name}`
  }

  renderBody(viewModel) {
    const body = []

    body.push(renderHeader(viewModel))

    const installCTAHtml = renderInstallCTA(viewModel)
    if (installCTAHtml) body.push(installCTAHtml)

    const mainSections = []
    mainSections.push(renderHero(viewModel))

    const zoneNavHtml = renderZoneNavigation(viewModel)
    if (zoneNavHtml) mainSections.push(zoneNavHtml)

    const categoriesHtml = renderCategories(viewModel)
    if (categoriesHtml) mainSections.push(categoriesHtml)

    const featuredHtml = renderFeatured(viewModel)
    if (featuredHtml) mainSections.push(featuredHtml)

    const servicesHtml = renderServices(viewModel)
    if (servicesHtml) mainSections.push(servicesHtml)

    const galleryHtml = renderGallery(viewModel)
    if (galleryHtml) mainSections.push(galleryHtml)

    const companiesHtml = renderCompanies(viewModel)
    if (companiesHtml) mainSections.push(companiesHtml)

    const quoteHtml = renderQuote(viewModel)
    if (quoteHtml) mainSections.push(quoteHtml)

    const bookingHtml = renderBookingSection(viewModel)
    if (bookingHtml) mainSections.push(bookingHtml)

    const contactHtml = renderContact(viewModel)
    if (contactHtml) mainSections.push(contactHtml)

    body.push(`<main id="main-content">\n${mainSections.join('\n')}\n</main>`)
    body.push(renderFooter(viewModel))

    return body.join('\n')
  }

  renderSeo(viewModel, request) {
    const seo = viewModel.seo || {}

    return {
      title: seo.title || seo.defaultTitle || viewModel.destinationName || '',
      description: seo.description || seo.metaDescription || seo.defaultDescription || '',
      robots: seo.robots || seo.noIndex ? 'noindex' : 'index, follow',
      image: seo.image || seo.ogImage || viewModel.heroImage
    }
  }

  buildCanonical(request) {
    const domain = request.canonicalDomain || request.domain || 'valdi.app'
    const protocol = 'https'
    const path = request.pathname || '/'
    return `${protocol}://${domain}${path}`
  }

  buildJsonLd(viewModel, canonical) {
    const schemas = []
    const branding = viewModel?.branding || {}
    const contact = viewModel?.contact || {}

    // WebSite schema
    if (branding.name) {
      schemas.push(createWebSiteSchema(branding.name, canonical))
    }

    // Organization schema
    schemas.push(createOrganizationSchema(
      branding.name || 'Valdi',
      canonical,
      branding.logo || null,
      {
        email: contact.email || null,
        phone: contact.phone || null,
        address: contact.address ? {
          streetAddress: contact.address,
          addressLocality: viewModel.contact?.city || viewModel.destinationName || '',
          addressCountry: 'CL'
        } : null
      }
    ))

    // BreadcrumbList schema for non-root pages
    if (viewModel.pathname && viewModel.pathname !== '/') {
      const breadcrumb = createBreadcrumbList([
        { name: 'Home', url: `${new URL(canonical).origin}/` },
        { name: viewModel.destinationName || branding.name || '', url: canonical }
      ])
      if (breadcrumb) schemas.push(breadcrumb)
    }

    return schemas
  }

  renderStyles(viewModel) {
    const branding = viewModel?.branding || {}
    const cssVars = this.designTokens.generateCssVariables(branding)
    const baseStyles = this.designTokens.generateBaseStyles(branding)
    const responsiveStyles = this.designTokens.generateResponsiveStyles()
    const utilityStyles = this.designTokens.generateUtilityClasses()

    return `<style>
${baseStyles}

${responsiveStyles}

${utilityStyles}

/* Component-specific styles */
.site-header {
  position: relative;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md);
}

.header-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
  color: var(--color-text);
}

.logo img {
  height: 40px;
  width: auto;
}

.nav-menu {
  display: flex;
  gap: var(--spacing-lg);
}

.nav-menu a {
  color: var(--color-text);
  transition: color var(--transition-fast);
  padding: var(--spacing-xs) 0;
  border-bottom: 2px solid transparent;
}

.nav-menu a:hover,
.nav-menu a:focus {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.nav-menu a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.hero {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: #fff;
  padding: var(--spacing-section) var(--spacing-md);
  text-align: center;
}

.hero-content {
  max-width: var(--layout-max-width-narrow);
  margin: 0 auto;
}

.hero h1 {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  margin-bottom: var(--spacing-md);
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.hero p {
  font-size: 1.125rem;
  opacity: 0.95;
}

/* Mobile mini-app hero opener */
.hero-eyebrow {
  display: inline-block;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-full);
  background: rgba(255,255,255,0.14);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.hero-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.hero-btn-primary {
  background: #fff;
  color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.hero-btn-primary:hover,
.hero-btn-primary:focus-visible {
  background: var(--color-surface);
  transform: translateY(-1px);
}

.hero-btn-secondary {
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.85);
}

.hero-btn-secondary:hover,
.hero-btn-secondary:focus-visible {
  background: rgba(255,255,255,0.14);
  transform: translateY(-1px);
}

.services,
.gallery,
.companies,
.contact {
  padding: var(--spacing-section) var(--spacing-md);
}

.services-container,
.gallery-container,
.companies-container,
.contact-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
}

.services h2,
.gallery h2,
.companies h2,
.contact h2 {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  font-size: 1.75rem;
  color: var(--color-text);
}

.services-grid,
.gallery-grid,
.companies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
}

.service-item,
.gallery-item,
.company-item {
  background: var(--color-surface);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}

.service-item:hover,
.gallery-item:hover,
.company-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.service-item a,
.company-item a {
  display: block;
  color: inherit;
  text-decoration: none;
}

.service-item h3,
.company-item h3 {
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.service-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-sm);
}

.company-logo img {
  max-height: 60px;
  width: auto;
  margin-bottom: var(--spacing-sm);
}

.company-location {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-bottom: var(--spacing-sm);
}

.gallery-item img {
  width: 100%;
  border-radius: var(--radius-md);
}

.gallery-item figcaption {
  margin-top: var(--spacing-sm);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Touch-first contact actions, info rows, and social chips */
.contact-actions {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-xl);
  display: grid;
  gap: var(--spacing-md);
}

.contact-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-height: 56px;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.contact-action:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.contact-action:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.contact-action-label {
  font-weight: 600;
  color: var(--color-text);
}

.contact-action-value {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  text-align: right;
  word-break: break-word;
}

.contact-info {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-xl);
  display: grid;
  gap: var(--spacing-sm);
}

.contact-info-row {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.social-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.social-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.social-links a:hover {
  border-color: var(--color-primary);
  background: rgba(0,0,0,0.03);
}

.social-links a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.site-footer {
  background: var(--color-text);
  color: var(--color-background);
  padding: var(--spacing-xl) var(--spacing-md);
}

.footer-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
}

.footer-brand {
  margin-bottom: var(--spacing-lg);
  font-weight: 600;
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.footer-column h3 {
  font-size: 1rem;
  margin-bottom: var(--spacing-md);
  color: #fff;
}

.footer-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-column li {
  margin-bottom: var(--spacing-sm);
}

.footer-column a {
  color: rgba(255,255,255,0.7);
  transition: color var(--transition-fast);
}

.footer-column a:hover {
  color: #fff;
}

.footer-column a:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.footer-bottom {
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
  font-size: 0.875rem;
  color: rgba(255,255,255,0.6);
}

/* Mobile Navigation */
.mobile-nav-toggle {
  display: none;
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  cursor: pointer;
}

.mobile-nav-toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .mobile-nav-toggle {
    display: block;
  }

  .nav-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-background);
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-md);
    flex-direction: column;
    gap: var(--spacing-md);
    box-shadow: var(--shadow-md);
  }

  .nav-menu.is-open {
    display: flex;
  }

  .nav-menu a {
    padding: var(--spacing-sm);
    border-bottom: none;
  }
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skip link for accessibility */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary);
  color: #fff;
  padding: var(--spacing-sm) var(--spacing-md);
  z-index: var(--zindex-sticky);
  transition: top var(--transition-fast);
}

.skip-link:focus {
  top: 0;
}

/* Button base styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: 2px solid transparent;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-secondary);
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-secondary:hover {
  background: var(--color-primary);
  color: #fff;
}

/* Quote Section */
.quote {
  background: var(--color-surface);
  padding: var(--spacing-section) var(--spacing-md);
}

.quote-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
}

.quote-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.quote-header h2 {
  font-size: 1.75rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.quote-header p {
  color: var(--color-text-muted);
}

.quote-form {
  display: grid;
  gap: var(--spacing-xl);
}

.quote-options h3,
.quote-customer h3 {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.quote-options-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.quote-option {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.quote-option:hover {
  border-color: var(--color-primary);
}

.quote-option input[type="checkbox"] {
  margin-right: var(--spacing-md);
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.quote-option-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.quote-option-label {
  font-weight: 500;
  color: var(--color-text);
}

.quote-option-price {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.quote-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.quote-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.quote-field label {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.875rem;
}

.quote-field input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
}

.quote-field input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.quote-result {
  background: var(--color-background);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-primary);
}

.quote-result-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-md);
}

.quote-result-label {
  font-weight: 600;
  color: var(--color-text);
}

.quote-result-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.quote-result-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.quote-line-item {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

  .quote-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  /* Quote status messages */
  .quote-status {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .quote-status[hidden] {
    display: none;
  }

  .quote-status.loading {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .quote-status.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }

  .quote-status.error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }

  /* Loading spinner */
  .quote-status.loading::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: quote-spin 0.8s linear infinite;
    margin-right: var(--spacing-sm);
    vertical-align: middle;
  }

  @keyframes quote-spin {
    to { transform: rotate(360deg); }
  }

  /* Button loading state */
  .btn.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .btn.loading::after {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: quote-spin 0.8s linear infinite;
    margin-left: var(--spacing-sm);
    vertical-align: middle;
  }

@media (max-width: 767px) {
  .quote-options-list {
    grid-template-columns: 1fr;
  }

  .quote-actions {
    flex-direction: column;
  }

  .quote-actions .btn {
    width: 100%;
  }
}

/* Booking Section */
.booking {
  background: var(--color-surface);
  padding: var(--spacing-section) var(--spacing-md);
}

.booking-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
}

.booking-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.booking-header h2 {
  font-size: 1.75rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.booking-header p {
  color: var(--color-text-muted);
}

.booking-date-form {
  display: grid;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.booking-date-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.booking-date-fields label,
.booking-traveler-fields label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--color-text);
}

.booking-date-fields input,
.booking-traveler-fields input,
.booking-traveler-fields textarea {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
}

.booking-date-fields input:focus,
.booking-traveler-fields input:focus,
.booking-traveler-fields textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.booking-traveler-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.booking-cta {
  justify-self: start;
}

.booking-state,
.booking-confirmation {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  text-align: center;
}

.booking-state[hidden],
.booking-confirmation[hidden] {
  display: none;
}

.booking-state.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.booking-state.success,
.booking-confirmation {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.booking-state.loading {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.booking-state.loading::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: booking-spin 0.8s linear infinite;
  margin-right: var(--spacing-sm);
  vertical-align: middle;
}

@keyframes booking-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 767px) {
  .booking-date-fields,
  .booking-traveler-fields {
    grid-template-columns: 1fr;
  }

  .booking-cta {
    width: 100%;
  }
}
</style>${this.renderZoneNavigationStyles(viewModel)}${this.renderZonePresentationStyles(viewModel)}`
  }

  /**
   * APP-ZONE-TABS-1 - L1 engine base styling for Zone Navigation (tabs).
   *
   * Every selector is prefixed with the per-Application cssScope so no two
   * Applications can collide on CSS selectors/scopes. Mobile uses an
   * internally-scrolling compact rail (overflow-x on the rail only) so the
   * page itself never overflows horizontally; desktop centers the pills and
   * panels act as tabpanels once enhanced.
   */
  renderZoneNavigationStyles(viewModel = {}) {
    const zoneNav = viewModel?.zoneNavigation
    if (!zoneNav || !zoneNav.scope || !zoneNav.scope.cssScope) {
      return ''
    }

    const s = zoneNav.scope.cssScope

    const hasZoneContent = !!(viewModel?.zoneContent &&
      Array.isArray(viewModel.zoneContent.items) &&
      viewModel.zoneContent.items.length > 0)

    // APP-ZONE-TABS-2: Level-1 structured panel content styling. Emitted ONLY
    // when the Application actually delivers structured zone content (e.g.
    // /isla-teja); content-less zone Applications keep the pristine engine
    // baseline without zone content CSS.
    const zoneContentStyles = hasZoneContent ? `
/* Zone Content bodies (APP-ZONE-TABS-2): real structured panel content,
   fully L1 token-driven and scoped to the per-Application cssScope. */
.${s} .zone-content {
  margin-top: var(--spacing-md);
}

.${s} .zone-content-lead {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}

.${s} .zone-content-paragraphs {
  display: grid;
  gap: var(--spacing-md);
}

.${s} .zone-content-paragraphs p {
  color: var(--color-text-muted);
}

.${s} .zone-content-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--spacing-md);
}

.${s} .zone-content-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.${s} .zone-content-item-name {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.${s} .zone-content-item-description {
  color: var(--color-text-muted);
  font-size: 0.925rem;
  margin-bottom: var(--spacing-sm);
}

.${s} .zone-content-item-note {
  color: var(--color-primary);
  font-size: 0.875rem;
}

.${s} .zone-content-map {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  display: grid;
  gap: var(--spacing-sm);
}

.${s} .zone-content-map-location {
  font-weight: 600;
  color: var(--color-text);
}

.${s} .zone-content-map-coords {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.${s} .zone-content-map-note {
  color: var(--color-text);
  font-size: 0.925rem;
}

@media (max-width: 767px) {
  .${s} .zone-content-list {
    grid-template-columns: 1fr;
  }
}
` : ''

    return `<style>
/* Zone Navigation (tabs) - scope: ${s} */
/* The root selector is a same-element compound: the SSR root emits the
   zone-nav class and the scoped class on the very same element. */
.${s}.zone-nav {
  padding: var(--spacing-section) var(--spacing-md);
}

.${s} .zone-nav-container {
  max-width: var(--layout-max-width);
  margin: 0 auto;
}

.${s} .zone-nav-title {
  text-align: center;
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}

.${s} .zone-nav-rail {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  max-width: 100%;
}

.${s} .zone-nav-rail::-webkit-scrollbar {
  display: none;
}

.${s} .zone-nav-tabs {
  list-style: none;
  margin: 0;
  padding: var(--spacing-xs);
  display: flex;
  flex-wrap: nowrap;
  gap: var(--spacing-sm);
  min-width: max-content;
}

.${s} .zone-nav-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.925rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.${s} .zone-nav-tab:hover,
.${s} .zone-nav-tab:focus-visible {
  border-color: var(--color-primary);
  color: var(--color-primary);
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.${s} .zone-nav-tab.is-active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.${s} .zone-nav-panels {
  margin-top: var(--spacing-lg);
}

.${s} .zone-nav-panel {
  padding: var(--spacing-lg) 0;
  border-bottom: 1px solid var(--color-border);
}

.${s} .zone-nav-panel:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.${s} .zone-nav-panel h3 {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.${s} .zone-nav-panel p {
  color: var(--color-text-muted);
}

${zoneContentStyles}
/* Progressive enhancement: only the active tabpanel is visible once enhanced */
.${s}.zone-nav.is-enhanced .zone-nav-panel {
  display: none;
}

.${s}.zone-nav.is-enhanced .zone-nav-panel.is-active {
  display: block;
}

@media (max-width: 767px) {
  .${s} .zone-nav-rail {
    margin-left: calc(var(--spacing-md) * -2);
    margin-right: calc(var(--spacing-md) * -2);
  }

  .${s} .zone-nav-tabs {
    padding-left: var(--spacing-lg);
    padding-right: var(--spacing-lg);
  }

  .${s} .zone-nav-panel {
    padding: var(--spacing-lg) var(--spacing-md);
  }
}

@media (min-width: 768px) {
    .${s} .zone-nav-rail {
      overflow: visible;
    }

    .${s} .zone-nav-tabs {
      justify-content: center;
      flex-wrap: wrap;
      min-width: 0;
    }
  }
  </style>`
  }

  /**
   * APP-ZONE-PRESENT-1 - Engine-generated, Application-scoped visual identity.
   *
   * Emitted ONLY when the Application's validated ZonePresentation config
   * reaches the view model (gated on the engine-derived cssScope). Tokens map
   * to the EXACT same --color-* custom properties the Level-1 engine styles
   * already consume, so no new CSS vocabulary exists — only scoped
   * reassignment under the Application's own navigation scope, never :root.
   */
  renderZonePresentationStyles(viewModel = {}) {
    const zonePres = viewModel?.zonePresentation
    if (!zonePres || !zonePres.cssScope) {
      return ''
    }

    const s = zonePres.cssScope
    const tokens = zonePres.tokens || {}
    const entries = Object.entries(tokens)
    if (entries.length === 0) {
      return ''
    }

    const declarations = entries
      .map(([name, value]) => `  --color-${name}: ${value};`)
      .join('\n')

    return `<style>
/* ZonePresentation - Application-scoped visual identity (APP-ZONE-PRESENT-1) */
/* Scope authority: cssScope derived exclusively from generateZoneNavigationScope. */
/* Tokens === Level-1 --color-* custom properties; no new CSS vocabulary. */
[data-application-scope="${s}"] {
${declarations}
}
</style>`
  }

  renderScripts(viewModel = {}) {
    var identity = viewModel.identity || {};
    var quoteConfig = viewModel.quote || {};
    var bookingConfig = viewModel.booking || {};
    var pwa = viewModel.pwa || {};

    var zoneNavScript = '';
    if (viewModel.zoneNavigation) {
      zoneNavScript = `<script>
(function() {
  if (typeof document === 'undefined') return;

  // APP-ZONE-TABS-1 (audit): enhancement is instance-safe. Every
  // [data-zone-nav] root in the document is enhanced independently, with all
  // tab/panel lookups scoped inside its own subtree, so multiple roots never
  // cross-select. The root DOM id is server-derived from the cssScope, so no
  // two roots can ever share an id.
  var roots = document.querySelectorAll('[data-zone-nav]');
  if (roots.length === 0) return;

  for (var iRoot = 0; iRoot < roots.length; iRoot++) {
    enhance(roots[iRoot]);
  }

  function enhance(root) {
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-zone-tab]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[data-zone-panel]'));
  if (tabs.length === 0 || tabs.length !== panels.length) return;

  var tablist = root.querySelector('.zone-nav-tabs');
  if (!tablist) return;

  function panelFor(tab) {
    var ref = tab.getAttribute('data-zone-panel-ref');
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].id === ref) return panels[i];
    }
    return null;
  }

  function setActive(key, opts) {
    opts = opts || {};
    tabs.forEach(function(tab) {
      var active = tab.getAttribute('data-zone-tab') === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      var panel = panelFor(tab);
      if (panel) tab.setAttribute('aria-controls', panel.id);
    });
    panels.forEach(function(panel) {
      var active = panel.getAttribute('data-zone-panel') === key;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('role', 'tabpanel');
      if (opts.focus && active) {
        try { panel.focus(); } catch (e) {}
      }
    });
  }

  function activate(key, opts) {
    opts = opts || {};
    setActive(key, opts);
    var panel = null;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-zone-tab') === key) {
        panel = panelFor(tabs[i]);
        break;
      }
    }
    if (panel && window.location.hash !== '#' + panel.id) {
      window.location.hash = panel.id;
    }
  }

  function keyFromHash() {
    var hash = window.location.hash;
    if (!hash) return null;
    var target = hash.slice(1);
    for (var i = 0; i < tabs.length; i++) {
      var panel = panelFor(tabs[i]);
      if (panel && (panel.id === target || tabs[i].getAttribute('data-zone-tab') === target)) {
        return tabs[i].getAttribute('data-zone-tab');
      }
    }
    return null;
  }

  root.classList.add('is-enhanced');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', root.getAttribute('aria-label') || 'Explorar');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      activate(tab.getAttribute('data-zone-tab'));
    });
  });

  tablist.addEventListener('keydown', function(e) {
    var focused = document.activeElement;
    if (!focused) return;
    var current = focused.getAttribute('data-zone-tab');
    if (current === null) return;
    var index = tabs.indexOf(focused);
    if (index < 0) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = tabs[(index + 1) % tabs.length];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = tabs[(index - 1 + tabs.length) % tabs.length];
    } else if (e.key === 'Home') {
      next = tabs[0];
    } else if (e.key === 'End') {
      next = tabs[tabs.length - 1];
    }
    if (next) {
      e.preventDefault();
      activate(next.getAttribute('data-zone-tab'), { focus: true });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(current);
    }
  });

  window.addEventListener('hashchange', function() {
    var key = keyFromHash();
    if (key) setActive(key);
  });

  setActive(keyFromHash() || tabs[0].getAttribute('data-zone-tab'));
  }
})();
</script>`;
    }

    var pwaScript = '';
    if (pwa.enabled && pwa.serviceWorkerUrl) {
      pwaScript = `<script>
(function() {
  // PWA Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('${pwa.serviceWorkerUrl}', {
      scope: '${pwa.serviceWorkerScope || '/'}'
    }).then(function(registration) {
      console.log('SW registered:', registration.scope);
      window.__pushSWRegistration = registration;
    }).catch(function(error) {
      console.log('SW registration failed:', error);
    });
  }
})();
</script>`;
    }

    var pushInitScript = '';
    if (pwa.enabled) {
      pushInitScript = `<script>
(function() {
  var pushState = 'unknown';
  var pushButton = null;

  function updatePushButton() {
    if (!pushButton) pushButton = document.getElementById('push-notify-btn');
    if (!pushButton) return;

    if (pushState === 'granted') {
      pushButton.textContent = 'Notificaciones activas';
      pushButton.classList.add('active');
    } else if (pushState === 'denied') {
      pushButton.textContent = 'Notificaciones bloqueadas';
      pushButton.disabled = true;
    } else if (pushState === 'default') {
      pushButton.textContent = 'Activar notificaciones';
      pushButton.disabled = false;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function subscribeToPush(publicKey) {
    if (!('PushManager' in window)) {
      console.log('[Push] PushManager not supported');
      return;
    }

    try {
      var registration = await navigator.serviceWorker.register('${pwa.serviceWorkerUrl || '/sw-albasie.js'}', {
        scope: '${pwa.serviceWorkerScope || '/albasie/'}'
      });

      var sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      var keys = {
        p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
        auth: arrayBufferToBase64(sub.getKey('auth'))
      };

      var response = await fetch('/api/v1/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: keys
        })
      });

      if (response.ok) {
        pushState = 'granted';
        console.log('[Push] Subscribed successfully');
      } else {
        console.log('[Push] Subscription failed:', response.status);
      }
    } catch (err) {
      console.log('[Push] Subscription error:', err.message);
    }

    updatePushButton();
  }

  async function initPush() {
    pushButton = document.getElementById('push-notify-btn');

    if (!pushButton) {
      var header = document.querySelector('.site-header');
      if (header) {
        pushButton = document.createElement('button');
        pushButton.id = 'push-notify-btn';
        pushButton.type = 'button';
        pushButton.className = 'push-notify-btn';
        pushButton.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;padding:12px 16px;background:#c8956c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
        header.appendChild(pushButton);
      }
    }

    if (!pushButton) return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      pushButton.textContent = 'Push no soportado';
      pushButton.disabled = true;
      return;
    }

    var permission = Notification.permission;
    pushState = permission;

    if (permission === 'granted') {
      updatePushButton();
      return;
    }

    if (permission === 'denied') {
      updatePushButton();
      return;
    }

    pushButton.addEventListener('click', async function() {
      pushButton.disabled = true;
      pushButton.textContent = 'Activando...';

      try {
        var permResult = await Notification.requestPermission();
        pushState = permResult;

        if (permResult === 'granted') {
          var keyResponse = await fetch('/api/v1/push/public-key');
          var keyData = await keyResponse.json();

          if (keyData.configured && keyData.publicKey) {
            await subscribeToPush(keyData.publicKey);
          } else {
            console.log('[Push] VAPID key not configured on server');
            pushState = 'denied';
          }
        } else {
          pushState = 'denied';
        }
      } catch (err) {
        console.log('[Push] Error:', err.message);
        pushState = 'denied';
      }

      updatePushButton();
    });

    updatePushButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPush);
  } else {
    initPush();
  }
})();
</script>`;
    }

    return `<script>
(function() {
  // Quote API configuration from server
  window.quoteAPIConfig = {
    applicationId: '${identity.applicationId || 'valdi.app/albasie'}',
    domain: '${identity.domain || 'valdi.app'}',
    route: '${identity.route || '/albasie'}',
    company: '${identity.company || 'albasie'}',
    destination: '${identity.destination || 'valdi'}',
    quoteConfig: ${JSON.stringify(quoteConfig)}
  };
})();
</script><script>
(function() {
  // Booking API configuration from server
  window.bookingAPIConfig = {
    applicationId: '${identity.applicationId || 'valdi.app/albasie'}',
    domain: '${identity.domain || 'valdi.app'}',
    route: '${identity.route || '/albasie'}',
    company: '${identity.company || 'albasie'}',
    destination: '${identity.destination || 'valdi'}',
    bookingConfig: ${JSON.stringify(bookingConfig)}
  };
})();
</script>${pwaScript}<script>
(function() {
  // Mobile navigation toggle
  var toggle = document.querySelector('.mobile-nav-toggle');
  var nav = document.querySelector('.nav-menu');
  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('is-open');
      var expanded = nav.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Close mobile nav on focus outside
  document.addEventListener('click', function(e) {
    if (nav && nav.classList.contains('is-open') && !e.target.closest('.site-header')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Quote form handling
  var quoteForm = document.getElementById('quote-form');
  var quoteCalculateBtn = document.getElementById('quote-calculate');
  var quoteSubmitBtn = document.getElementById('quote-submit');
  var quoteStatus = document.getElementById('quote-status');

  if (quoteForm && quoteCalculateBtn && quoteSubmitBtn) {
    var apiEndpoint = quoteForm.getAttribute('data-quote-api') || '/api/v1/quotes';
    var apiConfig = window.quoteAPIConfig || {};

    function showStatus(message, type) {
      if (!quoteStatus) return;
      quoteStatus.textContent = message;
      quoteStatus.className = 'quote-status ' + type;
      quoteStatus.hidden = false;
    }

    function hideStatus() {
      if (!quoteStatus) return;
      quoteStatus.hidden = true;
      quoteStatus.className = 'quote-status';
    }

    function setButtonLoading(btn, loading) {
      if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }

    function collectFormData() {
      var selectedOptions = [];
      var checkboxes = quoteForm.querySelectorAll('input[name="quote-option"]:checked');
      checkboxes.forEach(function(checkbox) {
        selectedOptions.push(checkbox.value);
      });

      var customerData = {};
      var fields = quoteForm.querySelectorAll('.quote-field input, .quote-field textarea, .quote-field select');
      fields.forEach(function(field) {
        if (field.name) {
          customerData[field.name] = field.value;
        }
      });

      return {
        options: selectedOptions,
        customerData: customerData
      };
    }

    function formatCurrency(amount, currency) {
      if (typeof amount !== 'number') return amount;
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency || 'CLP' }).format(amount);
    }

    function updateQuoteResult(result, currency) {
      var existingResult = quoteForm.querySelector('.quote-result');
      if (existingResult) {
        existingResult.remove();
      }

      if (result && result.total) {
        var resultHtml = '<div class="quote-result">' +
          '<div class="quote-result-total">' +
            '<span class="quote-result-label">Total:</span>' +
            '<span class="quote-result-value">' + formatCurrency(result.total, currency) + '</span>' +
          '</div>';

        if (result.lineItems && result.lineItems.length > 0) {
          resultHtml += '<div class="quote-result-breakdown">';
          result.lineItems.forEach(function(item) {
            resultHtml += '<div class="quote-line-item">' +
              '<span>' + item.label + '</span>' +
              '<span>' + formatCurrency(item.price, currency) + '</span>' +
            '</div>';
          });
          resultHtml += '</div>';
        }

        resultHtml += '</div>';

        var actionsDiv = quoteForm.querySelector('.quote-actions');
        actionsDiv.insertAdjacentHTML('beforebegin', resultHtml);
      }
    }

    async function handleCalculate(e) {
      e.preventDefault();
      hideStatus();

      if (quoteCalculateBtn) setButtonLoading(quoteCalculateBtn, true);

      try {
        var data = collectFormData();

        var response = await fetch(apiEndpoint + '/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            applicationId: apiConfig.applicationId || 'valdi.app/albasie',
            domain: apiConfig.domain || 'valdi.app',
            route: apiConfig.route || '/albasie',
            company: apiConfig.company || 'albasie',
            destination: apiConfig.destination || 'valdi',
            selections: { options: data.options },
            customerData: data.customerData,
            configuration: apiConfig.quoteConfig || { enabled: true }
          })
        });

        var result = await response.json();

        if (result.success && result.data && result.data.result) {
          updateQuoteResult(result.data.result, result.data.result.currency);
          showStatus('Cotización calculada correctamente', 'success');
        } else {
          showStatus(result.error || 'Error al calcular la cotización', 'error');
        }
      } catch (error) {
        console.error('Quote calculate error:', error);
        showStatus('Error de conexión. Intente nuevamente.', 'error');
      } finally {
        if (quoteCalculateBtn) setButtonLoading(quoteCalculateBtn, false);
      }
    }

    async function handleSubmit(e) {
      e.preventDefault();
      hideStatus();

      if (quoteSubmitBtn) setButtonLoading(quoteSubmitBtn, true);

      try {
        var data = collectFormData();

        if (data.options.length === 0) {
          showStatus('Seleccione al menos un producto', 'error');
          if (quoteSubmitBtn) setButtonLoading(quoteSubmitBtn, false);
          return;
        }

        var requiredFields = quoteForm.querySelectorAll('.quote-field input[required], .quote-field textarea[required]');
        var missing = false;
        requiredFields.forEach(function(field) {
          if (!field.value.trim()) {
            missing = true;
            field.style.borderColor = '#721c24';
          } else {
            field.style.borderColor = '';
          }
        });

        if (missing) {
          showStatus('Complete todos los campos requeridos', 'error');
          if (quoteSubmitBtn) setButtonLoading(quoteSubmitBtn, false);
          return;
        }

        var response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            applicationId: apiConfig.applicationId || 'valdi.app/albasie',
            domain: apiConfig.domain || 'valdi.app',
            route: apiConfig.route || '/albasie',
            company: apiConfig.company || 'albasie',
            destination: apiConfig.destination || 'valdi',
            selections: { options: data.options },
            customerData: data.customerData,
            configuration: apiConfig.quoteConfig || { enabled: true }
          })
        });

        var result = await response.json();

        if (result.success) {
          showStatus('¡Cotización enviada correctamente! Nos contactaremos pronto.', 'success');
          quoteForm.reset();
          var existingResult = quoteForm.querySelector('.quote-result');
          if (existingResult) existingResult.remove();

          if (result.data && result.data.interactionId) {
            console.log('Quote interaction created:', result.data.interactionId);
          }
        } else {
          showStatus(result.error || 'Error al enviar la cotización', 'error');
        }
      } catch (error) {
        console.error('Quote submit error:', error);
        showStatus('Error de conexión. Intente nuevamente.', 'error');
      } finally {
        if (quoteSubmitBtn) setButtonLoading(quoteSubmitBtn, false);
      }
    }

    quoteCalculateBtn.addEventListener('click', handleCalculate);
    quoteForm.addEventListener('submit', handleSubmit);

    // Clear error styling on input
    var inputs = quoteForm.querySelectorAll('input, textarea, select');
    inputs.forEach(function(input) {
      input.addEventListener('input', function() {
        input.style.borderColor = '';
      });
    });
  }
})();
</script><script>
(function() {
  if (typeof document === 'undefined') return;

  // Booking widget configuration from server (progressive enhancement)
  var config = window.bookingAPIConfig || {};
  var bookingConfig = config.bookingConfig || {};

  var section = document.querySelector('[data-booking-slug]');
  var dateForm = section ? section.querySelector('[data-booking-date-form]') : null;
  var stateRegion = section ? section.querySelector('[data-booking-state]') : null;
  var travelerForm = section ? section.querySelector('[data-booking-traveler-form]') : null;
  var confirmationRegion = section ? section.querySelector('[data-booking-confirmation]') : null;

  if (!section || !dateForm || !stateRegion || !travelerForm || !confirmationRegion) return;

  var availabilityEndpoint = bookingConfig.availabilityEndpoint ||
    section.getAttribute('data-booking-availability');
  var reservationEndpoint = bookingConfig.reservationEndpoint ||
    section.getAttribute('data-booking-reservation');
  var slug = bookingConfig.slug || section.getAttribute('data-booking-slug');

  function showState(message, type) {
    stateRegion.textContent = message;
    stateRegion.className = 'booking-state ' + (type || '');
    stateRegion.hidden = false;
  }

  function hideState() {
    stateRegion.className = 'booking-state';
    stateRegion.hidden = true;
  }

  function setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  function readDateInput(name) {
    var input = dateForm.querySelector('input[name="' + name + '"]');
    return input ? input.value : '';
  }

  dateForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideState();
    confirmationRegion.hidden = true;
    confirmationRegion.textContent = '';

    var checkIn = readDateInput('checkIn');
    var checkOut = readDateInput('checkOut');
    if (!checkIn || !checkOut) {
      showState('Selecciona una fecha de entrada y salida.', 'error');
      return;
    }

    var submitBtn = dateForm.querySelector('button[type="submit"]');
    if (submitBtn) setButtonLoading(submitBtn, true);

    try {
      var url = availabilityEndpoint +
        '?slug=' + encodeURIComponent(slug) +
        '&checkIn=' + encodeURIComponent(checkIn) +
        '&checkOut=' + encodeURIComponent(checkOut);
      var response = await fetch(url);
      var result = await response.json();

      if (response.status === 409) {
        showState(result.error || 'No hay disponibilidad para esas fechas. Prueba con otras fechas.', 'error');
        return;
      }

      var dates = (result.data && Array.isArray(result.data.dates)) ? result.data.dates : [];
      var allNightsAvailable = dates.length > 0 &&
        dates.every(function(day) { return day && day.status === 'available'; });

      if (!result.success || !result.data || !allNightsAvailable) {
        showState(result.error || 'No hay disponibilidad para esas fechas.', 'error');
        return;
      }

      travelerForm.hidden = false;
      showState('Disponibilidad confirmada: ' + checkIn + ' a ' + checkOut + '.', 'success');
    } catch (error) {
      console.error('Booking availability error:', error);
      showState('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
      if (submitBtn) setButtonLoading(submitBtn, false);
    }
  });

  travelerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideState();

    var nameInput = travelerForm.querySelector('input[name="name"]');
    var emailInput = travelerForm.querySelector('input[name="email"]');
    var phoneInput = travelerForm.querySelector('input[name="phone"]');
    var guestCountInput = travelerForm.querySelector('input[name="guestCount"]');
    var notesInput = travelerForm.querySelector('textarea[name="notes"]') ||
      travelerForm.querySelector('input[name="notes"]');
    if (!nameInput) {
      showState('Ingresa tu nombre para reservar.', 'error');
      return;
    }

    var submitBtn = travelerForm.querySelector('button[type="submit"]');
    if (submitBtn) setButtonLoading(submitBtn, true);

    try {
      var payload = {
        checkIn: readDateInput('checkIn'),
        checkOut: readDateInput('checkOut'),
        guestName: nameInput.value,
        guestEmail: emailInput ? emailInput.value : '',
        guestPhone: phoneInput ? phoneInput.value : '',
        guestCount: guestCountInput ? parseInt(guestCountInput.value, 10) : 1,
        notes: notesInput ? notesInput.value : ''
      };

      var response = await fetch(reservationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var result = await response.json();

      if (response.status === 409) {
        showState(result.error || 'La disponibilidad cambió. Elige otras fechas e intenta de nuevo.', 'error');
        return;
      }

      if (result.success && result.data && result.data.confirmationCode) {
        confirmationRegion.textContent = 'Reserva confirmada. Tu código de confirmación es ' +
          result.data.confirmationCode + '.';
        confirmationRegion.hidden = false;
        travelerForm.hidden = true;
        dateForm.reset();
      } else {
        showState(result.error || 'No se pudo completar la reserva.', 'error');
      }
    } catch (error) {
      console.error('Booking reservation error:', error);
      showState('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
      if (submitBtn) setButtonLoading(submitBtn, false);
    }
  });
})();
</script>${pushInitScript}${zoneNavScript}`
  }
}

export function createHtmlRenderer(options = {}) {
  return new HtmlRenderer(options)
}

function normalizeContact(contact = {}) {
  const address = contact.address
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    return {
      ...contact,
      address: [address.street, address.city, address.region].filter(Boolean).join(', '),
      city: address.city || null,
      region: address.region || null
    }
  }
  return contact
}

export default HtmlRenderer
