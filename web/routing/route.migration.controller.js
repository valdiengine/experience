/**
 * Route Migration Controller
 *
 * Controls the migration lifecycle of routes from WORDPRESS to EXPERIENCE.
 * Manages migration states, transitions, and validation.
 *
 * P15.7.2 Implementation - Framework-free.
 *
 * Migration States:
 * - ACTIVE_WORDPRESS: Route is WordPress-owned (production)
 * - MIGRATION_READY: Route is prepared for migration but not activated
 * - HYBRID_ACTIVE: Experience Engine controls presentation, WordPress provides content
 * - EXPERIENCE_ACTIVE: Experience Engine owns the complete route
 * - ROLLBACK_REQUIRED: Migration failed, rollback recommended
 */

export const MIGRATION_STATE = {
  ACTIVE_WORDPRESS: 'ACTIVE_WORDPRESS',
  MIGRATION_READY: 'MIGRATION_READY',
  HYBRID_ACTIVE: 'HYBRID_ACTIVE',
  EXPERIENCE_ACTIVE: 'EXPERIENCE_ACTIVE',
  ROLLBACK_REQUIRED: 'ROLLBACK_REQUIRED'
}

const VALID_STATES = Object.values(MIGRATION_STATE)

export class RouteMigrationController {
  constructor(registry) {
    this.registry = registry
  }

  getMigration(domain, path) {
    const resolved = this.registry.resolve(domain, path)

    if (!resolved.valid) {
      return {
        valid: false,
        error: resolved.error,
        canMigrate: false
      }
    }

    return {
      valid: true,
      domain: resolved.domain,
      path: resolved.path,
      ownership: resolved.ownership,
      migrationState: resolved.migrationState || MIGRATION_STATE.ACTIVE_WORDPRESS,
      destination: resolved.destination,
      company: resolved.company,
      matchedBy: resolved.matchedBy,
      matchedPattern: resolved.matchedPattern,
      canMigrate: true,
      canRollback: resolved.ownership !== 'wordpress' || resolved.migrationState !== MIGRATION_STATE.ACTIVE_WORDPRESS
    }
  }

  validateMigration(domain, path) {
    const resolved = this.registry.resolve(domain, path)
    const errors = []

    if (!resolved.valid) {
      errors.push(`Invalid route: ${resolved.error}`)
      return { valid: false, errors }
    }

    if (!this._validateDomain(resolved.domain)) {
      errors.push('Invalid domain')
    }

    if (!this._validatePath(resolved.path)) {
      errors.push('Invalid path')
    }

    if (!this._validateOwnership(resolved.ownership)) {
      errors.push('Invalid ownership')
    }

    if (resolved.company && !this._validateCompany(resolved.company)) {
      errors.push('Invalid company')
    }

    return {
      valid: errors.length === 0,
      errors,
      canMigrate: errors.length === 0
    }
  }

  canActivateHybrid(domain, path) {
    const validation = this.validateMigration(domain, path)
    if (!validation.valid) {
      return { canActivate: false, reasons: validation.errors }
    }

    const resolved = this.registry.resolve(domain, path)

    if (resolved.ownership === 'wordpress' && resolved.migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS) {
      return {
        canActivate: true,
        currentState: MIGRATION_STATE.ACTIVE_WORDPRESS,
        targetState: MIGRATION_STATE.HYBRID_ACTIVE,
        ownership: 'wordpress',
        migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.MIGRATION_READY) {
      return {
        canActivate: true,
        currentState: MIGRATION_STATE.MIGRATION_READY,
        targetState: MIGRATION_STATE.HYBRID_ACTIVE,
        ownership: 'hybrid',
        migrationState: MIGRATION_STATE.MIGRATION_READY
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.HYBRID_ACTIVE) {
      return { canActivate: false, reasons: ['Already HYBRID_ACTIVE'] }
    }

    if (resolved.migrationState === MIGRATION_STATE.EXPERIENCE_ACTIVE) {
      return { canActivate: false, reasons: ['Already EXPERIENCE_ACTIVE, use rollback instead'] }
    }

    return { canActivate: false, reasons: ['Cannot activate hybrid from current state'] }
  }

  canActivateExperience(domain, path) {
    const validation = this.validateMigration(domain, path)
    if (!validation.valid) {
      return { canActivate: false, reasons: validation.errors }
    }

    const resolved = this.registry.resolve(domain, path)

    if (resolved.migrationState === MIGRATION_STATE.HYBRID_ACTIVE) {
      return {
        canActivate: true,
        currentState: MIGRATION_STATE.HYBRID_ACTIVE,
        targetState: MIGRATION_STATE.EXPERIENCE_ACTIVE,
        ownership: 'experience',
        migrationState: MIGRATION_STATE.HYBRID_ACTIVE
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.EXPERIENCE_ACTIVE) {
      return { canActivate: false, reasons: ['Already EXPERIENCE_ACTIVE'] }
    }

    if (resolved.migrationState === MIGRATION_STATE.MIGRATION_READY) {
      return {
        canActivate: true,
        currentState: MIGRATION_STATE.MIGRATION_READY,
        targetState: MIGRATION_STATE.EXPERIENCE_ACTIVE,
        ownership: 'experience',
        migrationState: MIGRATION_STATE.MIGRATION_READY
      }
    }

    if (resolved.ownership === 'hybrid' && resolved.migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS) {
      return {
        canActivate: true,
        currentState: MIGRATION_STATE.ACTIVE_WORDPRESS,
        targetState: MIGRATION_STATE.EXPERIENCE_ACTIVE,
        ownership: 'experience',
        migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS
      }
    }

    return { canActivate: false, reasons: ['Route must be HYBRID_ACTIVE or MIGRATION_READY'] }
  }

  canRollback(domain, path) {
    const resolved = this.registry.resolve(domain, path)

    if (!resolved.valid) {
      return { canRollback: false, reasons: ['Invalid route'] }
    }

    if (resolved.ownership === 'wordpress' && resolved.migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS) {
      return { canRollback: false, reasons: ['Already in WORDPRESS state'] }
    }

    return {
      canRollback: true,
      currentOwnership: resolved.ownership,
      currentState: resolved.migrationState,
      targetOwnership: 'wordpress',
      targetState: MIGRATION_STATE.ACTIVE_WORDPRESS
    }
  }

  getNextRollbackState(domain, path) {
    const resolved = this.registry.resolve(domain, path)

    if (!resolved.valid) {
      return null
    }

    if (resolved.migrationState === MIGRATION_STATE.EXPERIENCE_ACTIVE) {
      return {
        targetOwnership: 'hybrid',
        targetState: MIGRATION_STATE.HYBRID_ACTIVE
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.HYBRID_ACTIVE) {
      return {
        targetOwnership: 'wordpress',
        targetState: MIGRATION_STATE.ACTIVE_WORDPRESS
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.MIGRATION_READY) {
      return {
        targetOwnership: 'wordpress',
        targetState: MIGRATION_STATE.ACTIVE_WORDPRESS
      }
    }

    if (resolved.migrationState === MIGRATION_STATE.ROLLBACK_REQUIRED) {
      return {
        targetOwnership: 'wordpress',
        targetState: MIGRATION_STATE.ACTIVE_WORDPRESS
      }
    }

    return null
  }

  isWordPressRoute(domain, path) {
    const resolved = this.registry.resolve(domain, path)
    return resolved.ownership === 'wordpress' ||
           (resolved.ownership === 'hybrid' && resolved.migrationState === MIGRATION_STATE.ACTIVE_WORDPRESS)
  }

  isHybridRoute(domain, path) {
    const resolved = this.registry.resolve(domain, path)
    return resolved.ownership === 'hybrid' &&
           (resolved.migrationState === MIGRATION_STATE.HYBRID_ACTIVE ||
            resolved.migrationState === MIGRATION_STATE.MIGRATION_READY)
  }

  isExperienceRoute(domain, path) {
    const resolved = this.registry.resolve(domain, path)
    return resolved.ownership === 'experience' ||
           resolved.migrationState === MIGRATION_STATE.EXPERIENCE_ACTIVE
  }

  getRenderingPath(domain, path) {
    const resolved = this.registry.resolve(domain, path)

    if (!resolved.valid) {
      return 'error'
    }

    if (resolved.ownership === 'wordpress') {
      return 'wordpress'
    }

    if (resolved.ownership === 'hybrid') {
      return 'hybrid'
    }

    if (resolved.ownership === 'experience') {
      return 'experience'
    }

    return 'wordpress'
  }

  getCacheKey(domain, path, ownership) {
    return `route:${domain}:${path}:${ownership}`
  }

  shouldInvalidateCache(previousOwnership, newOwnership) {
    if (previousOwnership === newOwnership) {
      return false
    }
    return true
  }

  _validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return false
    }
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    const canonicalDomains = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
    return canonicalDomains.includes(normalized)
  }

  _validatePath(path) {
    if (!path || typeof path !== 'string') {
      return false
    }
    if (!path.startsWith('/')) {
      return false
    }
    return true
  }

  _validateOwnership(ownership) {
    return ownership === 'wordpress' || ownership === 'hybrid' || ownership === 'experience'
  }

  _validateCompany(company) {
    if (!company || typeof company !== 'string') {
      return false
    }
    return company.length > 0 && company.length < 100
  }

  _validateMigrationState(state) {
    return VALID_STATES.includes(state)
  }
}

export function createRouteMigrationController(registry) {
  return new RouteMigrationController(registry)
}

export default {
  RouteMigrationController,
  createRouteMigrationController,
  MIGRATION_STATE
}
