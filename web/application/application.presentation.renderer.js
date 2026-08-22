/**
 * Application Presentation Renderer
 *
 * P15.8.4 - Application Presentation Runtime Integration
 *
 * Orchestrates the complete application presentation pipeline:
 * 1. ApplicationResolver → resolves request to RuntimeApplication
 * 2. RuntimeApplicationAssembly → assembles runtime context
 * 3. ApplicationPresentationContext → transforms for presentation
 * 4. ApplicationPresentationAdapter → adapts to view model
 * 5. Returns presentation-safe result
 *
 * Does NOT render HTML directly.
 * Does NOT access WordPress.
 * Does NOT access databases.
 * Does NOT access storage.
 *
 * Framework-free implementation.
 */

import { ApplicationResolver, createApplicationResolver } from './application.resolver.js'
import { RuntimeApplicationAssembly, createRuntimeAssembly, RENDERING_MODE } from './application.runtime.js'
import { ApplicationPresentationContext, createApplicationPresentationContext } from './application.presentation.js'
import { ApplicationPresentationAdapter, createApplicationPresentationAdapter } from './application.presentation.adapter.js'

export { RENDERING_MODE }

export class ApplicationPresentationRenderer {
  #resolver
  #assembly
  #presentationContext
  #adapter
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    const resolverOptions = this.#options.configurationLoader
      ? { configurationLoader: this.#options.configurationLoader }
      : {}
    this.#resolver = options.resolver || createApplicationResolver(resolverOptions)
    this.#assembly = options.assembly || createRuntimeAssembly(this.#resolver)
    this.#adapter = options.adapter || createApplicationPresentationAdapter()
  }

  async render(request) {
    const startTime = Date.now()

    const assemblyResult = this.#assembly.assemble(request)

    if (!assemblyResult.success) {
      return {
        success: false,
        error: assemblyResult.error,
        presentation: null
      }
    }

    const runtime = assemblyResult.runtime

    const context = createApplicationPresentationContext(runtime)
    const adapted = this.#adapter.adapt(context)

    const validation = ApplicationPresentationAdapter.validateRenderingContext(adapted)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid rendering context: ${validation.errors.join('; ')}`,
        presentation: null
      }
    }

    const presentation = {
      success: true,
      error: null,
      presentation: Object.freeze({
        identity: adapted.identity,
        destination: adapted.destination,
        ecosystem: adapted.ecosystem,
        company: adapted.company,
        experience: adapted.experience,
        modules: adapted.modules,
        capabilities: adapted.capabilities,
        branding: adapted.branding,
        theme: adapted.theme,
        navigation: adapted.navigation,
        seo: adapted.seo,
        i18n: adapted.i18n,
        maps: adapted.maps,
        analytics: adapted.analytics,
        contact: adapted.contact,
        pwa: adapted.pwa,
        language: adapted.language,
        locale: adapted.locale,
        domain: adapted.domain,
        metadata: adapted.metadata,
        rendering: adapted.rendering,
        sections: this.#buildSections(adapted),
        components: this.#buildComponents(adapted)
      }),
      timing: {
        duration: Date.now() - startTime
      }
    }

    return presentation
  }

  #buildSections(adapted) {
    const experience = adapted.experience
    if (!experience || !experience.sections) {
      return []
    }

    return experience.sections.map(section => ({
      id: section.id,
      name: section.name,
      type: section.type,
      enabled: section.enabled ?? true
    }))
  }

  #buildComponents(adapted) {
    const sections = adapted.experience?.sections || []
    const capabilities = adapted.capabilities || []

    const components = []

    for (const section of sections) {
      if (!section.enabled) continue

      components.push({
        id: section.id,
        name: section.name,
        type: 'section',
        capability: section.id,
        rendered: true
      })
    }

    for (const capability of capabilities) {
      const capName = typeof capability === 'string' ? capability : capability.name
      const capConfig = typeof capability === 'object' ? capability : null

      if (sections.some(s => s.id === capName)) continue

      components.push({
        id: capName,
        name: this.#formatComponentName(capName),
        type: 'capability',
        capability: capName,
        configuration: capConfig?.configuration || null,
        rendered: true
      })
    }

    return components
  }

  #formatComponentName(name) {
    if (!name) return 'Component'
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  getResolver() {
    return this.#resolver
  }

  getAssembly() {
    return this.#assembly
  }

  getAdapter() {
    return this.#adapter
  }

  health() {
    return {
      status: 'healthy',
      resolver: !!this.#resolver,
      assembly: !!this.#assembly,
      adapter: !!this.#adapter
    }
  }
}

export function createApplicationPresentationRenderer(options = {}) {
  return new ApplicationPresentationRenderer(options)
}

export default {
  ApplicationPresentationRenderer,
  createApplicationPresentationRenderer,
  RENDERING_MODE
}
