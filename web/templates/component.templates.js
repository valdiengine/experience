/**
 * Component Templates
 *
 * HTML templates for presentation components.
 * Framework-free SSR templates.
 */

import { escapeHtml, escapeAttr, escapeUrl } from '../rendering/html.escape.js'

export function renderHeader(viewModel = {}) {
  const branding = viewModel.branding || {}
  const navigation = viewModel.navigation || {}
  const logo = branding.logo || ''
  const logoAlt = escapeAttr(branding.name || 'Logo')
  const navItems = navigation.header?.items || []

  let navHtml = ''
  for (const item of navItems) {
    const href = escapeUrl(item.href) || item.href || '#'
    const label = escapeHtml(item.label || item.text || '')
    navHtml += `        <li><a href="${href}">${label}</a></li>\n`
  }

  return `<header class="site-header">
  <div class="header-container">
    <a href="/" class="logo" aria-label="${logoAlt}">
      ${logo ? `<img src="${escapeUrl(logo)}" alt="${logoAlt}" height="40">` : escapeHtml(branding.name || '')}
    </a>
    <nav aria-label="Main navigation">
      <ul class="nav-menu">
${navHtml}      </ul>
    </nav>
  </div>
</header>`
}

export function renderHero(viewModel = {}) {
  const hero = viewModel.hero || {}
  const seo = viewModel.seo || {}
  const title = escapeHtml(hero.title || seo.title || viewModel.destinationName || '')
  const subtitle = escapeHtml(hero.subtitle || seo.description || '')
  const heroImage = viewModel.heroImage || ''

  return `<section class="hero">
  <div class="hero-content">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
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

  const email = contact.email ? escapeHtml(contact.email) : ''
  const phone = contact.phone ? escapeHtml(contact.phone) : ''
  const address = contact.address ? escapeHtml(contact.address) : ''
  const hours = contact.hours ? escapeHtml(contact.hours) : ''

  if (!email && !phone && !address) {
    return ''
  }

  let contactHtml = ''
  if (email) {
    contactHtml += `        <li><strong>Email:</strong> <a href="mailto:${escapeAttr(email)}">${email}</a></li>\n`
  }
  if (phone) {
    contactHtml += `        <li><strong>Phone:</strong> <a href="tel:${escapeAttr(phone)}">${phone}</a></li>\n`
  }
  if (address) {
    contactHtml += `        <li><strong>Address:</strong> ${address}</li>\n`
  }
  if (hours) {
    contactHtml += `        <li><strong>Hours:</strong> ${hours}</li>\n`
  }

  return `<section class="contact">
  <div class="contact-container">
    <h2>Contact</h2>
    <address>
      <ul class="contact-list">
${contactHtml}      </ul>
    </address>
  </div>
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
      const href = escapeUrl(item.href) || '#'
      const label = escapeHtml(item.label || '')
      itemsHtml += `          <li><a href="${href}">${label}</a></li>\n`
    }

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
  renderFooter,
  renderInstallCTA,
  renderCategories,
  renderFeatured
}
