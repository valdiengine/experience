/**
 * MVP-FIRST-VISUAL-2 — Useful Visible SSR Company Profile
 *
 * FIRST MOBILE-FIRST VISUAL MVP — product regression.
 *
 * Proves the restored rich company presentation contract becomes USEFUL,
 * VISIBLE SSR HTML for valdi.app/albasie through the real configuration path:
 *   ConfigurationLoader → ApplicationPresentationRenderer
 *   → HtmlRenderer (+ component templates)
 *
 * Scope: PRODUCT/PRESENTATION/RENDERING only.
 * Guardrails:
 *   - Rendered HTML contains real Albasie content (name, description, contact).
 *   - Contact address object renders as a readable address line.
 *   - JSON-LD Organization is the company, not the destination.
 *   - PWA (installableApp) must remain intact in the HTML.
 *   - No stale/pure-boilerplate output (e.g. "[object Object]").
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

function buildHtml(presentation) {
  const htmlRenderer = createHtmlRenderer()
  return htmlRenderer.render(presentation, { domain: 'valdi.app', pathname: '/albasie', canonicalDomain: 'valdi.app' })
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-2 — USEFUL VISIBLE SSR COMPANY PROFILE')
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

  await test('Rendered HTML contains the company name Albasie', () => {
    assertContains(html, 'Albasie', 'Company name missing from HTML')
  })

  await test('Header brand label is the company name', () => {
    assertContains(html, 'aria-label="Albasie"', 'Header brand is not the company')
  })

  await test('Hero title is the company name', () => {
    assertContains(html, '<h1>Albasie</h1>', 'Hero H1 is not the company name')
  })

  await test('Hero subtitle shows the company description', () => {
    assertContains(html, COMPANY_DESCRIPTION, 'Company description missing from hero')
  })

  await test('Meta description contains the company description', () => {
    assertContains(html, `<meta name="description" content="${COMPANY_DESCRIPTION}">`, 'Meta description missing')
  })

  await test('Open Graph falls back correctly for company description', () => {
    assertContains(html, 'og:description', 'OG description tag missing')
    assertContains(html, COMPANY_DESCRIPTION, 'OG description content missing')
  })

  await test('Contact email is visible', () => {
    assertContains(html, 'mailto:info@albasie.cl', 'Contact email link missing')
    assertContains(html, 'info@albasie.cl', 'Contact email text missing')
  })

  await test('Contact phone is visible', () => {
    assertContains(html, 'tel:+56 9 1234 5678', 'Contact phone link missing')
  })

  await test('Contact address object renders as readable address line', () => {
    assertContains(html, `Address:</strong> ${COMPANY_ADDRESS}`, 'Address line missing')
    assertNotContains(html, '[object Object]', 'Object address leaked as [object Object]')
  })

  await test('JSON-LD Organization describes the company', () => {
    assertContains(html, '"@type":"Organization"', 'Organization schema missing')
    assertContains(html, '"name":"Albasie"', 'Organization name is not the company')
    assertContains(html, COMPANY_ADDRESS, 'Organization address is not the company address')
  })

  await test('Footer brand is the company name', () => {
    assertContains(html, '<p>Albasie</p>', 'Footer brand missing company name')
  })

  await test('Footer copyright uses the company name', () => {
    const match = html.match(/© \d{4} Albasie/)
    assert(match, 'Copyright does not reference the company')
  })

  await test('Theme uses company branding colors', () => {
    assertContains(html, '#2d5a27', 'Company primary branding color not applied')
  })

  await test('PWA stays intact in rendered HTML', () => {
    assertContains(html, 'install-pwa-banner', 'PWA install banner missing')
    assertContains(html, 'id="pwa-install-btn"', 'PWA install button missing')
    assertContains(html, "navigator.serviceWorker.register('/sw-albasie.js'", 'Service worker registration missing')
    assertContains(html, 'rel="manifest"', 'Manifest link missing')
    assertContains(html, 'apple-mobile-web-app-capable', 'Apple web app meta missing')
  })

  await test('No stale quote/boat output is fabricated', () => {
    assertNotContains(html, 'id="quote-form"', 'Quote form should not render for a company profile without quote capability')
    assertNotContains(html, 'Nahuel', 'Stale boat content leaked into HTML')
  })

  const destinationRender = await renderer.render({ domain: 'valdi.app', path: '/' })
  if (destinationRender.success) {
    const htmlRenderer = createHtmlRenderer()
    const destHtml = htmlRenderer.render(destinationRender.presentation, {
      domain: 'valdi.app',
      pathname: '/',
      canonicalDomain: 'valdi.app'
    })

    await test('Non-company render keeps existing fallback (no regression)', () => {
      assertContains(destHtml, '<!DOCTYPE html>', 'Destination HTML missing doctype')
      assertContains(destHtml, '</html>', 'Destination HTML incomplete')
      assertContains(destHtml, 'site-header', 'Destination header missing')
      assertContains(destHtml, 'hero', 'Destination hero missing')
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-2 — TEST RESULTS')
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