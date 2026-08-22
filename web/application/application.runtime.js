/**
 * Application Runtime Assembly
 *
 * P15.8.3 - Application Resolver & Runtime Assembly
 *
 * Transforms a ResolvedApplication into a RuntimeApplication.
 * Assembles the context that Presentation Runtime will consume.
 *
 * Responsibilities:
 * - Validate runtime readiness
 * - Determine rendering mode (WORDPRESS/HYBRID/EXPERIENCE)
 * - Assemble runtime context
 * - Ensure immutability
 *
 * NO direct rendering.
 * NO WordPress access.
 * NO database access.
 * NO storage access.
 *
 * Framework-free implementation.
 */

import { OWNERSHIP } from '../routing/route.registry.js'
import { MIGRATION_STATE } from '../routing/route.migration.controller.js'

export const RENDERING_MODE = Object.freeze({
  WORDPRESS: 'WORDPRESS',
  HYBRID: 'HYBRID',
  EXPERIENCE: 'EXPERIENCE'
})

export const PRESENTATION_STATUS = Object.freeze({
  READY: 'READY',
  PENDING: 'PENDING',
  UNAVAILABLE: 'UNAVAILABLE'
})

export class RuntimeApplicationAssembly {
  #resolver
  #options

  constructor(resolver, options = {}) {
    if (!resolver || typeof resolver.resolve !== 'function') {
      throw new Error('ApplicationResolver is required')
    }
    this.#resolver = resolver
    this.#options = Object.freeze({ ...options })
  }

  assemble(request) {
    const resolution = this.#resolver.resolve(request)

    if (!resolution.success) {
      return {
        success: false,
        error: resolution.error,
        runtime: null
      }
    }

    const resolved = resolution.resolved

    const validation = this.#validateRuntimeReadiness(resolved)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        runtime: null
      }
    }

    const renderingMode = this.#determineRenderingMode(resolved)
    const presentationStatus = this.#determinePresentationStatus(resolved, renderingMode)

    const runtime = this.#buildRuntimeApplication(
      resolved,
      renderingMode,
      presentationStatus
    )

    return {
      success: true,
      error: null,
      runtime
    }
  }

  #validateRuntimeReadiness(resolved) {
    if (!resolved.identity) {
      return { valid: false, error: 'Application identity is missing' }
    }

    if (!resolved.identity.domain || !resolved.identity.route) {
      return { valid: false, error: 'Application identity is incomplete' }
    }

    if (!resolved.ownership || !resolved.ownership.type) {
      return { valid: false, error: 'Ownership is missing' }
    }

    if (!resolved.migrationState || !resolved.migrationState.state) {
      return { valid: false, error: 'Migration state is missing' }
    }

    if (!resolved.configuration) {
      return { valid: false, error: 'Configuration is missing' }
    }

    return { valid: true }
  }

  #determineRenderingMode(resolved) {
    const ownership = resolved.ownership.type
    const migrationState = resolved.migrationState.state

    if (ownership === OWNERSHIP.WORDPRESS || migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS) {
      return RENDERING_MODE.WORDPRESS
    }

    if (ownership === OWNERSHIP.HYBRID || migrationState === MIGRATION_STATE.HYBRID_ACTIVE) {
      return RENDERING_MODE.HYBRID
    }

    if (ownership === OWNERSHIP.EXPERIENCE || migrationState === MIGRATION_STATE.EXPERIENCE_ACTIVE) {
      return RENDERING_MODE.EXPERIENCE
    }

    return RENDERING_MODE.WORDPRESS
  }

  #determinePresentationStatus(resolved, renderingMode) {
    if (renderingMode === RENDERING_MODE.WORDPRESS) {
      return PRESENTATION_STATUS.READY
    }

    if (renderingMode === RENDERING_MODE.HYBRID) {
      const hasComposition = resolved.composition && resolved.composition.capabilities?.length > 0
      if (hasComposition) {
        return PRESENTATION_STATUS.READY
      }
      return PRESENTATION_STATUS.PENDING
    }

    if (renderingMode === RENDERING_MODE.EXPERIENCE) {
      const hasComposition = resolved.composition && resolved.composition.capabilities?.length > 0
      if (hasComposition) {
        return PRESENTATION_STATUS.READY
      }
      return PRESENTATION_STATUS.PENDING
    }

    return PRESENTATION_STATUS.UNAVAILABLE
  }

  #buildRuntimeApplication(resolved, renderingMode, presentationStatus) {
    const runtime = {
      identity: resolved.identity,
      ownership: resolved.ownership,
      migrationState: resolved.migrationState,
      configuration: resolved.configuration,
      composition: resolved.composition,
      rendering: Object.freeze({
        mode: renderingMode,
        status: presentationStatus,
        canRender: presentationStatus === PRESENTATION_STATUS.READY,
        presentationLayer: this.#getPresentationLayer(renderingMode),
        contentLayer: this.#getContentLayer(resolved, renderingMode)
      }),
      cache: Object.freeze({
        key: this.#buildCacheKey(resolved),
        tags: this.#buildCacheTags(resolved)
      }),
      metadata: Object.freeze({
        ...resolved.metadata,
        assembledAt: new Date().toISOString(),
        assembler: 'RuntimeApplicationAssembly',
        assemblerVersion: '1.0.0'
      })
    }

    return Object.freeze(runtime)
  }

  #getPresentationLayer(renderingMode) {
    switch (renderingMode) {
      case RENDERING_MODE.WORDPRESS:
        return 'wordpress'
      case RENDERING_MODE.HYBRID:
        return 'experience'
      case RENDERING_MODE.EXPERIENCE:
        return 'experience'
      default:
        return 'wordpress'
    }
  }

  #getContentLayer(resolved, renderingMode) {
    if (renderingMode === RENDERING_MODE.WORDPRESS) {
      return 'wordpress'
    }

    if (renderingMode === RENDERING_MODE.HYBRID) {
      return resolved.configuration.content?.source || 'wordpress'
    }

    if (renderingMode === RENDERING_MODE.EXPERIENCE) {
      return resolved.configuration.content?.source || 'experience'
    }

    return 'wordpress'
  }

  #buildCacheKey(resolved) {
    const parts = [
      resolved.identity.domain,
      resolved.identity.route,
      resolved.ownership.type
    ]

    if (resolved.migrationState.state) {
      parts.push(resolved.migrationState.state)
    }

    if (resolved.configuration.destination?.slug) {
      parts.push(`dst:${resolved.configuration.destination.slug}`)
    }

    if (resolved.configuration.company?.slug) {
      parts.push(`co:${resolved.configuration.company.slug}`)
    }

    return parts.join(':')
  }

  #buildCacheTags(resolved) {
    const tags = [
      `domain:${resolved.identity.domain}`,
      `route:${resolved.identity.route}`,
      `ownership:${resolved.ownership.type}`
    ]

    if (resolved.migrationState.state) {
      tags.push(`migration:${resolved.migrationState.state}`)
    }

    if (resolved.configuration.destination?.slug) {
      tags.push(`destination:${resolved.configuration.destination.slug}`)
    }

    if (resolved.configuration.company?.slug) {
      tags.push(`company:${resolved.configuration.company.slug}`)
    }

    if (resolved.composition?.capabilities) {
      for (const cap of resolved.composition.capabilities) {
        tags.push(`cap:${cap.name}`)
      }
    }

    return Object.freeze(tags)
  }

  getResolver() {
    return this.#resolver
  }

  static getRenderingModes() {
    return { ...RENDERING_MODE }
  }

  static getPresentationStatuses() {
    return { ...PRESENTATION_STATUS }
  }
}

export function createRuntimeAssembly(resolver, options = {}) {
  return new RuntimeApplicationAssembly(resolver, options)
}

export function assembleRuntime(request, resolver, options = {}) {
  const assembly = new RuntimeApplicationAssembly(resolver, options)
  return assembly.assemble(request)
}

export default {
  RuntimeApplicationAssembly,
  createRuntimeAssembly,
  assembleRuntime,
  RENDERING_MODE,
  PRESENTATION_STATUS
}
