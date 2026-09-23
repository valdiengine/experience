/**
 * MVP-FIRST-VISUAL-1 — Rich Company Configuration Contract
 *
 * FIRST MOBILE-FIRST VISUAL MVP — product regression.
 *
 * Proves the full chain preserves the rich company configuration contract:
 *   FilesystemConfigurationSource → ConfigurationLoader → ApplicationResolver
 *   → routeData → ApplicationConfigLoader → ApplicationSchema
 *   → RuntimeApplicationAssembly → ApplicationPresentationContext
 *   → ApplicationPresentationAdapter
 *
 * Scope: PRODUCT/CONFIGURATION/PRESENTATION only.
 * Guardrails:
 *   - No infrastructure/provider objects may reach the presentation contract.
 *   - company-profile experienceType must survive to applicationConfig.experience.type
 *     and to the presentation experience.
 *   - PWA (installableApp) must not regress.
 *
 * Framework-free implementation.
 */

import path from 'path'
import { fileURLToPath } from 'url'

import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'
import { createApplicationResolver } from './application/application.resolver.js'
import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

const STATUS = {
  PASS: 'pass',
  FAIL: 'fail'
}

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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) {
    throw new Error(`${message} - Expected ${b}, got ${a}`)
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-1 — RICH COMPANY CONFIGURATION CONTRACT')
  console.log('═══════════════════════════════════════════════════════════\n')

  const configurationLoader = new ConfigurationLoader({ root: REPO_ROOT })
  await configurationLoader.initialize()

  const renderer = createApplicationPresentationRenderer({ configurationLoader })
  const resolver = createApplicationResolver({ configurationLoader })

  const result = await renderer.render({
    domain: 'valdi.app',
    path: '/albasie'
  })

  await test('Full pipeline renders successfully', () => {
    assert(result.success === true, `Render failed: ${result.error}`)
    assert(result.presentation, 'Presentation result is missing')
  })

  const applicationConfig = resolver.resolve({ domain: 'valdi.app', path: '/albasie' }).resolved?.configuration

  await test('applicationConfig.company.slug is albasie', () => {
    assert(applicationConfig, 'Application config is missing')
    assertEqual(applicationConfig.company.slug, 'albasie', 'Company slug')
  })

  await test('applicationConfig.company.enabled is true', () => {
    assertEqual(applicationConfig.company.enabled, true, 'Company enabled')
  })

  await test('applicationConfig.company.name is preserved', () => {
    assertEqual(applicationConfig.company.name, 'Albasie', 'Company name')
  })

  await test('applicationConfig.company.type is preserved', () => {
    assertEqual(applicationConfig.company.type, 'tourism-operator', 'Company type')
  })

  await test('applicationConfig.company.description is preserved', () => {
    assertEqual(
      applicationConfig.company.description,
      'Operador turístico especializado en experiencias patrimoniales en el sur de Chile',
      'Company description'
    )
  })

  await test('applicationConfig.company.destination is preserved', () => {
    assertEqual(applicationConfig.company.destination, 'valdi', 'Company destination')
  })

  await test('applicationConfig.company.branding is preserved', () => {
    assert(applicationConfig.company.branding, 'Company branding missing')
    assertEqual(applicationConfig.company.branding.colors.primary, '#2d5a27', 'Branding primary color')
  })

  await test('applicationConfig.company.contact is preserved', () => {
    assert(applicationConfig.company.contact, 'Company contact missing')
    assertEqual(applicationConfig.company.contact.email, 'info@albasie.cl', 'Contact email')
  })

  await test('applicationConfig.company.social is preserved', () => {
    assert(applicationConfig.company.social, 'Company social missing')
    assert(applicationConfig.company.social.instagram, 'Social instagram missing')
  })

  await test('applicationConfig.company.enabledCategories is preserved', () => {
    assertDeepEqual(applicationConfig.company.enabledCategories, ['tourism', 'events'], 'Enabled categories')
  })

  await test('applicationConfig.company.enabledModules is preserved', () => {
    assertDeepEqual(
      applicationConfig.company.enabledModules,
      ['reservations', 'availability', 'gallery', 'media', 'notifications'],
      'Enabled modules'
    )
  })

  await test('applicationConfig.experience.type is company-profile', () => {
    assertEqual(applicationConfig.experience.type, 'company-profile', 'Experience type')
  })

  await test('No infrastructure/provider objects leak into company contract', () => {
    assert(!('providers' in applicationConfig.company), 'providers leaked into company contract')
    assert(!('team' in applicationConfig.company), 'team leaked into company contract')
    assert(!('catalog' in applicationConfig.company), 'catalog leaked into company contract')
  })

  const presentation = result.presentation

  await test('presentation.company.name is Albasie', () => {
    assertEqual(presentation.company.name, 'Albasie', 'Presentation company name')
  })

  await test('presentation.company.contact.email is preserved', () => {
    assert(presentation.company.contact, 'Presentation company contact missing')
    assertEqual(presentation.company.contact.email, 'info@albasie.cl', 'Presentation contact email')
  })

  await test('presentation.company.branding.colors.primary is preserved', () => {
    assert(presentation.company.branding, 'Presentation company branding missing')
    assertEqual(presentation.company.branding.colors.primary, '#2d5a27', 'Presentation branding primary')
  })

  await test('presentation.company.enabledCategories is preserved', () => {
    assertDeepEqual(presentation.company.enabledCategories, ['tourism', 'events'], 'Presentation enabled categories')
  })

  await test('presentation.company.enabledModules is preserved', () => {
    assertDeepEqual(
      presentation.company.enabledModules,
      ['reservations', 'availability', 'gallery', 'media', 'notifications'],
      'Presentation enabled modules'
    )
  })

  await test('presentation.company.social is preserved', () => {
    assert(presentation.company.social, 'Presentation company social missing')
    assert(presentation.company.social.instagram, 'Presentation social instagram missing')
  })

  await test('presentation.experience.type is company-profile', () => {
    assert(presentation.experience, 'Presentation experience missing')
    assertEqual(presentation.experience.type, 'company-profile', 'Presentation experience type')
  })

  await test('PWA (installableApp) still enabled', () => {
    assert(presentation.pwa, 'Presentation pwa missing')
    assertEqual(presentation.pwa.enabled, true, 'PWA enabled')
    assertEqual(presentation.pwa.canInstall, true, 'PWA canInstall')
    assertEqual(presentation.pwa.config.name, 'Albasie - Experiencias Patrimoniales', 'PWA manifest name')
  })

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MVP-FIRST-VISUAL-1 — TEST RESULTS')
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