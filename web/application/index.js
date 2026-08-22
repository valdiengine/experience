/**
 * Application Configuration Index
 *
 * P15.8.4 - Application Presentation Runtime Integration
 *
 * Exports the Application Configuration Model components:
 * - ApplicationIdentity
 * - ApplicationConfigLoader
 * - ApplicationValidator
 * - ApplicationResolver
 * - RuntimeApplicationAssembly
 * - ApplicationPresentationContext
 * - ApplicationPresentationAdapter
 * - ApplicationPresentationRenderer
 * - Schema definitions
 *
 * Framework-free implementation.
 */

export {
  ApplicationIdentity,
  createApplicationIdentity,
  isValidApplicationIdentity,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  DESTINATION_MAP,
  DESTINATION_REGIONS
} from './application.identity.js'

export {
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  DEFAULT_CAPABILITIES,
  createApplicationConfig,
  validateExperienceType,
  validateContentSource,
  validateMigrationState,
  validateCapabilityKey,
  validateCompanySlug
} from './application.schema.js'

export {
  ApplicationValidator,
  createApplicationValidator,
  validateApplicationConfig
} from './application.validator.js'

export {
  ApplicationConfigLoader,
  createApplicationConfigLoader,
  loadApplicationConfig
} from './application.loader.js'

export {
  ApplicationResolver,
  createApplicationResolver,
  resolveApplication
} from './application.resolver.js'

export {
  RuntimeApplicationAssembly,
  createRuntimeAssembly,
  assembleRuntime,
  RENDERING_MODE,
  PRESENTATION_STATUS
} from './application.runtime.js'

export {
  ApplicationPresentationContext,
  createApplicationPresentationContext,
  APPLICATION_PRESENTATION_EVENTS,
  CONTENT_LAYER
} from './application.presentation.js'

export {
  ApplicationPresentationAdapter,
  createApplicationPresentationAdapter,
  INTERNAL_FIELDS
} from './application.presentation.adapter.js'

export {
  ApplicationPresentationRenderer,
  createApplicationPresentationRenderer
} from './application.presentation.renderer.js'

import { ApplicationIdentity, CANONICAL_DOMAINS, REJECTED_DOMAINS } from './application.identity.js'
import { createApplicationConfig, EXPERIENCE_TYPES, CONTENT_SOURCES, MIGRATION_STATES, DEFAULT_CAPABILITIES } from './application.schema.js'
import { ApplicationConfigLoader } from './application.loader.js'
import { ApplicationValidator } from './application.validator.js'

export function createApplicationInstance(domain, route, routeData = {}, options = {}) {
  const loader = new ApplicationConfigLoader(options)
  return loader.loadFromRoute(domain, route, routeData)
}

export function isCanonicalDomain(domain) {
  return ApplicationIdentity.isValidDomain(domain)
}

export function isValidApplicationRoute(route) {
  return ApplicationIdentity.isValidRoute(route)
}

export function getDestinationForDomain(domain) {
  return ApplicationIdentity.getDestinationForDomain(domain)
}

export function getRegionForDestination(destination) {
  return ApplicationIdentity.getRegionForDestination(destination)
}

export default {
  ApplicationIdentity,
  createApplicationInstance,
  createApplicationConfig,
  ApplicationConfigLoader,
  ApplicationValidator,
  isCanonicalDomain,
  isValidApplicationRoute,
  getDestinationForDomain,
  getRegionForDestination,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  DEFAULT_CAPABILITIES
}