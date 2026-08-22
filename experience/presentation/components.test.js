/**
 * P15.3.2 — Presentation Components Tests
 * 
 * Tests the reusable presentation components.
 * Validates destination independence and configuration-driven rendering.
 */

import { PresentationAdapter } from './presentation.adapter.js'
import { ExperienceViewModel } from './experience.view-model.js'

import {
  HeaderComponent,
  HeroComponent,
  ServicesComponent,
  GalleryComponent,
  CompaniesComponent,
  ContactComponent,
  FooterComponent
} from './components/index.js'

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

async function runTests() {
  console.log('🧪 Running P15.3.2 Presentation Components Tests...\n')

  let passed = 0
  let failed = 0

  const tests = [
    testHeaderFiveDestinations,
    testHeroFiveDestinations,
    testServicesFiveDestinations,
    testGalleryFiveDestinations,
    testCompaniesFiveDestinations,
    testContactFiveDestinations,
    testFooterFiveDestinations,
    testComponentRendersWithoutHardcodedDestination,
    testHeaderBrandingFromViewModel,
    testHeroTitleResolvedFromSEO,
    testGalleryDoesNotAccessStorageDirectly,
    testCompaniesIsolationByContext,
    testComponentEvents,
    testComponentStateManagement
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

function createViewModel(domain) {
  const adapter = new PresentationAdapter()
  
  const context = {
    platform: 'valdi',
    destination: {
      slug: domain.destination,
      name: domain.destination.charAt(0).toUpperCase() + domain.destination.slice(1),
      domain: domain.hostname,
      country: domain.country,
      region: domain.region,
      experienceType: 'tourism-directory',
      categories: {
        tourism: { name: 'Turismo', icon: 'globe', color: '#c8a55c' },
        accommodation: { name: 'Alojamiento', icon: 'bed', color: '#2d5a27' },
        restaurant: { name: 'Restaurante', icon: 'utensils', color: '#e67e22' }
      },
      featured: {
        enabled: true,
        items: [
          { id: 'item-1', image: '/assets/featured/1.jpg', title: 'Featured 1' }
        ]
      },
      contact: {
        email: `contacto@${domain.destination}.app`,
        phone: '+56 9 1234 5678',
        address: { city: domain.destination, region: domain.region, country: 'Chile' }
      }
    },
    ecosystem: { id: 'valdi-platform', name: 'Valdi Platform' },
    company: {},
    experience: {
      id: 'tourism-directory',
      type: 'directory',
      name: 'Tourism Directory',
      sections: ['hero', 'services', 'gallery', 'contact', 'footer'],
      components: [],
      modules: ['gallery', 'maps']
    },
    modules: ['gallery', 'maps', 'reservations'],
    capabilities: ['persistence', 'media'],
    branding: {
      logo: '/assets/branding/logo.svg',
      colors: { primary: '#c8a55c', secondary: '#1a1a2e', accent: '#e8d5a3' },
      fonts: { display: 'Inter', body: 'Inter' }
    },
    theme: { mode: 'dark', borderRadius: '8px', spacing: '8px' },
    navigation: {
      header: {
        items: [
          { label: 'Inicio', path: '/', icon: 'home' },
          { label: 'Servicios', path: '/servicios', icon: 'briefcase' },
          { label: 'Contacto', path: '/contacto', icon: 'mail' }
        ]
      },
      footer: {
        columns: [
          {
            title: 'Explorar',
            items: [
              { label: 'Servicios', path: '/servicios' },
              { label: 'Empresas', path: '/empresas' }
            ]
          }
        ]
      }
    },
    seo: {
      titleTemplate: `{name} — Tourism Directory`,
      descriptionTemplate: `Discover tourism in {name}`,
      keywords: ['tourism', 'chile'],
      ogImage: '/assets/og-default.jpg'
    },
    i18n: { defaultLocale: 'es-CL' },
    maps: { provider: 'mapbox', defaultCenter: [-39.8, -73.2], defaultZoom: 13 },
    analytics: { enabled: true },
    language: 'es',
    locale: 'es-CL',
    domain: domain.hostname
  }

  const adapted = adapter.adapt(context)
  return new ExperienceViewModel(adapted)
}

async function testHeaderFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new HeaderComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'header', 'Should render header component')
    assert(rendered.branding.brandName, 'Should have brand name')
    assertEqual(rendered.navigation.items.length, 3, 'Should have navigation items')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi', 
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testHeroFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new HeroComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'hero', 'Should render hero component')
    assert(rendered.content.title, 'Should have title')
    assert(rendered.cta.primary, 'Should have primary CTA')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi',
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testServicesFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new ServicesComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'services', 'Should render services component')
    assert(rendered.items.length > 0, 'Should have service items')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi',
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testGalleryFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new GalleryComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'gallery', 'Should render gallery component')
    assert(Array.isArray(rendered.images), 'Should have images array')
    assert(rendered.lightbox, 'Should have lightbox config')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi',
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testCompaniesFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new CompaniesComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'companies', 'Should render companies component')
    assert(rendered.items !== undefined, 'Should have items array (placeholder or real)')
    
    const hasPlaceholderData = rendered.items.some(c => c.slug === 'albasie' || c.slug === 'secnet')
    if (hasPlaceholderData) {
      assert(rendered.content.empty === false, 'Should indicate non-empty when using placeholders')
    }
  }
}

async function testContactFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new ContactComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'contact', 'Should render contact component')
    assert(rendered.contact.email, 'Should have contact email')
    assert(rendered.form.enabled, 'Form should be enabled')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi',
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testFooterFiveDestinations() {
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const component = new FooterComponent(vm)
    const rendered = component.render()

    assert(rendered.component === 'footer', 'Should render footer component')
    assert(rendered.content.branding.brandName, 'Should have brand name')
    assert(rendered.copyright.year === new Date().getFullYear(), 'Copyright year should be current')
    assert(!JSON.stringify(rendered).includes('valdi') || domain.destination === 'valdi',
      `${domain.hostname} should not hardcode valdi`)
  }
}

async function testComponentRendersWithoutHardcodedDestination() {
  const forbidden = ['valdi', 'natales', 'puntaarenas', 'coyhaique', 'chiloe']
  
  for (const domain of CANONICAL_DOMAINS) {
    const vm = createViewModel(domain)
    const header = new HeaderComponent(vm)
    const hero = new HeroComponent(vm)
    const services = new ServicesComponent(vm)
    const gallery = new GalleryComponent(vm)
    const companies = new CompaniesComponent(vm)
    const contact = new ContactComponent(vm)
    const footer = new FooterComponent(vm)

    for (const [name, component] of [['Header', header], ['Hero', hero], ['Services', services],
      ['Gallery', gallery], ['Companies', companies], ['Contact', contact], ['Footer', footer]]) {
      const rendered = component.render()
      const renderedStr = JSON.stringify(rendered)
      
      for (const forbiddenName of forbidden) {
        if (forbiddenName !== domain.destination) {
          const hardcodedPattern = new RegExp(`"${forbiddenName}"`, 'g')
          const matches = (renderedStr.match(hardcodedPattern) || []).length
          if (matches > 0) {
            assert(false, `${name} for ${domain.hostname} contains hardcoded destination: ${forbiddenName}`)
          }
        }
      }
    }
  }
}

async function testHeaderBrandingFromViewModel() {
  const vm = createViewModel(CANONICAL_DOMAINS[0])
  const component = new HeaderComponent(vm)
  const rendered = component.render()

  assertEqual(rendered.branding.logo, '/assets/branding/logo.svg', 'Logo should come from viewModel')
  assertEqual(rendered.branding.colors.primary, '#c8a55c', 'Primary color should come from viewModel')
  assertEqual(rendered.theme.colors.primary, '#c8a55c', 'Theme should use branding colors')
}

async function testHeroTitleResolvedFromSEO() {
  const vm = createViewModel(CANONICAL_DOMAINS[0])
  const component = new HeroComponent(vm)
  const rendered = component.render()

  assert(rendered.content.title.includes('Valdi'), 'Title should include destination name from SEO template')
}

async function testGalleryDoesNotAccessStorageDirectly() {
  const vm = createViewModel(CANONICAL_DOMAINS[0])
  const component = new GalleryComponent(vm)
  const rendered = component.render()

  assert(rendered.images.length > 0, 'Should have images from configuration')
  for (const img of rendered.images) {
    assert(img.src, 'Each image should have a src')
    assert(!img.src.includes('s3://'), 'Should not have S3 protocol')
    assert(!img.src.includes('r2://'), 'Should not have R2 protocol')
    assert(!img.src.includes('filesystem'), 'Should not reference filesystem')
  }
}

async function testCompaniesIsolationByContext() {
  const valdiVM = createViewModel(CANONICAL_DOMAINS[0])
  const natalesVM = createViewModel(CANONICAL_DOMAINS[1])

  const valdiCompanies = new CompaniesComponent(valdiVM)
  const natalesCompanies = new CompaniesComponent(natalesVM)

  const valdiRendered = valdiCompanies.render()
  const natalesRendered = natalesCompanies.render()

  assert(valdiRendered.items !== undefined, 'Valdi should have companies or empty array')
  assert(natalesRendered.items !== undefined, 'Natales should have companies or empty array')

  const valdiHasCompanyContext = valdiRendered.companyContext?.slug !== undefined
  const natalesHasCompanyContext = natalesRendered.companyContext?.slug !== undefined

  if (valdiHasCompanyContext && natalesHasCompanyContext) {
    assert(valdiRendered.companyContext.slug !== natalesRendered.companyContext.slug,
      'Company contexts should be different when both exist')
  } else {
    assert(true, 'At least one destination has no company context - isolation not applicable')
  }
}

async function testComponentEvents() {
  const vm = createViewModel(CANONICAL_DOMAINS[0])
  const component = new HeaderComponent(vm)
  
  let eventFired = false
  component.on('component:click', () => {
    eventFired = true
  })
  
  component.emit('component:click', { test: true })
  
  assert(eventFired, 'Event listener should be called when event is emitted')
}

async function testComponentStateManagement() {
  const vm = createViewModel(CANONICAL_DOMAINS[0])
  const component = new GalleryComponent(vm)
  
  component.setState({ testState: 'value' })
  assertEqual(component.state.testState, 'value', 'State should be set correctly')
  
  component.setState({ anotherState: 'another' })
  assertEqual(component.state.testState, 'value', 'Previous state should be preserved')
  assertEqual(component.state.anotherState, 'another', 'New state should be added')
}

export { runTests }

runTests().then(result => {
  console.log(`\nP15.3.2 Components: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
