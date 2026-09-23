/**
 * MVP-FIRST-VISUAL-4 — Polished Mobile Company Mini-App
 *
 * Second mobile-first visual MVP — product regression.
 *
 * Proves the rendered Albasie company experience presents as a polished
 * mobile tourism mini-app through the real configuration path:
 *   ConfigurationLoader → ApplicationPresentationRenderer
 *   → HtmlRenderer (+ component templates + inline tokenized CSS)
 *
 * Covers:
 *   - branded hero opener with PRIMARY WhatsApp CTA and SECONDARY Call CTA
 *   - hero/action markup derived from generic real data (never hardcoded)
 *   - touch-first contact action/information section
 *   - social actions as deliberate touch-friendly links
 *   - conditional rendering (no dead CTA when data is missing)
 *   - no fabricated services/gallery/booking content
 *   - PWA, mobile nav, and MVP-3 positioning contract stay intact
 *
 * Scope: PRODUCT/PRESENTATION/RENDERING only.
 * Framework-free implementation.
 */

import path from 'path'
import { fileURLToPath } from 'url'

import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'
import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { createHtmlRenderer } from './rendering/html.renderer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

const COMPANY_NAME = 'Albasie'
const COMPANY_DESCRIPTION = 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile'
const COMPANY_WHATSAPP = '+56912345678'
const COMPANY_PHONE = '+56 9 1234 5678'
const COMPANY_EMAIL = 'info@albasie.cl'
const COMPANY_ADDRESS = 'Calle Principal 123, Valdivia, Los Ríos'
const COMPANY_INSTAGRAM = 'https://instagram.com/albasie'
const COMPANY_FACEBOOK = 'https://facebook.com/albasie'
const COMPANY_TRIPADVISOR = 'https://tripadvisor.com/albasie'

let passCount = 0
let failCount = 0

async function test(name, fn) {
  try {
    await fn()
    passCount++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failCount++
    console.log(`  ✗ ${name}`)
    console.log(`    ${error.message}`)
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertContains(html, substring, message) {
  if (!html.includes(substring)) {
    throw new Error(`${message}\nHTML does not contain: ${JSON.stringify(substring)}`)
  }
}

function assertNotContains(html, substring, message) {
  if (html.includes(substring)) {
    throw new Error(`${message}\nHTML unexpectedly contains: ${JSON.stringify(substring)}`)
  }
}

function buildHtml(presentation) {
  const htmlRenderer = createHtmlRenderer()
  return htmlRenderer.render(presentation, { domain: 'valdi.app', pathname: '/albasie', canonicalDomain: 'valdi.app' })
}

/**
 * Synthetic presentation object shaped exactly like the ApplicationPresentation
 * adapter output, used to prove GENERIC (non-Albasie) behavior and conditional
 * CTA rendering with arbitrary real-looking data.
 */
function buildSyntheticPresentation(overrides = {}) {
  const contact = overrides.contact ?? {
    email: 'hola@ejemplo.cl',
    phone: '+56 9 5555 6666',
    whatsapp: '+56955556666',
    address: 'Calle Ejemplo 456, Valdivia, Los Ríos'
  }
  const social = overrides.social ?? {
    instagram: 'https://instagram.com/ejemplo',
    facebook: 'https://facebook.com/ejemplo',
    tripadvisor: 'https://tripadvisor.com/ejemplo'
  }
  return {
    identity: { platform: 'valdi-platform', domain: 'valdi.app', language: 'es', locale: 'es-CL' },
    destination: { slug: 'valdi', name: 'Valdi' },
    company: overrides.company ?? {
      slug: 'ejemplo',
      name: 'Ejemplo Turismo',
      description: 'Empresa turística de ejemplo en el sur de Chile',
      type: overrides.type || 'tour-guide',
      contact,
      branding: { colors: { primary: '#1a2b3c', secondary: '#3c2b1a' } },
      enabledCategories: ['tourism'],
      enabledModules: [],
      social
    },
    contact,
    branding: {
      logo: null,
      favicon: null,
      colors: { primary: '#1a2b3c', secondary: '#3c2b1a', accent: '#e8d5a3' },
      fonts: { display: 'Inter', body: 'Inter' }
    },
    seo: { title: 'Ejemplo Turismo', description: 'Empresa turística de ejemplo en el sur de Chile' },
    navigation: {
      header: {
        items: [
          { label: 'Inicio', path: '/' },
          { label: 'Servicios', path: '/servicios' },
          { label: 'Contacto', path: '/contacto' }
        ]
      },
      footer: { columns: [] }
    },
    modules: [],
    capabilities: [],
    pwa: { enabled: false },
    metadata: { language: 'es', locale: 'es-CL' }
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-4 — POLISHED MOBILE COMPANY MINI-APP')
  console.log('═══════════════════════════════════════════════════════════\n')

  const configurationLoader = new ConfigurationLoader({ root: REPO_ROOT })
  await configurationLoader.initialize()

  const renderer = createApplicationPresentationRenderer({ configurationLoader })
  const renderResult = await renderer.render({ domain: 'valdi.app', path: '/albasie' })

  await test('Full presentation renders successfully', () => {
    assert(renderResult.success === true, `Render failed: ${renderResult.error}`)
    assert(renderResult.presentation, 'Presentation is missing')
  })

  const presentation = renderResult.presentation
  const html = buildHtml(presentation)
  const heroHtml = extractSection(html, 'class="hero"')
  const contactHtml = extractSection(html, 'class="contact"')

  await test('Company name remains real', () => {
    assertContains(html, '<h1>Albasie</h1>', 'Hero title is not the real company name')
    assertContains(html, 'aria-label="Albasie"', 'Header brand is not the real company name')
  })

  await test('Company description remains real', () => {
    assertContains(heroHtml, COMPANY_DESCRIPTION, 'Hero does not show the real company description')
  })

  await test('Primary WhatsApp CTA exists in/near hero', () => {
    assertContains(heroHtml, 'class="hero-actions"', 'Hero actions block missing')
    assertContains(heroHtml, 'class="hero-btn hero-btn-primary"', 'Primary WhatsApp CTA missing')
  })

  await test('WhatsApp CTA uses real normalized value', () => {
    assertContains(heroHtml, `https://wa.me/${COMPANY_WHATSAPP.replace(/\D/g, '')}`, 'WhatsApp CTA does not use the normalized real number')
    assertContains(heroHtml, 'target="_blank" rel="noopener"', 'WhatsApp CTA missing safe external link attributes')
  })

  await test('Secondary phone CTA exists', () => {
    assertContains(heroHtml, 'class="hero-btn hero-btn-secondary"', 'Secondary call CTA missing')
    assertContains(heroHtml, '>Llamar</a>', 'Call CTA lacks its action label')
  })

  await test('Phone CTA uses real company value', () => {
    assertContains(heroHtml, `href="tel:${COMPANY_PHONE}"`, 'Call CTA does not use the real phone value')
  })

  await test('Email action remains available', () => {
    assertContains(html, `mailto:${COMPANY_EMAIL}`, 'Email action missing')
  })

  await test('Real address remains visible', () => {
    assertContains(html, `Address:</strong> ${COMPANY_ADDRESS}`, 'Real address missing')
  })

  await test('Instagram remains real', () => {
    assertContains(html, COMPANY_INSTAGRAM, 'Instagram link missing or changed')
  })

  await test('Facebook remains real', () => {
    assertContains(html, COMPANY_FACEBOOK, 'Facebook link missing or changed')
  })

  await test('TripAdvisor remains real', () => {
    assertContains(html, COMPANY_TRIPADVISOR, 'TripAdvisor link missing or changed')
  })

  await test('Touch-first contact section uses action rows', () => {
    assertContains(html, 'class="contact-actions"', 'Contact action rows missing')
    assertContains(html, 'class="contact-action"', 'Contact action row missing')
    assertContains(html, 'class="contact-action-value"', 'Contact action value missing')
  })

  await test('Social links render as deliberate touch-friendly actions', () => {
    assertContains(html, '<ul class="social-links">', 'Social actions container missing')
    assertContains(html, 'target="_blank" rel="noopener"', 'Social links missing safe external attributes')
  })

  await test('Hero/action markup is generic (no hardcoded company data)', () => {
    assertNotContains(heroHtml, 'Albasie@ejemplo', 'Hero references synthetic data')
    const syntheticHtml = buildHtml(buildSyntheticPresentation())
    assertContains(syntheticHtml, 'https://wa.me/56955556666', 'Generic company WhatsApp CTA does not follow normalized data')
    assertContains(syntheticHtml, 'href="tel:+56 9 5555 6666"', 'Generic company phone CTA does not follow data')
  })

  await test('No fake services appear', () => {
    assertNotContains(html, '<section class="services"', 'Services section should not render without data')
    assertNotContains(html, 'Nahuel', 'Stale content leaked into HTML')
  })

  await test('No fake gallery appears', () => {
    assertNotContains(html, '<section class="gallery"', 'Gallery section should not render without data')
  })

  await test('No fake booking/availability action appears', () => {
    assertNotContains(html, 'id="quote-form"', 'Quote form should not render for a company without quote capability')
    assertNotContains(html, '/api/v1/availability', 'Availability endpoint should not be exposed')
    assertNotContains(html, '>Reservar<', 'Reservation action should not be fabricated')
  })

  await test('No broken local company logo <img> appears', () => {
    const headerHtml = extractSection(html, 'class="site-header"')
    assertNotContains(headerHtml, '<img', 'Header renders an unserved logo image')
    assertNotContains(headerHtml, 'logo.svg', 'Header references the unserved logo asset')
  })

  await test('PWA manifest remains', () => {
    assertContains(html, 'rel="manifest"', 'Manifest link missing')
    assertContains(html, 'install-pwa-banner', 'PWA install banner missing')
  })

  await test('Service worker integration remains', () => {
    assertContains(html, "navigator.serviceWorker.register('/sw-albasie.js'", 'Service worker registration missing')
  })

  await test('Mobile nav integration remains', () => {
    assertContains(html, 'class="mobile-nav-toggle"', 'Mobile nav toggle missing')
    assertContains(html, 'aria-controls="nav-menu"', 'Mobile nav toggle aria-controls missing')
    assertContains(html, 'aria-expanded="false"', 'Mobile nav toggle aria-expanded missing')
  })

  await test('#inicio remains valid', () => {
    assertContains(html, '<section class="hero" id="inicio">', 'Hero anchor target missing')
    assertContains(html, '<a href="#inicio">Inicio</a>', 'Inicio nav link missing')
  })

  await test('#contacto remains valid', () => {
    assertContains(html, '<section class="contact" id="contacto">', 'Contact anchor target missing')
    assertContains(html, '<a href="#contacto">Contacto</a>', 'Contacto nav link missing')
  })

  await test('No traveler-facing href="#" exists', () => {
    assertNotContains(html, 'href="#"', 'Dead placeholder navigation link rendered')
  })

  await test('Non-company rendering does not regress', () => {
    const destinationRender = renderer.render({ domain: 'valdi.app', path: '/' })
    return destinationRender.then((result) => {
      assert(result.success === true, `Destination render failed: ${result.error}`)
      const destHtml = buildHtml(result.presentation)
      assertContains(destHtml, '<!DOCTYPE html>', 'Destination HTML missing doctype')
      assertContains(destHtml, 'site-header', 'Destination header missing')
      assertContains(destHtml, '<section class="hero"', 'Destination hero missing')
    })
  })

  await test('Missing WhatsApp gracefully omits the CTA', () => {
    const noWhatsappHtml = buildHtml(buildSyntheticPresentation({
      contact: { email: 'hola@ejemplo.cl', phone: '+56 9 5555 6666', address: 'Calle Ejemplo 456, Valdivia, Los Ríos' }
    }))
    assertNotContains(noWhatsappHtml, 'class="hero-btn hero-btn-primary"', 'Primary WhatsApp CTA rendered without whatsapp data')
    assertNotContains(noWhatsappHtml, 'wa.me/', 'wa.me link rendered without whatsapp data')
    assertContains(noWhatsappHtml, 'class="hero-btn hero-btn-secondary"', 'Secondary call CTA wrongly omitted when phone present')
  })

  await test('Missing phone gracefully omits the CTA', () => {
    const noPhoneHtml = buildHtml(buildSyntheticPresentation({
      contact: { email: 'hola@ejemplo.cl', whatsapp: '+56955556666', address: 'Calle Ejemplo 456, Valdivia, Los Ríos' }
    }))
    assertNotContains(noPhoneHtml, 'class="hero-btn hero-btn-secondary"', 'Secondary call CTA rendered without phone data')
    assertNotContains(noPhoneHtml, 'tel:', 'tel: link rendered without phone data')
    assertContains(noPhoneHtml, 'class="hero-btn hero-btn-primary"', 'Primary WhatsApp CTA wrongly omitted when whatsapp present')
  })

  await test('Missing social gracefully omits social block', () => {
    const noSocialHtml = buildHtml(buildSyntheticPresentation({ social: {} }))
    assertNotContains(noSocialHtml, 'class="social-links"', 'Social block rendered without social data')
  })

  await test('Configured contact.hours renders the real supplied value', () => {
    const hoursHtml = buildHtml(buildSyntheticPresentation({
      contact: {
        email: 'hola@ejemplo.cl',
        phone: '+56 9 5555 6666',
        whatsapp: '+56955556666',
        address: 'Calle Ejemplo 456, Valdivia, Los Ríos',
        hours: 'Lunes a Viernes, 09:00 - 18:00'
      }
    }))
    assertContains(hoursHtml, '<strong>Hours:</strong> Lunes a Viernes, 09:00 - 18:00', 'Configured hours value not rendered verbatim')
    assertContains(hoursHtml, 'class="contact-info-row"', 'Hours not rendered as a contact-info row')
    assertNotContains(hoursHtml, '<a class="contact-info-row"', 'Hours must stay informational, not interactive')
  })

  await test('Contact section renders when hours is the only contact information', () => {
    const hoursOnlyHtml = buildHtml(buildSyntheticPresentation({
      contact: { hours: 'Lun a Vie, 09:00 - 18:00' },
      social: {}
    }))
    assertContains(hoursOnlyHtml, '<section class="contact" id="contacto">', 'Contact section omitted when hours is the only contact info')
    assertContains(hoursOnlyHtml, '<strong>Hours:</strong> Lun a Vie, 09:00 - 18:00', 'Hours-only contact value not rendered')
    assertNotContains(hoursOnlyHtml, 'class="contact-actions"', 'Contact actions rendered without action data')
    assertNotContains(hoursOnlyHtml, 'class="social-links"', 'Social block rendered without social data')
  })

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-4 — TEST RESULTS')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n  Passed: ', passCount)
  console.log('  Failed: ', failCount)
  console.log('  Total:  ', passCount + failCount)
  console.log('═══════════════════════════════════════════════════════════\n')

  process.exit(failCount > 0 ? 1 : 0)
}

function extractSection(html, classNameMarker) {
  const start = html.indexOf(classNameMarker)
  if (start === -1) return ''
  const tagStart = html.lastIndexOf('<', start)
  if (tagStart === -1) return ''
  const tag = html.slice(tagStart, html.indexOf('>', start))
  const sectionStart = tagStart
  const openTag = html.slice(sectionStart, html.indexOf('>', sectionStart) + 1)
  const tagNameMatch = openTag.match(/^<(\w+)/)
  if (!tagNameMatch) return ''
  const tagName = tagNameMatch[1]
  const closing = `</${tagName}>`
  const end = html.indexOf(closing, sectionStart + openTag.length)
  if (end === -1) return ''
  return html.slice(sectionStart, end + closing.length)
}

main().catch((error) => {
  console.error('\nFatal error during test execution:', error)
  process.exit(1)
})