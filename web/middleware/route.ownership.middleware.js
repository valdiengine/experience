/**
 * Route Ownership Middleware
 *
 * Middleware that resolves route ownership for a domain+path.
 * Includes migration state information.
 * Must NOT contain Experience Engine business logic.
 * Must NOT access WordPress REST API.
 * Must NOT access databases or storage.
 */

import { createRouteOwnershipRegistry, OWNERSHIP } from '../routing/route.registry.js'
import { createRouteMigrationController, MIGRATION_STATE } from '../routing/route.migration.controller.js'
import { ROUTE_CONFIG } from '../routing/route.config.js'

const DEFAULT_OWNERSHIP = OWNERSHIP.WORDPRESS
const DEFAULT_MIGRATION_STATE = MIGRATION_STATE.ACTIVE_WORDPRESS

export function createRouteOwnershipMiddleware(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'development'
  const registry = options.registry || createRouteOwnershipRegistry({ ...ROUTE_CONFIG, env })
  const migrationController = options.migrationController || createRouteMigrationController(registry)

  return async function routeOwnershipMiddleware(req, res, next) {
    const domain = req.domain
    const pathname = req.pathname

    if (!domain || !pathname) {
      return next()
    }

    const resolved = registry.resolve(domain, pathname)
    const migration = migrationController.getMigration(domain, pathname)

    req.routeOwnership = {
      ownership: resolved.ownership || DEFAULT_OWNERSHIP,
      matchedBy: resolved.matchedBy,
      matchedPattern: resolved.matchedPattern,
      destination: resolved.destination || req.destination,
      company: resolved.company,
      zone: resolved.zone || null,
      experienceType: resolved.experienceType || null,
      migrationState: resolved.migrationState || DEFAULT_MIGRATION_STATE,
      isWordPress: resolved.ownership === 'wordpress',
      isHybrid: resolved.ownership === 'hybrid',
      isExperience: resolved.ownership === 'experience',
      canMigrate: migration.canMigrate,
      canRollback: migration.canRollback,
      renderingPath: migrationController.getRenderingPath(domain, pathname),
      cacheKey: migrationController.getCacheKey(domain, pathname, resolved.ownership)
    }

    next()
  }
}

export function createRouteOwnershipResolver(config = {}) {
  return createRouteOwnershipRegistry(config)
}

export default createRouteOwnershipMiddleware
