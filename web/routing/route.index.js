/**
 * Routing Module
 *
 * Route Ownership Registry for the Valdi Platform.
 * Enables progressive route-by-route migration from WordPress to Experience Engine.
 */

import { RouteOwnershipRegistry, createRouteOwnershipRegistry, getDefaultRegistry, OWNERSHIP } from './route.registry.js'
import { ROUTE_CONFIG, getRouteConfig } from './route.config.js'
import { RouteMigrationController, createRouteMigrationController, MIGRATION_STATE } from './route.migration.controller.js'
import { RouteMigrationManager, createRouteMigrationManager, TRANSITION_TARGET, CANONICAL_DOMAINS, REJECTED_DOMAINS } from './route.migration.manager.js'

export {
  RouteOwnershipRegistry,
  createRouteOwnershipRegistry,
  getDefaultRegistry,
  OWNERSHIP,
  ROUTE_CONFIG,
  getRouteConfig,
  RouteMigrationController,
  createRouteMigrationController,
  MIGRATION_STATE,
  RouteMigrationManager,
  createRouteMigrationManager,
  TRANSITION_TARGET,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS
}

export default {
  RouteOwnershipRegistry,
  createRouteOwnershipRegistry,
  getDefaultRegistry,
  OWNERSHIP,
  ROUTE_CONFIG,
  getRouteConfig,
  RouteMigrationController,
  createRouteMigrationController,
  MIGRATION_STATE,
  RouteMigrationManager,
  createRouteMigrationManager,
  TRANSITION_TARGET,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS
}
