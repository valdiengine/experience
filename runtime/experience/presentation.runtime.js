/**
 * Presentation Runtime
 * 
 * P15.3.3 - Integrates Experience Engine with Presentation Layer.
 * 
 * Complete pipeline:
 *   Request → ExperienceRuntimeIntegration → ExperienceContext
 *                                                  ↓
 *                              PresentationAdapter → ExperienceViewModel
 *                                                          ↓
 *                                         ComponentResolver → Components
 *                                                          ↓
 *                                                          Renderer
 *                                                          ↓
 *                                               Rendered Presentation
 */

import { ExperienceRuntimeIntegration } from './experience.runtime.integration.js'
import {
  PresentationAdapter,
  ExperienceViewModel,
  ComponentRegistry,
  ComponentResolver,
  Renderer
} from '../../experience/presentation/index.js'

export const PRESENTATION_RUNTIME_EVENTS = {
  PRESENTATION_STARTED: 'presentation:started',
  PRESENTATION_ADAPTED: 'presentation:adapted',
  PRESENTATION_COMPONENTS_RESOLVED: 'presentation:components:resolved',
  PRESENTATION_RENDERED: 'presentation:rendered',
  PRESENTATION_COMPLETED: 'presentation:completed',
  PRESENTATION_FAILED: 'presentation:failed'
}

export class PresentationRuntimeError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'PresentationRuntimeError'
    this.context = context
  }
}

export class PresentationRuntime {
  #experienceIntegration = null
  #presentationAdapter = null
  #componentRegistry = null
  #componentResolver = null
  #renderer = null
  #initialized = false
  #eventBus = null
  #requestId = 0

  constructor(config = {}) {
    this.#experienceIntegration = new ExperienceRuntimeIntegration({
      debug: config.debug || false,
      cacheEnabled: config.cacheEnabled !== false,
      defaultLocale: config.defaultLocale || 'es-CL',
      defaultLanguage: config.defaultLanguage || 'es'
    })

    this.#presentationAdapter = new PresentationAdapter()
    this.#componentRegistry = new ComponentRegistry()
    this.#componentResolver = new ComponentResolver(this.#componentRegistry)
    this.#renderer = new Renderer(this.#componentResolver)

    this.#eventBus = config.eventBus || null
  }

  get initialized() {
    return this.#initialized
  }

  get experience() {
    return this.#experienceIntegration
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    if (this.#experienceIntegration) {
      this.#experienceIntegration.setEventBus(eventBus)
    }
    return this
  }

  async initialize() {
    if (this.#initialized) {
      return
    }

    try {
      await this.#experienceIntegration.initialize()
      this.#initialized = true

      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_STARTED, {
        status: 'initialized',
        destinations: ['valdi', 'natales', 'puntaarenas', 'coyhaique', 'chiloe']
      })

      return true
    } catch (error) {
      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_FAILED, {
        error: error.message
      })
      throw new PresentationRuntimeError(`Failed to initialize presentation runtime: ${error.message}`)
    }
  }

  async shutdown() {
    if (!this.#initialized) {
      return
    }

    await this.#experienceIntegration.shutdown()
    this.#initialized = false
  }

  async render(request) {
    if (!this.#initialized) {
      throw new PresentationRuntimeError('Presentation runtime not initialized')
    }

    const requestId = ++this.#requestId
    const startTime = Date.now()

    this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_STARTED, {
      requestId,
      hostname: request.hostname || request.domain
    })

    try {
      const context = await this.#experienceIntegration.resolve(request)

      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_ADAPTED, {
        requestId,
        destination: context.destination?.slug
      })

      const adapted = this.#presentationAdapter.adapt(context)
      const viewModel = new ExperienceViewModel(adapted)

      this.#componentResolver.setViewModel(viewModel)
      this.#renderer.setViewModel(viewModel)

      const resolved = this.#componentResolver.resolve()
      const rendered = this.#renderer.render()

      const presentation = {
        requestId,
        metadata: {
          destination: viewModel.destinationSlug,
          destinationName: viewModel.destinationName,
          domain: viewModel.domain,
          experience: viewModel.experienceId,
          experienceType: viewModel.experienceType,
          language: viewModel.language,
          locale: viewModel.locale,
          isResolved: viewModel.isResolved(),
          hasCompany: viewModel.hasCompany(),
          componentCount: resolved.components?.length || resolved.sections?.length || 0,
          moduleCount: resolved.modules?.length || 0,
          renderDuration: Date.now() - startTime
        },
        identity: viewModel.identity,
        destination: viewModel.destination,
        ecosystem: viewModel.ecosystem,
        company: viewModel.company,
        experience: viewModel.experience,
        modules: resolved.modules,
        capabilities: viewModel.capabilities,
        branding: rendered.branding,
        theme: viewModel.theme,
        navigation: rendered.navigation,
        seo: rendered.seo,
        i18n: viewModel.i18n,
        maps: viewModel.maps,
        analytics: viewModel.analytics,
        contact: rendered.contact,
        sections: resolved.sections,
        components: this.#buildComponentTree(resolved, viewModel),
        rendered: {
          branding: rendered.branding,
          navigation: rendered.navigation,
          seo: rendered.seo,
          contact: rendered.contact
        }
      }

      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_COMPONENTS_RESOLVED, {
        requestId,
        sectionCount: resolved.sections?.length || 0,
        moduleCount: resolved.modules?.length || 0
      })

      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_RENDERED, {
        requestId,
        destination: viewModel.destinationSlug,
        duration: Date.now() - startTime
      })

      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_COMPLETED, {
        requestId,
        destination: viewModel.destinationSlug,
        totalDuration: Date.now() - startTime
      })

      return presentation
    } catch (error) {
      this.#emit(PRESENTATION_RUNTIME_EVENTS.PRESENTATION_FAILED, {
        requestId,
        error: error.message,
        duration: Date.now() - startTime
      })
      throw new PresentationRuntimeError(`Presentation rendering failed: ${error.message}`, {
        requestId,
        error: error.message
      })
    }
  }

  #buildComponentTree(resolved, viewModel) {
    const components = []

    for (const section of (resolved.sections || [])) {
      components.push({
        id: section.id,
        name: section.name,
        type: 'section',
        rendered: true
      })
    }

    for (const module of (resolved.modules || [])) {
      components.push({
        id: module.id,
        name: module.name,
        type: 'module',
        rendered: true
      })
    }

    return components
  }

  async health() {
    return {
      status: this.#initialized ? 'healthy' : 'unhealthy',
      experience: this.#experienceIntegration?.health(),
      presentation: {
        initialized: this.#initialized,
        adapter: !!this.#presentationAdapter,
        registry: !!this.#componentRegistry,
        resolver: !!this.#componentResolver,
        renderer: !!this.#renderer
      }
    }
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, {
        type: event,
        timestamp: new Date().toISOString(),
        ...data
      })
    }
  }
}

export default PresentationRuntime
