/**
 * Capability Module Index
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Exports all capability-related components.
 * Framework-free implementation.
 */

export {
  CapabilityRegistry,
  createCapabilityRegistry,
  CAPABILITY_TYPES,
  DEFAULT_CAPABILITIES
} from './capability.registry.js'

export {
  COMPATIBLE_APPLICATION_TYPES,
  createCapabilitySchema,
  validateCapabilityName,
  validateCapabilityVersion,
  validateApplicationType,
  validateCapability
} from './capability.schema.js'

export {
  CapabilityValidator,
  createCapabilityValidator
} from './capability.validator.js'

export {
  DependencyResolver,
  createDependencyResolver
} from './dependency.resolver.js'

export {
  CapabilityResolver,
  createCapabilityResolver
} from './capability.resolver.js'

export {
  CapabilityComposer,
  createCapabilityComposer
} from './capability.composer.js'

export {
  createApplicationInstance
} from '../index.js'

import {
  CapabilityRegistry,
  createCapabilityRegistry,
  CAPABILITY_TYPES,
  DEFAULT_CAPABILITIES
} from './capability.registry.js'

import {
  CapabilityValidator,
  createCapabilityValidator
} from './capability.validator.js'

import {
  DependencyResolver,
  createDependencyResolver
} from './dependency.resolver.js'

import {
  CapabilityResolver,
  createCapabilityResolver
} from './capability.resolver.js'

import {
  CapabilityComposer,
  createCapabilityComposer
} from './capability.composer.js'

import {
  COMPATIBLE_APPLICATION_TYPES
} from './capability.schema.js'

export default {
  CapabilityRegistry,
  createCapabilityRegistry,
  CapabilityValidator,
  createCapabilityValidator,
  DependencyResolver,
  createDependencyResolver,
  CapabilityResolver,
  createCapabilityResolver,
  CapabilityComposer,
  createCapabilityComposer,
  CAPABILITY_TYPES,
  DEFAULT_CAPABILITIES,
  COMPATIBLE_APPLICATION_TYPES
}