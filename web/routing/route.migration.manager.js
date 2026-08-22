/**
 * Route Migration Manager
 *
 * P15.7.4 - Progressive Migration Management & Route Activation Interface
 *
 * This is a MANAGEMENT layer, not a rendering layer.
 * It orchestrates existing certified components:
 * - RouteOwnershipRegistry
 * - RouteMigrationController
 *
 * It does NOT:
 * - Render WordPress content
 * - Access WordPress REST API
 * - Access databases
 * - Access storage
 * - Contain destination-specific business logic
 */

import { createRouteOwnershipRegistry, OWNERSHIP } from './route.registry.js'
import { createRouteMigrationController, MIGRATION_STATE } from './route.migration.controller.js'
import { ROUTE_CONFIG } from './route.config.js'

export const TRANSITION_TARGET = {
  HYBRID: 'HYBRID',
  EXPERIENCE: 'EXPERIENCE',
  WORDPRESS: 'WORDPRESS'
}

export const CANONICAL_DOMAINS = [
  'valdi.app',
  'natales.app',
  'puntaarenas.app',
  'coyhaique.app',
  'chiloe.app'
]

export const REJECTED_DOMAINS = [
  'valdivia.app'
]

export class RouteMigrationManager {
  #registry
  #controller
  #migrationHistory

  constructor(registry = null, useDefaultConfig = true) {
    if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
      if (registry.routes || registry.config) {
        this.#registry = createRouteOwnershipRegistry(registry)
      } else if (typeof registry.resolve === 'function') {
        this.#registry = registry
      } else {
        this.#registry = createRouteOwnershipRegistry()
      }
    } else if (registry && typeof registry.resolve === 'function') {
      this.#registry = registry
    } else if (useDefaultConfig) {
      this.#registry = createRouteOwnershipRegistry(ROUTE_CONFIG)
    } else {
      this.#registry = createRouteOwnershipRegistry()
    }
    this.#controller = createRouteMigrationController(this.#registry)
    this.#migrationHistory = []
  }

  getRegistry() {
    return this.#registry
  }

  getController() {
    return this.#controller
  }

  isCanonicalDomain(domain) {
    if (!domain) return false
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return CANONICAL_DOMAINS.includes(normalized)
  }

  isRejectedDomain(domain) {
    if (!domain) return true
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return REJECTED_DOMAINS.includes(normalized)
  }

  listRoutes() {
    const routes = []
    for (const domain of CANONICAL_DOMAINS) {
      const domainRoutes = this.#registry.getRoutesForDomain(domain)
      for (const route of domainRoutes) {
        routes.push({
          domain,
          path: route.path,
          ownership: route.ownership,
          migrationState: route.migrationState,
          destination: route.destination,
          company: route.company,
          matchedBy: route.match,
          enabled: route.enabled
        })
      }
    }
    return routes
  }

  listDomains() {
    return [...CANONICAL_DOMAINS]
  }

  inspectRoute(domain, path) {
    if (this.isRejectedDomain(domain)) {
      return {
        valid: false,
        error: 'Domain is not canonical',
        domain,
        path
      }
    }

    if (!this.isCanonicalDomain(domain)) {
      return {
        valid: false,
        error: 'Domain is not recognized',
        domain,
        path
      }
    }

    const resolved = this.#registry.resolve(domain, path)
    const migration = this.#controller.getMigration(domain, path)
    const canActivateHybrid = this.#controller.canActivateHybrid(domain, path)
    const canActivateExperience = this.#controller.canActivateExperience(domain, path)
    const canRollback = this.#controller.canRollback(domain, path)
    const rollbackState = this.#controller.getNextRollbackState(domain, path)
    const renderingPath = this.#controller.getRenderingPath(domain, path)

    const routeInfo = {
      domain: resolved.domain,
      path: resolved.path,
      ownership: resolved.ownership,
      migrationState: resolved.migrationState,
      destination: resolved.destination,
      company: resolved.company,
      matchedBy: resolved.matchedBy,
      matchedPattern: resolved.matchedPattern,
      enabled: true
    }

    const migrationInfo = {
      currentState: migration.migrationState,
      canActivateHybrid: canActivateHybrid.canActivate,
      canActivateExperience: canActivateExperience.canActivate,
      canRollback: canRollback.canRollback,
      rollbackState: rollbackState,
      renderingPath
    }

    const preview = this.#computePreview(routeInfo, migrationInfo)

    return {
      valid: true,
      route: routeInfo,
      migration: migrationInfo,
      transitions: {
        toHybrid: canActivateHybrid.canActivate ? {
          allowed: true,
          currentState: canActivateHybrid.currentState,
          targetState: canActivateHybrid.targetState,
          targetOwnership: canActivateHybrid.ownership
        } : {
          allowed: false,
          reasons: canActivateHybrid.reasons || ['Cannot transition to HYBRID']
        },
        toExperience: canActivateExperience.canActivate ? {
          allowed: true,
          currentState: canActivateExperience.currentState,
          targetState: canActivateExperience.targetState,
          targetOwnership: canActivateExperience.ownership
        } : {
          allowed: false,
          reasons: canActivateExperience.reasons || ['Cannot transition to EXPERIENCE']
        }
      },
      preview
    }
  }

  #computePreview(routeInfo, migrationInfo) {
    const preview = {
      current: {
        ownership: routeInfo.ownership,
        migrationState: routeInfo.migrationState,
        renderingPath: migrationInfo.renderingPath
      },
      effects: []
    }

    if (routeInfo.ownership === 'wordpress' && routeInfo.migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS) {
      preview.effects.push({
        transition: 'HYBRID',
        description: 'Presentation changes from WordPress to Experience Engine',
        content: 'WordPress content remains via ContentProvider',
        url: 'URL unchanged',
        rollback: 'Available via configuration'
      })
    }

    if (routeInfo.ownership === 'hybrid' && routeInfo.migrationState === MIGRATION_STATE.HYBRID_ACTIVE) {
      preview.effects.push({
        transition: 'EXPERIENCE',
        description: 'Experience Engine owns complete route',
        content: 'Experience configuration replaces WordPress content',
        url: 'URL unchanged',
        rollback: 'Available via configuration'
      })
    }

    if (routeInfo.ownership === 'experience') {
      preview.effects.push({
        transition: 'HYBRID',
        description: 'Presentation still Experience Engine',
        content: 'WordPress content via ContentProvider restored',
        url: 'URL unchanged',
        rollback: 'Available'
      })
    }

    return preview
  }

  validateTransition(domain, path, targetState) {
    const current = this.inspectRoute(domain, path)

    if (!current.valid) {
      return {
        valid: false,
        error: current.error,
        domain,
        path,
        targetState
      }
    }

    if (targetState === TRANSITION_TARGET.HYBRID) {
      const result = this.#controller.canActivateHybrid(domain, path)
      return {
        valid: result.canActivate,
        allowed: result.canActivate,
        currentState: result.currentState,
        targetState: result.targetState,
        targetOwnership: result.ownership,
        reasons: result.reasons || [],
        domain,
        path,
        target: TRANSITION_TARGET.HYBRID
      }
    }

    if (targetState === TRANSITION_TARGET.EXPERIENCE) {
      const result = this.#controller.canActivateExperience(domain, path)
      return {
        valid: result.canActivate,
        allowed: result.canActivate,
        currentState: result.currentState,
        targetState: result.targetState,
        targetOwnership: result.ownership,
        reasons: result.reasons || [],
        domain,
        path,
        target: TRANSITION_TARGET.EXPERIENCE
      }
    }

    return {
      valid: false,
      error: 'Unknown target state',
      domain,
      path,
      targetState
    }
  }

  validateRollback(domain, path) {
    const rollback = this.#controller.getNextRollbackState(domain, path)
    const canRollback = this.#controller.canRollback(domain, path)

    if (!rollback) {
      return {
        valid: false,
        allowed: false,
        reasons: ['No rollback available for current state'],
        domain,
        path
      }
    }

    return {
      valid: true,
      allowed: canRollback.canRollback,
      currentState: canRollback.currentState,
      targetState: rollback.targetState,
      targetOwnership: rollback.targetOwnership,
      reasons: canRollback.reasons || [],
      domain,
      path
    }
  }

  prepareTransition(domain, path, targetState, options = {}) {
    const validation = this.validateTransition(domain, path, targetState)

    if (!validation.valid) {
      return {
        success: false,
        error: 'Transition not allowed',
        validation,
        domain,
        path,
        targetState
      }
    }

    const current = this.inspectRoute(domain, path)

    const transition = {
      domain,
      path,
      targetState,
      previousOwnership: current.route.ownership,
      previousState: current.route.migrationState,
      newOwnership: validation.targetOwnership,
      newState: validation.targetState,
      timestamp: new Date().toISOString(),
      preview: current.preview,
      configuration: this.#buildConfigurationChange(domain, path, validation)
    }

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        transition,
        message: 'Dry run - no configuration changes applied'
      }
    }

    return {
      success: true,
      dryRun: false,
      transition,
      message: 'Transition prepared - apply configuration change to activate'
    }
  }

  prepareRollback(domain, path, options = {}) {
    const validation = this.validateRollback(domain, path)

    if (!validation.valid) {
      return {
        success: false,
        error: 'Rollback not allowed',
        validation,
        domain,
        path
      }
    }

    const current = this.inspectRoute(domain, path)

    const rollback = {
      domain,
      path,
      type: 'rollback',
      previousOwnership: current.route.ownership,
      previousState: current.route.migrationState,
      targetOwnership: validation.targetOwnership,
      targetState: validation.targetState,
      timestamp: new Date().toISOString(),
      configuration: this.#buildRollbackConfiguration(domain, path, validation)
    }

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        rollback,
        message: 'Dry run - no configuration changes applied'
      }
    }

    return {
      success: true,
      dryRun: false,
      rollback,
      message: 'Rollback prepared - apply configuration change to activate'
    }
  }

  #buildConfigurationChange(domain, path, validation) {
    return {
      domain,
      path,
      ownership: validation.targetOwnership,
      migrationState: validation.targetState
    }
  }

  #buildRollbackConfiguration(domain, path, validation) {
    return {
      domain,
      path,
      ownership: validation.targetOwnership,
      migrationState: validation.targetState
    }
  }

  recordMigration(domain, path, previousState, newState, actor = 'system') {
    this.#migrationHistory.push({
      domain,
      path,
      previousState,
      newState,
      actor,
      timestamp: new Date().toISOString()
    })
    return this.#migrationHistory[this.#migrationHistory.length - 1]
  }

  getMigrationHistory(domain = null, path = null) {
    if (!domain && !path) {
      return [...this.#migrationHistory]
    }

    return this.#migrationHistory.filter(record => {
      if (domain && record.domain !== domain) return false
      if (path && record.path !== path) return false
      return true
    })
  }

  clearHistory() {
    this.#migrationHistory = []
    return true
  }

  getRouteConfigForTransition(domain, path, targetState) {
    const validation = this.validateTransition(domain, path, targetState)

    if (!validation.valid) {
      return null
    }

    return {
      domain,
      path,
      ownership: validation.targetOwnership,
      migrationState: validation.targetState,
      enabled: true
    }
  }

  getRouteConfigForRollback(domain, path) {
    const validation = this.validateRollback(domain, path)

    if (!validation.valid) {
      return null
    }

    return {
      domain,
      path,
      ownership: validation.targetOwnership,
      migrationState: validation.targetState,
      enabled: true
    }
  }

  isWordPressRoute(domain, path) {
    return this.#controller.isWordPressRoute(domain, path)
  }

  isHybridRoute(domain, path) {
    return this.#controller.isHybridRoute(domain, path)
  }

  isExperienceRoute(domain, path) {
    return this.#controller.isExperienceRoute(domain, path)
  }

  getRenderingPath(domain, path) {
    return this.#controller.getRenderingPath(domain, path)
  }

  getCacheKey(domain, path) {
    const resolved = this.#registry.resolve(domain, path)
    return this.#controller.getCacheKey(domain, path, resolved.ownership)
  }

  health() {
    return {
      status: 'healthy',
      manager: 'RouteMigrationManager',
      registry: !!this.#registry,
      controller: !!this.#controller,
      historySize: this.#migrationHistory.length
    }
  }
}

export function createRouteMigrationManager(registry = null) {
  return new RouteMigrationManager(registry)
}

export default {
  RouteMigrationManager,
  createRouteMigrationManager,
  TRANSITION_TARGET,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS
}
