/**
 * P15.3.1 Presentation Core Tests
 * 
 * Tests the Experience Presentation Core implementation.
 * Validates adapter, view model, registry, resolver, and renderer.
 */

import {
  PresentationAdapter,
  ExperienceViewModel,
  ComponentRegistry,
  ComponentResolver,
  Renderer
} from './index.js'

import { INTERNAL_FIELDS } from './presentation.adapter.js'
import { PRESENTATION_CONTRACT, validatePresentationContract } from './presentation.contract.js'

const CANONICAL_DOMAINS = [
  { hostname: 'valdi.app', destination: 'valdi', region: 'los-rios', country: 'cl' },
  { hostname: 'natales.app', destination: 'natales', region: 'magallanes', country: 'cl' },
  { hostname: 'puntaarenas.app', destination: 'puntaarenas', region: 'magallanes', country: 'cl' },
  { hostname: 'coyhaique.app', destination: 'coyhaique', region: 'aysen', country: 'cl' },
  { hostname: 'chiloe.app', destination: 'chiloe', region: 'los-lagos', country: 'cl' }
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

function assertContains(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`Assertion failed: ${message}\nArray does not contain item: ${item}`)
  }
}

async function runTests() {
  console.log('🧪 Running P15.3.1 Presentation Core Tests...\n')

  let passed = 0
  let failed = 0

  const tests = [
    testPresentationAdapterBasic,
    testPresentationAdapterFiveDestinations,
    testInternalFieldsNotExposed,
    testExperienceViewModel,
    testComponentRegistry,
    testComponentResolver,
    testRenderer,
    testDestinationIsolation,
    testModuleRendering,
    testSEOProjection,
    testContractValidation,
    testAssetPathValidation
  ]

  for (const test of tests) {
    try {
      await test()
      console.log(`✅ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

async function testPresentationAdapterBasic() {
  const adapter = new PresentationAdapter()
  
  const context = {
    platform: 'valdi',
    destination: {
      slug: 'valdi',
      name: 'Valdi',
      domain: 'valdi.app',
      country: 'cl',
      region: 'los-rios',
      experienceType: 'tourism-directory',
      categories: { tourism: { name: 'Turismo' } }
    },
    ecosystem: { id: 'valdi-platform', name: 'Valdi Platform' },
    company: {},
    experience: {
      id: 'tourism-directory',
      type: 'directory',
      name: 'Tourism Directory',
      sections: ['hero', 'categories', 'footer'],
      components: ['hero', 'category-grid', 'footer'],
      modules: ['gallery', 'maps']
    },
    modules: ['gallery', 'maps', 'notifications'],
    capabilities: ['persistence', 'media'],
    branding: {
      logo: '/assets/branding/logo.svg',
      colors: { primary: '#c8a55c', secondary: '#1a1a2e' }
    },
    theme: { mode: 'dark', borderRadius: '8px', spacing: '8px' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: { titleTemplate: 'Valdi — Turismo', descriptionTemplate: 'Desc' },
    i18n: { defaultLocale: 'es-CL' },
    maps: { provider: 'mapbox' },
    analytics: { enabled: true },
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    config: { internal: 'should not be exposed' },
    providers: { storage: 'local' }
  }

  const viewModel = adapter.adapt(context)

  assert(viewModel.identity.platform === 'valdi', 'Platform should be preserved')
  assert(viewModel.destination.slug === 'valdi', 'Destination slug should be preserved')
  assert(viewModel.experience.id === 'tourism-directory', 'Experience ID should be preserved')
  assert(viewModel.modules.includes('gallery'), 'Modules should be preserved')
}

async function testPresentationAdapterFiveDestinations() {
  const adapter = new PresentationAdapter()

  for (const domain of CANONICAL_DOMAINS) {
    const context = {
      platform: 'valdi',
      destination: {
        slug: domain.destination,
        name: domain.destination,
        domain: domain.hostname,
        country: domain.country,
        region: domain.region
      },
      ecosystem: { id: 'valdi-platform', name: 'Valdi Platform' },
      company: {},
      experience: {
        id: 'tourism-directory',
        type: 'directory',
        sections: ['hero', 'footer'],
        modules: ['gallery']
      },
      modules: ['gallery'],
      capabilities: ['persistence'],
      branding: {},
      theme: {},
      navigation: {},
      seo: {},
      i18n: {},
      maps: {},
      analytics: {},
      language: 'es',
      locale: 'es-CL',
      domain: domain.hostname
    }

    const viewModel = adapter.adapt(context)

    assertEqual(viewModel.identity.domain, domain.hostname, `${domain.hostname} domain should match`)
    assertEqual(viewModel.destination.slug, domain.destination, `${domain.hostname} destination should match`)
    assertEqual(viewModel.destination.region, domain.region, `${domain.hostname} region should match`)
    assertEqual(viewModel.destination.country, domain.country, `${domain.hostname} country should match`)
  }
}

async function testInternalFieldsNotExposed() {
  const adapter = new PresentationAdapter()

  const context = {
    platform: 'valdi',
    destination: { slug: 'valdi', name: 'Valdi', domain: 'valdi.app' },
    ecosystem: { id: 'valdi-platform' },
    company: {},
    experience: { id: 'tourism-directory', sections: [], modules: [] },
    modules: [],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    config: { database: { host: 'localhost' } },
    providers: { storage: 'local', credentials: 'secret' }
  }

  const viewModel = adapter.adapt(context)

  for (const field of INTERNAL_FIELDS) {
    assert(!(field in viewModel), `${field} should not be exposed in view model`)
  }

  const json = viewModel.toJSON ? viewModel.toJSON() : viewModel
  for (const field of INTERNAL_FIELDS) {
    assert(!(field in json), `${field} should not be exposed in JSON`)
  }
}

async function testExperienceViewModel() {
  const adapter = new PresentationAdapter()

  const context = {
    platform: 'valdi',
    destination: {
      slug: 'valdi',
      name: 'Valdi',
      experienceType: 'tourism-directory',
      contact: { email: 'test@valdi.app' }
    },
    ecosystem: { id: 'valdi-platform' },
    company: { slug: 'albasie', name: 'Albasie' },
    experience: {
      id: 'tourism-directory',
      type: 'directory',
      name: 'Tourism Directory',
      sections: ['hero', 'categories', 'footer'],
      components: ['hero', 'category-grid']
    },
    modules: ['gallery', 'maps', 'reservations'],
    capabilities: ['persistence', 'media'],
    branding: { logo: '/assets/logo.svg', colors: { primary: '#c8a55c' } },
    theme: { mode: 'dark' },
    navigation: { header: { items: [{ label: 'Home', path: '/' }] } },
    seo: { titleTemplate: '{name} — Tourism' },
    i18n: { defaultLocale: 'es-CL' },
    maps: { provider: 'mapbox' },
    analytics: { enabled: true },
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app'
  }

  const adapted = adapter.adapt(context)
  const viewModel = new ExperienceViewModel(adapted)

  assertEqual(viewModel.destinationSlug, 'valdi', 'Destination slug should be accessible')
  assertEqual(viewModel.experienceId, 'tourism-directory', 'Experience ID should be accessible')
  assertEqual(viewModel.experienceType, 'directory', 'Experience type should be accessible')
  assert(viewModel.hasModule('gallery'), 'hasModule should return true for enabled module')
  assert(!viewModel.hasModule('nonexistent'), 'hasModule should return false for disabled module')
  assert(viewModel.hasCompany(), 'hasCompany should return true when company exists')
  assert(viewModel.isResolved(), 'isResolved should return true')

  const resolvedTitle = viewModel.resolveTitle()
  assert(resolvedTitle.includes('Valdi'), 'resolveTitle should substitute destination name')

  const branding = viewModel.getBrandingColors()
  assertEqual(branding.primary, '#c8a55c', 'Branding colors should be accessible')
}

async function testComponentRegistry() {
  const registry = new ComponentRegistry()

  assert(registry.hasSection('hero'), 'Registry should have hero section')
  assert(registry.hasSection('footer'), 'Registry should have footer section')
  assert(registry.hasModule('gallery'), 'Registry should have gallery module')
  assert(registry.hasModule('maps'), 'Registry should have maps module')

  const hero = registry.getSection('hero')
  assertEqual(hero.id, 'hero', 'Section ID should match')
  assertEqual(hero.type, 'section', 'Section type should be section')

  const gallery = registry.getModule('gallery')
  assertEqual(gallery.id, 'gallery', 'Module ID should match')
  assertEqual(gallery.type, 'module', 'Module type should be module')

  const unknown = registry.getSection('nonexistent')
  assertEqual(unknown.id, 'unknown-section', 'Unknown section should return default')

  registry.registerSection('custom-section', { name: 'Custom Section' })
  assert(registry.hasSection('custom-section'), 'Custom section should be registered')

  const sections = registry.getSections(['hero', 'footer', 'nonexistent'])
  assertEqual(sections.length, 3, 'getSections should return 3 sections')
}

async function testComponentResolver() {
  const registry = new ComponentRegistry()
  const resolver = new ComponentResolver(registry)

  const viewModel = new ExperienceViewModel({
    identity: { platform: 'valdi', domain: 'valdi.app' },
    destination: { slug: 'valdi', name: 'Valdi' },
    ecosystem: { id: 'valdi-platform' },
    company: null,
    experience: {
      id: 'tourism-directory',
      type: 'directory',
      sections: ['hero', 'categories', 'footer'],
      components: []
    },
    modules: ['gallery', 'maps', 'reservations'],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    contact: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    metadata: { isResolved: true }
  })

  resolver.setViewModel(viewModel)

  const resolved = resolver.resolve()
  assertEqual(resolved.sections.length, 3, 'Should resolve 3 sections')
  assertEqual(resolved.modules.length, 3, 'Should resolve 3 modules')

  const sections = resolver.getSections()
  assertEqual(sections[0].id, 'hero', 'First section should be hero')

  const modules = resolver.getEnabledModules()
  assert(modules.length === 3, 'Should have 3 enabled modules')

  assert(resolver.isModuleEnabled('gallery'), 'gallery should be enabled')
  assert(!resolver.isModuleEnabled('nonexistent'), 'nonexistent should not be enabled')
}

async function testRenderer() {
  const registry = new ComponentRegistry()
  const resolver = new ComponentResolver(registry)
  const renderer = new Renderer(resolver)

  const viewModel = new ExperienceViewModel({
    identity: { platform: 'valdi', domain: 'valdi.app' },
    destination: { slug: 'valdi', name: 'Valdi', contact: { email: 'test@valdi.app' } },
    ecosystem: { id: 'valdi-platform' },
    company: null,
    experience: {
      id: 'tourism-directory',
      type: 'directory',
      sections: ['hero', 'categories', 'footer'],
      components: []
    },
    modules: ['gallery', 'maps'],
    capabilities: [],
    branding: { logo: '/assets/logo.svg', colors: { primary: '#c8a55c' } },
    theme: { mode: 'dark' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: { titleTemplate: '{name} — Tourism', description: 'Test description' },
    i18n: {},
    maps: {},
    analytics: {},
    contact: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    metadata: { isResolved: true }
  })

  renderer.setViewModel(viewModel)
  const rendered = renderer.render()

  assertEqual(rendered.meta.destination, 'valdi', 'Meta destination should match')
  assertEqual(rendered.sections.length, 3, 'Should render 3 sections')
  assertEqual(rendered.modules.length, 2, 'Should render 2 modules')
  assert(rendered.branding.logo === '/assets/logo.svg', 'Branding logo should be preserved')
  assert(rendered.seo.title.includes('Valdi'), 'SEO title should contain destination name')
}

async function testDestinationIsolation() {
  const adapter = new PresentationAdapter()

  const valdiContext = {
    platform: 'valdi',
    destination: { slug: 'valdi', name: 'Valdi', domain: 'valdi.app', region: 'los-rios' },
    ecosystem: { id: 'valdi-platform' },
    company: {},
    experience: { id: 'tourism-directory', sections: ['hero'], modules: ['gallery'] },
    modules: ['gallery'],
    capabilities: [],
    branding: { colors: { primary: '#c8a55c' } },
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app'
  }

  const natalesContext = {
    platform: 'valdi',
    destination: { slug: 'natales', name: 'Natales', domain: 'natales.app', region: 'magallanes' },
    ecosystem: { id: 'valdi-platform' },
    company: {},
    experience: { id: 'tourism-directory', sections: ['hero'], modules: ['gallery'] },
    modules: ['gallery'],
    capabilities: [],
    branding: { colors: { primary: '#2d5a27' } },
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'natales.app'
  }

  const valdiVM = adapter.adapt(valdiContext)
  const natalesVM = adapter.adapt(natalesContext)

  assert(valdiVM.destination.slug !== natalesVM.destination.slug, 'Destinations should be isolated')
  assert(valdiVM.branding.colors.primary !== natalesVM.branding.colors.primary, 'Branding should be isolated')
  assert(valdiVM.identity.domain !== natalesVM.identity.domain, 'Domains should be isolated')
}

async function testModuleRendering() {
  const registry = new ComponentRegistry()
  const resolver = new ComponentResolver(registry)

  const viewModelWithGallery = new ExperienceViewModel({
    identity: { platform: 'valdi', domain: 'valdi.app' },
    destination: { slug: 'valdi', name: 'Valdi' },
    ecosystem: { id: 'valdi-platform' },
    company: null,
    experience: { id: 'tourism-directory', sections: [], modules: [] },
    modules: ['gallery', 'maps'],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    contact: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    metadata: { isResolved: true }
  })

  const viewModelWithoutGallery = new ExperienceViewModel({
    identity: { platform: 'valdi', domain: 'valdi.app' },
    destination: { slug: 'valdi', name: 'Valdi' },
    ecosystem: { id: 'valdi-platform' },
    company: null,
    experience: { id: 'tourism-directory', sections: [], modules: [] },
    modules: ['maps'],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    contact: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    metadata: { isResolved: true }
  })

  resolver.setViewModel(viewModelWithGallery)
  let resolved = resolver.resolve()
  assert(resolved.modules.some(m => m.id === 'gallery'), 'Gallery module should be rendered when enabled')

  resolver.setViewModel(viewModelWithoutGallery)
  resolved = resolver.resolve()
  assert(!resolved.modules.some(m => m.id === 'gallery'), 'Gallery module should NOT be rendered when disabled')
}

async function testSEOProjection() {
  const adapter = new PresentationAdapter()

  const context = {
    platform: 'valdi',
    destination: { slug: 'valdi', name: 'Valdi', domain: 'valdi.app' },
    ecosystem: { id: 'valdi-platform' },
    company: {},
    experience: { id: 'tourism-directory', sections: [], modules: [] },
    modules: [],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {
      titleTemplate: '{name} — Tourism Directory',
      descriptionTemplate: 'Discover tourism in {name}',
      keywords: ['tourism', 'chile', 'valdivia'],
      ogImage: '/assets/og-valdi.jpg'
    },
    i18n: {},
    maps: {},
    analytics: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app'
  }

  const viewModel = adapter.adapt(context)
  const vm = new ExperienceViewModel(viewModel)

  const seo = vm.getSEO()
  assert(seo.titleTemplate === '{name} — Tourism Directory', 'SEO titleTemplate should be preserved')
  assert(seo.descriptionTemplate === 'Discover tourism in {name}', 'SEO descriptionTemplate should be preserved')
  assertContains(seo.keywords, 'tourism', 'SEO keywords should be preserved')
  assert(seo.ogImage === '/assets/og-valdi.jpg', 'SEO ogImage should be preserved')

  const resolvedTitle = vm.resolveTitle()
  assert(resolvedTitle === 'Valdi — Tourism Directory', 'resolveTitle should substitute name')
}

async function testContractValidation() {
  const adapter = new PresentationAdapter()

  const context = {
    platform: 'valdi',
    destination: { slug: 'valdi', name: 'Valdi', domain: 'valdi.app' },
    ecosystem: { id: 'valdi-platform' },
    company: {},
    experience: { id: 'tourism-directory', sections: [], modules: [] },
    modules: [],
    capabilities: [],
    branding: {},
    theme: {},
    navigation: {},
    seo: {},
    i18n: {},
    maps: {},
    analytics: {},
    language: 'es',
    locale: 'es-CL',
    domain: 'valdi.app',
    config: { internal: 'should be stripped' },
    providers: { storage: 'local' }
  }

  const viewModel = adapter.adapt(context)
  const validation = validatePresentationContract(viewModel)

  assert(validation.valid === true, 'Contract validation should pass - adapter strips internal fields')
  assert(validation.errors.length === 0, 'No validation errors should be present')

  for (const field of ['config', 'providers']) {
    assert(!(field in viewModel), `${field} should not be in viewModel after adapter processing`)
  }
}

async function testAssetPathValidation() {
  const { PresentationAdapter: PA } = await import('./presentation.adapter.js')

  assert(PA.validateAssetPath('/assets/logo.svg'), 'Valid asset path should pass')
  assert(PA.validateAssetPath('/assets/companies/cl/logo.jpg'), 'Valid nested path should pass')
  assert(!PA.validateAssetPath('../etc/passwd'), 'Traversal path should fail')
  assert(!PA.validateAssetPath('C:\\Windows\\System32'), 'Windows absolute path should fail')
  assert(!PA.validateAssetPath('http://evil.com'), 'External URL should fail')
  assert(!PA.validateAssetPath(''), 'Empty path should fail')
  assert(!PA.validateAssetPath(null), 'Null path should fail')
}

export { runTests }

runTests().then(result => {
  console.log(`\nP15.3.1 Presentation Core: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
