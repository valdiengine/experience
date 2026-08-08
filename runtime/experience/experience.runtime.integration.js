/**
 * Experience Runtime Integration
 * 
 * Wraps the Experience Engine for integration with the Runtime.
 * Follows the same pattern as AuthRuntimeIntegration and CmsRuntimeIntegration.
 */

import { ExperienceEngine } from '../../experience/experience.engine.js'
import { ProductResolver } from '../../experience/resolver/product.resolver.js'
import { EcosystemResolver } from '../../experience/resolver/ecosystem.resolver.js'
import { ModuleResolver } from '../../experience/resolver/module.resolver.js'
import { CapabilityResolver } from '../../experience/resolver/capability.resolver.js'
import { ConfigurationLoader } from '../../experience/loader/configuration.loader.js'
import { ExperienceLoader } from '../../experience/loader/experience.loader.js'
import { ExperienceComposer } from '../../experience/composition/experience.composer.js'
import { ExperienceEngineError, ExperienceCompositionError } from '../../experience/experience.errors.js'
import { EXPERIENCE_EVENTS } from '../../experience/experience.events.js'

export const EXPERIENCE_RUNTIME_EVENTS = {
  RUNTIME_EXPERIENCE_INITIALIZED: 'runtime:experience:initialized',
  RUNTIME_EXPERIENCE_ERROR: 'runtime:experience:error',
  RUNTIME_EXPERIENCE_SHUTDOWN: 'runtime:experience:shutdown',
  EXPERIENCE_RESOLUTION_STARTED: 'runtime:experience:resolution:started',
  EXPERIENCE_RESOLUTION_COMPLETED: 'runtime:experience:resolution:completed',
  EXPERIENCE_RESOLUTION_FAILED: 'runtime:experience:resolution:failed',
}

function createExperienceRuntimeEvent(type, data = {}) {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...data
  }
}

export class ExperienceRuntimeIntegration {
  #engine = null
  #eventBus = null
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = {
      debug: false,
      cacheEnabled: true,
      defaultLocale: 'es-CL',
      defaultLanguage: 'es',
      ...config
    }
  }

  get engine() {
    return this.#engine
  }

  get initialized() {
    return this.#initialized
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    return this
  }

  async initialize() {
    if (this.#initialized) {
      return
    }

    try {
      this.#engine = new ExperienceEngine({
        debug: this.#config.debug,
        cacheEnabled: this.#config.cacheEnabled,
        defaultLocale: this.#config.defaultLocale,
        defaultLanguage: this.#config.defaultLanguage,
      })

      if (this.#eventBus) {
        this.#engine.setEventBus(this.#eventBus)
      }

      this.#engine.registerResolver('product', new ProductResolver())
      this.#engine.registerResolver('ecosystem', new EcosystemResolver())
      this.#engine.registerResolver('module', new ModuleResolver())
      this.#engine.registerResolver('capability', new CapabilityResolver())

      this.#engine.registerLoader('configuration', new ConfigurationLoader())
      this.#engine.registerLoader('experience', new ExperienceLoader())

      this.#engine.setComposition(new ExperienceComposer())

      await this.#engine.initialize()
      await this.#engine.start()

      this.#initialized = true

      this.#emit(EXPERIENCE_RUNTIME_EVENTS.RUNTIME_EXPERIENCE_INITIALIZED, {
        status: 'initialized',
        destinations: ['valdi', 'natales', 'puntaarenas', 'coyhaique', 'chiloe']
      })

      return true
    } catch (err) {
      this.#emit(EXPERIENCE_RUNTIME_EVENTS.RUNTIME_EXPERIENCE_ERROR, {
        error: err.message
      })
      throw new ExperienceEngineError(`Failed to initialize experience runtime: ${err.message}`, {
        error: err.message
      })
    }
  }

  async shutdown() {
    if (!this.#initialized) {
      return
    }

    try {
      await this.#engine.stop()
      this.#initialized = false
      this.#emit(EXPERIENCE_RUNTIME_EVENTS.RUNTIME_EXPERIENCE_SHUTDOWN, {
        timestamp: Date.now()
      })
    } catch (err) {
      this.#emit(EXPERIENCE_RUNTIME_EVENTS.RUNTIME_EXPERIENCE_ERROR, {
        error: err.message
      })
    }
  }

  async resolve(request) {
    if (!this.#initialized) {
      throw new ExperienceEngineError('Experience Engine not initialized')
    }

    this.#emit(EXPERIENCE_RUNTIME_EVENTS.EXPERIENCE_RESOLUTION_STARTED, {
      hostname: request.hostname || request.domain
    })

    try {
      const result = await this.#engine.resolveAndCompose(request)

      this.#emit(EXPERIENCE_RUNTIME_EVENTS.EXPERIENCE_RESOLUTION_COMPLETED, {
        destination: result.destination?.slug,
        domain: request.hostname || request.domain
      })

      return result
    } catch (err) {
      this.#emit(EXPERIENCE_RUNTIME_EVENTS.EXPERIENCE_RESOLUTION_FAILED, {
        error: err.message,
        hostname: request.hostname || request.domain
      })
      throw err
    }
  }

  health() {
    return {
      status: this.#initialized ? 'healthy' : 'unhealthy',
      engine: this.#initialized ? 'running' : 'stopped',
      destinations: ['valdi', 'natales', 'puntaarenas', 'coyhaique', 'chiloe']
    }
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createExperienceRuntimeEvent(event, data))
    }
  }
}

export default ExperienceRuntimeIntegration
