/**
 * MVP-FIRST-VISUAL-3 — Company Mini-App Wiring (Mobile-First)
 *
 * FIRST MOBILE-FIRST VISUAL MVP — product regression.
 *
 * Proves the rendered Albasie company experience is a coherent
 * mobile mini-app through the real configuration path:
 *   ConfigurationLoader → ApplicationPresentationRenderer
 *   → HtmlRenderer (+ component templates)
 *
 * Scope: PRODUCT/PRESENTATION/RENDERING only.
 * Guardrails:
 *   - No traveler-facing navigation link renders href="#".
 *   - Nav represents ONLY real rendered sections (same-page anchors).
 *   - Mobile nav toggle exists with correct accessibility attributes.
 *   - Contact section renders WhatsApp + social from real company data.
 *   - #main-content exists (skip-link target).
 *   - Broken/unserved logo renders company name, never a broken image.
 *   - Existing company profile data (PWA, address, email) remains intact.
 *   - Non-company renders keep the existing fallback (no regression).
 *
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

const STATUS = {
  PASS: 'pass',
  FAIL: 'fail'
}

const COMPANY_DESCRIPTION = 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile'
const COMPANY_ADDRESS = 'Calle Principal 123, Valdivia, Los Ríos'

let passCount = 0
let failCount = 0
const results = []

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, status: STATUS.PASS })
    passCount++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    results.push({ name, status: STATUS.FAIL, error: error.message })
    failCount++
    console.log(`  ✗ ${name}`)
    console.log(`    Error: ${error.message}`)
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

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker)
  if (start === -1) return ''
  const from = start + startMarker.length
  const end = html.indexOf(endMarker, from)
  if (end === -1) return ''
  return html.slice(from, end)
}

function buildHtml(presentation) {
  const htmlRenderer = createHtmlRenderer()
  return htmlRenderer.render(presentation, { domain: 'valdi.app', pathname: '/albasie', canonicalDomain: 'valdi.app' })
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-3 — COMPANY MINI-APP WIRING (MOBILE-FIRST)')
  console.log('═══════════════════════════════════════════════════════════\n')

  const configurationLoader = new ConfigurationLoader({ root: REPO_ROOT })
  await configurationLoader.initialize()

  const renderer = createApplicationPresentationRenderer({ configurationLoader })
  const renderResult = await renderer.render({ domain: 'valdi.app', path: '/albasie' })

  await test('Application presentation renders successfully', () => {
    assert(renderResult.success === true, `Render failed: ${renderResult.error}`)
    assert(renderResult.presentation, 'Presentation is missing')
  })

  const presentation = renderResult.presentation
  const html = buildHtml(presentation)

  const navHtml = extractBetween(html, '<ul class="nav-menu" id="nav-menu">', '</ul>')
  const headerHtml = extractBetween(html, '<header class="site-header">', '</header>')

  await test('Mobile nav toggle exists', () => {
    assertContains(html, 'class="mobile-nav-toggle"', 'Mobile nav toggle button missing')
    assertContains(html, '<button type="button" class="mobile-nav-toggle"', 'Toggle must be a button')
  })

  await test('Toggle accessibility attributes are correct', () => {
    assertContains(html, 'aria-expanded="false"', 'Toggle missing initial aria-expanded')
    assertContains(html, 'aria-controls="nav-menu"', 'Toggle missing aria-controls')
    assertContains(html, 'aria-label="Abrir menú"', 'Toggle missing accessible label')
  })

  await test('Nav controlled element has matching id', () => {
    assertContains(html, '<ul class="nav-menu" id="nav-menu">', 'Nav menu missing stable id')
  })

  await test('No traveler-facing navigation link renders href="#"', () => {
    assertNotContains(navHtml, 'href="#"', 'Nav link points to a dead placeholder')
  })

  await test('Absent navigation sections are NOT fabricated', () => {
    assertNotContains(navHtml, 'Servicios', 'Servicios nav item fabricated without rendered content')
    assertNotContains(navHtml, 'Portfolio', 'Portfolio nav item fabricated without rendered content')
    assertNotContains(navHtml, 'Nosotros', 'Nosotros nav item fabricated without rendered content')
  })

  await test('Navigation contains only valid same-page anchors', () => {
    const hrefs = [...navHtml.matchAll(/href="([^"]+)"/g)].map(match => match[1])
    assert(hrefs.length > 0, 'Navigation should contain at least one link')
    for (const href of hrefs) {
      assert(href.startsWith('#'), `Navigation link is not a same-page anchor: ${href}`)
    }
  })

  await test('Inicio navigation resolves to an existing same-page target', () => {
    assertContains(navHtml, '<a href="#inicio">Inicio</a>', 'Inicio nav link missing')
    assertContains(html, '<section class="hero" id="inicio">', 'Hero section missing its id target')
  })

  await test('Contact navigation resolves to an existing same-page target', () => {
    assertContains(navHtml, '<a href="#contacto">Contacto</a>', 'Contacto nav link missing')
    assertContains(html, '<section class="contact" id="contacto">', 'Contact section missing its id target')
  })

  await test('#main-content exists (skip-link target)', () => {
    assertContains(html, '<main id="main-content">', 'Main content target missing')
    assertContains(html, 'href="#main-content"', 'Skip link does not point to main-content')
  })

  await test('WhatsApp renders from real company data', () => {
    assertContains(html, 'https://wa.me/56912345678', 'WhatsApp wa.me link missing')
    assertContains(html, 'contact-action-value">+56912345678</span>', 'WhatsApp real number missing as visible action value')
  })

  await test('Social links render from real company data when present', () => {
    assertContains(html, 'https://instagram.com/albasie', 'Instagram link missing')
    assertContains(html, 'https://facebook.com/albasie', 'Facebook link missing')
    assertContains(html, 'https://tripadvisor.com/albasie', 'TripAdvisor link missing')
    assertContains(html, 'class="social-links"', 'Social links block missing')
  })

  await test('Broken/missing logo does not render a traveler-visible broken image', () => {
    assertNotContains(headerHtml, '<img', 'Header renders an unserved logo image')
    assertNotContains(headerHtml, 'logo.svg', 'Header references the unserved logo asset')
  })

  await test('Company name remains visible as branding fallback', () => {
    assert(/>\s*Albasie\s*</.test(headerHtml), 'Company name missing from header branding')
    assertContains(headerHtml, '<a href="#inicio" class="logo"', 'Header brand link missing')
  })

  await test('Existing company profile data remains rendered', () => {
    assertContains(html, '<h1>Albasie</h1>', 'Company name missing from hero')
    assertContains(html, COMPANY_DESCRIPTION, 'Company description missing')
    assertContains(html, 'mailto:info@albasie.cl', 'Contact email missing')
    assertContains(html, `Address:</strong> ${COMPANY_ADDRESS}`, 'Contact address missing')
    assertContains(html, '<p>Albasie</p>', 'Footer brand missing')
  })

  await test('PWA remains intact in rendered HTML', () => {
    assertContains(html, 'install-pwa-banner', 'PWA install banner missing')
    assertContains(html, 'id="pwa-install-btn"', 'PWA install button missing')
    assertContains(html, "navigator.serviceWorker.register('/sw-albasie.js'", 'Service worker registration missing')
    assertContains(html, 'rel="manifest"', 'Manifest link missing')
    assertContains(html, 'apple-mobile-web-app-capable', 'Apple web app meta missing')
  })

  await test('Mobile nav JS mechanism is preserved', () => {
    assertContains(html, "var toggle = document.querySelector('.mobile-nav-toggle');", 'Toggle JS wiring missing')
    assertContains(html, "var nav = document.querySelector('.nav-menu');", 'Nav JS wiring missing')
  })

  // CSS-CONTRACT (LAYOUT) REGRESSION — positioning context for the mobile
  // dropdown. A string test cannot prove browser layout; these assertions only
  // pin the positioning contract the dropdown depends on:
  //   - .site-header must establish a positioned containing block
  //     (position: relative) so .nav-menu's top:100% resolves to "just below
  //     the header", not "one full viewport down" (the MVP-3 staging bug).
  //   - the mobile .nav-menu must keep absolute positioning anchored to it.
  await test('Mobile nav dropdown has a positioned containing block (CSS contract)', () => {
    const headerBlock = extractBetween(html, '.site-header {', '}\n\n.header-container')
    assertContains(headerBlock, 'position: relative', 'site-header must be position:relative so the dropdown anchors under the header')
  })

  await test('Mobile nav dropdown keeps absolute top:100% anchoring (CSS contract)', () => {
    const mobileNavBlock = extractBetween(html, '@media (max-width: 767px)', '/* Focus styles')
    assertContains(mobileNavBlock, 'position: absolute', 'Mobile nav-menu must remain absolutely positioned')
    assertContains(mobileNavBlock, 'top: 100%', 'Mobile nav-menu top:100% must target the header bottom')
  })

  const destinationRender = await renderer.render({ domain: 'valdi.app', path: '/' })
  if (destinationRender.success) {
    const destHtml = buildHtml(destinationRender.presentation)
    const destNavHtml = extractBetween(destHtml, '<ul class="nav-menu" id="nav-menu">', '</ul>')

    await test('Non-company render keeps fallback with no dead nav links (no regression)', () => {
      assertContains(destHtml, '<!DOCTYPE html>', 'Destination HTML missing doctype')
      assertContains(destHtml, 'site-header', 'Destination header missing')
      assertContains(destHtml, 'hero', 'Destination hero missing')
      assertNotContains(destNavHtml, 'href="#"', 'Destination nav has dead placeholder links')
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-3 — TEST RESULTS')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('\n  Passed: ', passCount)
  console.log('  Failed: ', failCount)
  console.log('  Total:  ', passCount + failCount)
  console.log('═══════════════════════════════════════════════════════════\n')

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('\nFatal error during test execution:', error)
  process.exit(1)
})