/**
 * Component Templates
 *
 * HTML templates for presentation components.
 * Framework-free SSR templates.
 */

import { escapeHtml, escapeAttr, escapeUrl } from '../rendering/html.escape.js'

/**
 * Logo URL policy (MVP, narrowest-safe)
 *
 * The renderer cannot verify whether a local asset path physically exists or
 * will be served (which local prefixes resolve depends on infrastructure —
 * /static/, /apps/, /media/, /uploads/, etc.). No prefix policy is encoded here
 * and no future prefix is guessed. Only absolute http(s) URLs (external
 * resources) are rendered as an <img>; every local/relative logo path falls
 * back to the text brand name so an unserved logo (e.g. Albasie's current
 * /assets/.../logo.svg) never renders as a broken traveler-visible image.
 */
function isUsableLogoUrl(logo) {
  if (!logo || typeof logo !== 'string') return false
  return /^https?:\/\//i.test(logo)
}

function extractDigits(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\D/g, '')
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tripadvisor', label: 'TripAdvisor' }
]

function renderSocialLinks(social = {}) {
  if (!social || typeof social !== 'object') return ''
  let html = ''
  for (const platform of SOCIAL_PLATFORMS) {
    const url = social[platform.key]
    if (typeof url !== 'string') continue
    const safe = escapeUrl(url)
    if (!safe || !/^https?:\/\//i.test(safe)) continue
    html += `          <li><a href="${safe}" target="_blank" rel="noopener">${platform.label}</a></li>\n`
  }
  return html
}

export function renderHeader(viewModel = {}) {
  const branding = viewModel.branding || {}
  const navigation = viewModel.navigation || {}
  const navItems = navigation.header?.items || []
  const logo = branding.logo || ''
  const logoUsable = isUsableLogoUrl(logo)
  const brandName = escapeHtml(branding.name || '')
  const logoAlt = escapeAttr(branding.name || 'Logo')

  let navHtml = ''
  for (const item of navItems) {
    const href = escapeUrl(item.href)
    if (!href || href === '#') continue
    const label = escapeHtml(item.label || item.text || '')
    if (!label) continue
    navHtml += `        <li><a href="${href}">${label}</a></li>\n`
  }

  const hasNavItems = navHtml.trim().length > 0

  return `<header class="site-header">
  <div class="header-container">
    <a href="#inicio" class="logo" aria-label="${logoAlt}">
      ${logoUsable ? `<img src="${escapeUrl(logo)}" alt="${logoAlt}" height="40">` : brandName}
    </a>
    <nav aria-label="Main navigation">
      ${hasNavItems ? `<button type="button" class="mobile-nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Abrir menú"><span class="nav-toggle-label" aria-hidden="true">Menú</span></button>` : ''}
      <ul class="nav-menu" id="nav-menu">
${navHtml}      </ul>
    </nav>
  </div>
</header>`
}

export function renderHero(viewModel = {}) {
  const hero = viewModel.hero || {}
  const seo = viewModel.seo || {}
  const company = viewModel.company || {}
  const contact = viewModel.contact || {}

  const hasCompany = Boolean(company && company.name)
  const isDefaultType = (type) => typeof type === 'string' && type.toLowerCase() === 'company'
  const eyebrow = hasCompany && typeof company.type === 'string' && !isDefaultType(company.type)
    ? escapeHtml(company.type)
    : ''

  const whatsapp = typeof contact.whatsapp === 'string' ? contact.whatsapp : ''
  const whatsappDigits = extractDigits(whatsapp)
  const phone = typeof contact.phone === 'string' ? contact.phone : ''

  const canWhatsApp = Boolean(hasCompany && whatsapp && whatsappDigits)
  const canCall = Boolean(hasCompany && phone)

  const title = escapeHtml(hero.title || seo.title || viewModel.destinationName || '')
  const subtitle = escapeHtml(hero.subtitle || seo.description || '')
  const heroImage = viewModel.heroImage || ''

  let actionsHtml = ''
  if (canWhatsApp || canCall) {
    actionsHtml = `      <div class="hero-actions">
`
    if (canWhatsApp) {
      actionsHtml += `        <a class="hero-btn hero-btn-primary" href="https://wa.me/${escapeAttr(whatsappDigits)}" target="_blank" rel="noopener">WhatsApp</a>
`
    }
    if (canCall) {
      actionsHtml += `        <a class="hero-btn hero-btn-secondary" href="tel:${escapeAttr(phone)}">Llamar</a>
`
    }
    actionsHtml += `      </div>
`
  }

  return `<section class="hero" id="inicio">
  <div class="hero-content">
    ${eyebrow ? `<p class="hero-eyebrow">${eyebrow}</p>\n` : ''}    <h1>${title}</h1>
    ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>\n` : ''}${actionsHtml}  </div>
  ${heroImage ? `<div class="hero-image"><img src="${escapeUrl(heroImage)}" alt="${title}"></div>` : ''}
</section>`
}

export function renderServices(viewModel = {}) {
  const services = viewModel.services || []

  if (services.length === 0) {
    return ''
  }

  let itemsHtml = ''
  for (const service of services) {
    const name = escapeHtml(service.name || service.title || '')
    const description = escapeHtml(service.description || '')
    const icon = service.icon || ''
    const href = escapeUrl(service.href) || '#'

    itemsHtml += `      <article class="service-item">
        <a href="${href}">
          ${icon ? `<div class="service-icon">${icon}</div>` : ''}
          <h3>${name}</h3>
          <p>${description}</p>
        </a>
      </article>\n`
  }

  return `<section class="services">
  <div class="services-container">
    <h2>Services</h2>
    <div class="services-grid">
${itemsHtml}    </div>
  </div>
</section>`
}

export function renderGallery(viewModel = {}) {
  const gallery = viewModel.gallery || []

  if (gallery.length === 0) {
    return ''
  }

  let imagesHtml = ''
  for (const image of gallery) {
    const src = escapeUrl(image.src || image.url || image) || ''
    const alt = escapeAttr(image.alt || image.title || 'Gallery image')
    const caption = image.caption ? escapeHtml(image.caption) : ''

    if (!src) continue

    imagesHtml += `      <figure class="gallery-item">
        <img src="${src}" alt="${alt}">
        ${caption ? `<figcaption>${caption}</figcaption>` : ''}
      </figure>\n`
  }

  return `<section class="gallery">
  <div class="gallery-container">
    <h2>Gallery</h2>
    <div class="gallery-grid">
${imagesHtml}    </div>
  </div>
</section>`
}

export function renderCompanies(viewModel = {}) {
  const companies = viewModel.companies || []

  if (companies.length === 0) {
    return ''
  }

  let itemsHtml = ''
  for (const company of companies) {
    const name = escapeHtml(company.name || '')
    const description = escapeHtml(company.description || company.excerpt || '')
    const logo = company.logo || ''
    const href = company.href || company.url || '#'
    const location = company.location ? escapeHtml(company.location) : ''

    itemsHtml += `      <article class="company-item">
        <a href="${escapeUrl(href) || '#'}">
          ${logo ? `<div class="company-logo"><img src="${escapeUrl(logo)}" alt="${escapeAttr(name)}"></div>` : ''}
          <h3>${name}</h3>
          ${location ? `<p class="company-location">${location}</p>` : ''}
          <p>${description}</p>
        </a>
      </article>\n`
  }

  return `<section class="companies">
  <div class="companies-container">
    <h2>Businesses</h2>
    <div class="companies-grid">
${itemsHtml}    </div>
  </div>
</section>`
}

export function renderContact(viewModel = {}) {
  const contact = viewModel.contact || {}
  const company = viewModel.company || {}
  const social = company.social || {}

  const email = typeof contact.email === 'string' ? contact.email : ''
  const phone = typeof contact.phone === 'string' ? contact.phone : ''
  const address = typeof contact.address === 'string' ? contact.address : ''
  const hours = typeof contact.hours === 'string' ? contact.hours : ''
  const whatsapp = typeof contact.whatsapp === 'string' ? contact.whatsapp : ''
  const whatsappDigits = extractDigits(whatsapp)

  const socialHtml = renderSocialLinks(social)

  if (!email && !phone && !address && !hours && !whatsapp && !socialHtml) {
    return ''
  }

  let actionsHtml = ''
  if (whatsapp && whatsappDigits) {
    actionsHtml += `      <li>
        <a class="contact-action" href="https://wa.me/${escapeAttr(whatsappDigits)}" target="_blank" rel="noopener">
          <span class="contact-action-label">WhatsApp</span>
          <span class="contact-action-value">${escapeHtml(whatsapp)}</span>
        </a>
      </li>\n`
  }
  if (phone) {
    actionsHtml += `      <li>
        <a class="contact-action" href="tel:${escapeAttr(phone)}">
          <span class="contact-action-label">Phone</span>
          <span class="contact-action-value">${escapeHtml(phone)}</span>
        </a>
      </li>\n`
  }
  if (email) {
    actionsHtml += `      <li>
        <a class="contact-action" href="mailto:${escapeAttr(email)}">
          <span class="contact-action-label">Email</span>
          <span class="contact-action-value">${escapeHtml(email)}</span>
        </a>
      </li>\n`
  }

  let infoHtml = ''
  if (address) {
    infoHtml += `      <li class="contact-info-row"><strong>Address:</strong> ${escapeHtml(address)}</li>\n`
  }
  if (hours) {
    infoHtml += `      <li class="contact-info-row"><strong>Hours:</strong> ${escapeHtml(hours)}</li>\n`
  }

  return `<section class="contact" id="contacto">
  <div class="contact-container">
    <h2>Contact</h2>
    ${actionsHtml ? `<ul class="contact-actions">\n${actionsHtml}    </ul>\n` : ''}${infoHtml ? `<ul class="contact-info">\n${infoHtml}    </ul>\n` : ''}${socialHtml ? `<ul class="social-links">\n${socialHtml}    </ul>` : ''}  </div>
</section>`
}

export function renderQuote(viewModel = {}) {
  const quote = viewModel.quote

  if (!quote || !quote.enabled) {
    return ''
  }

  const title = escapeHtml(quote.title || 'Solicitar Cotización')
  const description = escapeHtml(quote.description || 'Complete el formulario para recibir una cotización')
  const currency = quote.currency || 'CLP'
  const options = quote.options || []
  const customerFields = quote.customerFields || []
  const calculatedResult = quote.calculatedResult

  let optionsHtml = ''
  for (const opt of options) {
    const checked = opt.selected ? 'checked' : ''
    const priceFormatted = formatCurrency(opt.price, currency)
    optionsHtml += `
      <label class="quote-option">
        <input type="checkbox" name="quote-option" value="${escapeAttr(opt.id)}" ${checked}>
        <span class="quote-option-content">
          <span class="quote-option-label">${escapeHtml(opt.label)}</span>
          <span class="quote-option-price">${priceFormatted}</span>
        </span>
      </label>`
  }

  let fieldsHtml = ''
  for (const field of customerFields) {
    const required = field.required ? 'required' : ''
    fieldsHtml += `
      <div class="quote-field">
        <label for="quote-${escapeAttr(field.id)}">${escapeHtml(field.label)}</label>
        <input type="${escapeAttr(field.type || 'text')}" id="quote-${escapeAttr(field.id)}" name="${escapeAttr(field.id)}" placeholder="${escapeAttr(field.placeholder || '')}" ${required}>
      </div>`
  }

  let resultHtml = ''
  if (calculatedResult) {
    const totalFormatted = formatCurrency(calculatedResult.total, currency)
    resultHtml = `
      <div class="quote-result">
        <div class="quote-result-total">
          <span class="quote-result-label">Total:</span>
          <span class="quote-result-value">${totalFormatted}</span>
        </div>
        ${calculatedResult.lineItems ? `
        <div class="quote-result-breakdown">
          ${calculatedResult.lineItems.map(item => `
            <div class="quote-line-item">
              <span>${escapeHtml(item.label)}</span>
              <span>${formatCurrency(item.price, currency)}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>`
  }

  return `<section class="quote" id="quote-section">
  <div class="quote-container">
    <div class="quote-header">
      <h2>${title}</h2>
      <p>${description}</p>
    </div>
    <form class="quote-form" id="quote-form" data-quote-api="/api/v1/quotes">
      <div class="quote-options">
        <h3>Seleccione productos</h3>
        <div class="quote-options-list">
          ${optionsHtml}
        </div>
      </div>
      <div class="quote-customer">
        <h3>Datos del cliente</h3>
        <div class="quote-fields">
          ${fieldsHtml}
        </div>
      </div>
      ${resultHtml}
      <div class="quote-actions">
        <button type="button" class="btn btn-secondary" id="quote-calculate">Calcular</button>
        <button type="submit" class="btn btn-primary" id="quote-submit">Enviar Cotización</button>
      </div>
    </form>
    <div class="quote-status" id="quote-status" hidden></div>
  </div>
</section>`
}

function formatCurrency(amount, currency = 'CLP') {
  if (typeof amount !== 'number') return amount
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount)
}

export function renderBookingSection(viewModel = {}) {
  const booking = viewModel.booking || {}

  if (!booking.enabled) {
    return ''
  }

  const slug = typeof booking.slug === 'string' && booking.slug
    ? booking.slug
    : viewModel.company?.slug
  if (!slug) {
    return ''
  }

  const endpoint = typeof booking.availabilityEndpoint === 'string' && booking.availabilityEndpoint
    ? booking.availabilityEndpoint
    : `/api/v1/booking/companies/${encodeURIComponent(slug)}/availability`
  const title = booking.title ? escapeHtml(booking.title) : 'Reserva tu experiencia'
  const description = booking.description
    ? escapeHtml(booking.description)
    : 'Consulta disponibilidad y realiza tu reserva en línea con confirmación inmediata'
  const escape = escapeUrl(endpoint)

  return `<section class="booking" id="reservas">
  <div class="booking-container">
    <h2>${title}</h2>
    <p>${description}</p>
    <a class="booking-cta" href="${escape ? escape : '#'}" role="button">Reservar</a>
  </div>
</section>`
}

export function renderFooter(viewModel = {}) {
  const branding = viewModel.branding || {}
  const navigation = viewModel.footer?.columns || []
  const copyright = escapeHtml(viewModel.copyright || `© ${new Date().getFullYear()} ${branding.name || 'Valdi'}`)

  let columnsHtml = ''
  for (const column of navigation) {
    const title = escapeHtml(column.title || '')
    const items = column.items || []

    let itemsHtml = ''
    for (const item of items) {
      const href = escapeUrl(item.href)
      if (!href || href === '#') continue
      const label = escapeHtml(item.label || '')
      if (!label) continue
      itemsHtml += `          <li><a href="${href}">${label}</a></li>\n`
    }

    if (!itemsHtml.trim()) continue

    columnsHtml += `        <div class="footer-column">
          <h3>${title}</h3>
          <ul>
${itemsHtml}          </ul>
        </div>\n`
  }

  return `<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-brand">
      <p>${escapeHtml(branding.name || '')}</p>
    </div>
    <div class="footer-columns">
 ${columnsHtml}    </div>
    <div class="footer-bottom">
      <p>${copyright}</p>
    </div>
  </div>
</footer>`
}

export function renderInstallCTA(viewModel = {}) {
  const pwa = viewModel.pwa || {}

  if (!pwa.enabled) {
    return ''
  }

  const config = pwa.config || {}
  const appName = config.shortName || config.name || 'esta app'
  const appId = pwa.appId ? pwa.appId.replace(/[^a-zA-Z0-9]/g, '_') : 'default'
  const storageKey = `pwa-install-dismissed-${appId}`

  return `<div id="install-pwa-banner" class="install-pwa-banner" hidden>
  <div class="install-pwa-content">
    <span>Instala ${escapeHtml(appName)} para una mejor experiencia</span>
    <div class="install-pwa-actions">
      <button type="button" id="pwa-install-btn" class="btn btn-primary">Instalar</button>
      <button type="button" id="pwa-dismiss-btn" class="btn btn-secondary" aria-label="Dismiss">×</button>
    </div>
  </div>
</div>
<script>
(function() {
  var banner = document.getElementById('install-pwa-banner');
  var installBtn = document.getElementById('pwa-install-btn');
  var dismissBtn = document.getElementById('pwa-dismiss-btn');
  var deferredPrompt = null;
  var storageKey = '${storageKey}';

  if (!banner || !installBtn || !dismissBtn) return;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    banner.hidden = false;
  });

  window.addEventListener('appinstalled', function() {
    banner.hidden = true;
    deferredPrompt = null;
  });

  installBtn.addEventListener('click', async function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    var result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      banner.hidden = true;
    }
    deferredPrompt = null;
  });

  dismissBtn.addEventListener('click', function() {
    banner.hidden = true;
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {}
  });

  if (!window.matchMedia('(display-mode: standalone)').matches &&
      !navigator.standalone &&
      !localStorage.getItem(storageKey)) {
    setTimeout(function() {
      if (deferredPrompt) banner.hidden = false;
    }, 5000);
  }
})();
</script>`
}

export function renderCategories(viewModel = {}) {
  const categories = viewModel.categories
  if (!categories || typeof categories !== 'object') {
    return ''
  }

  const categoryEntries = Object.entries(categories)
  if (categoryEntries.length === 0) {
    return ''
  }

  let itemsHtml = ''
  for (const [key, cat] of categoryEntries) {
    const name = escapeHtml(cat.name || key)
    const icon = cat.icon || ''
    const color = cat.color || 'var(--color-primary)'
    const href = `/servicios?category=${encodeURIComponent(key)}`
    itemsHtml += `      <a href="${escapeUrl(href)}" class="category-card" style="--category-color: ${color}">
        <span class="category-icon">${icon}</span>
        <span class="category-name">${name}</span>
      </a>\n`
  }

  return `<section class="categories">
  <div class="categories-container">
    <h2>Categorías</h2>
    <div class="categories-grid">
${itemsHtml}    </div>
  </div>
</section>`
}

export function renderFeatured(viewModel = {}) {
  const featured = viewModel.featured
  if (!featured || !featured.enabled) {
    return ''
  }

  const categories = viewModel.categories || {}
  const categoryNames = featured.categories || []
  const maxItems = featured.maxItems || 6

  if (categoryNames.length === 0) {
    return ''
  }

  let itemsHtml = ''
  let count = 0
  for (const catKey of categoryNames) {
    if (count >= maxItems) break
    const cat = categories[catKey]
    if (!cat) continue
    const name = escapeHtml(cat.name || catKey)
    const icon = cat.icon || ''
    const color = cat.color || 'var(--color-primary)'
    const href = `/servicios?category=${encodeURIComponent(catKey)}`
    itemsHtml += `      <article class="featured-card" style="--category-color: ${color}">
        <a href="${escapeUrl(href)}">
          <span class="featured-icon">${icon}</span>
          <h3>${name}</h3>
        </a>
      </article>\n`
    count++
  }

  if (!itemsHtml) {
    return ''
  }

  return `<section class="featured">
  <div class="featured-container">
    <h2>Destacados</h2>
    <div class="featured-grid">
${itemsHtml}    </div>
  </div>
</section>`
}

export default {
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
  renderFeatured
}
