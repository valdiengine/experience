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
  renderFooter,
  renderInstallCTA,
  renderCategories,
  renderFeatured
} from '../templates/component.templates.js'
import { escapeHtml, escapeUrl } from './html.escape.js'
import { DesignTokens, createDesignTokens } from './design.tokens.js'

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
      manifest: viewModel.pwa?.enabled ? viewModel.pwa.manifestUrl : '/manifest.json',
      body,
      styles: this.renderStyles(viewModel),
      scripts: this.renderScripts(viewModel)
    })
  }

  buildViewModel(presentation) {
    const destination = presentation.destination || {}
    const vm = {
      identity: presentation.identity || {},
      destinationName: destination.name || presentation.metadata?.destinationName || '',
      destinationSlug: destination.slug || presentation.metadata?.destination || '',
      language: presentation.metadata?.language || 'es',
      locale: presentation.metadata?.locale || 'es-CL',
      branding: presentation.branding || {},
      navigation: presentation.navigation || {},
      seo: this.buildSeo(presentation),
      contact: presentation.contact || {},
      heroImage: this.extractHeroImage(presentation),
      services: this.extractServices(presentation),
      gallery: this.extractGallery(presentation),
      companies: this.extractCompanies(presentation),
      footer: presentation.navigation?.footer || { columns: [] },
      copyright: this.buildCopyright(presentation),
      quote: this.extractQuote(presentation),
      pwa: presentation.pwa || { enabled: false },
      categories: destination.categories || null,
      featured: destination.featured || null
    }

    return vm
  }

  buildSeo(presentation) {
    const seo = presentation.seo || {}
    const destination = presentation.destination || {}
    if (seo.title) return seo
    if (destination.name === 'Valdi' && destination.slug === 'valdi') {
      return {
        ...seo,
        title: 'Valdi — Turismo en Valdivia',
        description: seo.description || 'Descubre los mejores servicios turísticos, alojamiento, restaurantes y experiencias en Valdivia y Los Ríos, Chile.'
      }
    }
    return seo
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

  buildCopyright(presentation) {
    const year = new Date().getFullYear()
    const name = presentation.branding?.name || presentation.destination?.name || ''
    return `© ${year} ${name}`
  }

  renderBody(viewModel) {
    const sections = []

    sections.push(renderHeader(viewModel))

    const installCTAHtml = renderInstallCTA(viewModel)
    if (installCTAHtml) sections.push(installCTAHtml)

    sections.push(renderHero(viewModel))

    const categoriesHtml = renderCategories(viewModel)
    if (categoriesHtml) sections.push(categoriesHtml)

    const featuredHtml = renderFeatured(viewModel)
    if (featuredHtml) sections.push(featuredHtml)

    const servicesHtml = renderServices(viewModel)
    if (servicesHtml) sections.push(servicesHtml)

    const galleryHtml = renderGallery(viewModel)
    if (galleryHtml) sections.push(galleryHtml)

    const companiesHtml = renderCompanies(viewModel)
    if (companiesHtml) sections.push(companiesHtml)

    const quoteHtml = renderQuote(viewModel)
    if (quoteHtml) sections.push(quoteHtml)

    const contactHtml = renderContact(viewModel)
    if (contactHtml) sections.push(contactHtml)

    sections.push(renderFooter(viewModel))

    return sections.join('\n')
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
          addressLocality: viewModel.destinationName || '',
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

.contact ul {
  list-style: none;
  padding: 0;
}

.contact li {
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.contact a {
  color: var(--color-primary);
  transition: color var(--transition-fast);
}

.contact a:hover {
  color: var(--color-secondary);
  text-decoration: underline;
}

.contact a:focus-visible {
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
</style>`
  }

  renderScripts(viewModel = {}) {
    var identity = viewModel.identity || {};
    var quoteConfig = viewModel.quote || {};
    var pwa = viewModel.pwa || {};

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
    if (!e.target.closest('.site-header') && nav.classList.contains('is-open')) {
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
</script>${pushInitScript}`
  }
}

export function createHtmlRenderer(options = {}) {
  return new HtmlRenderer(options)
}

export default HtmlRenderer
