/**
 * Experience Engine
 * 
 * Main entry point for the Experience Engine.
 */

import { ExperienceEngine } from './experience.engine.js'
import { ExperienceContext, ExperienceContextBuilder } from './experience.context.js'
import { ProductResolver, EcosystemResolver, ModuleResolver, CapabilityResolver, createResolvers } from './resolver/index.js'
import { ConfigurationLoader, ExperienceLoader, createLoaders } from './loader/index.js'
import { ExperienceComposer, createComposition } from './composition/index.js'
import { ExperienceEngineError, ExperienceResolutionError, ProductResolutionError, EcosystemLoadError, ConfigurationResolutionError, ExperienceNotFoundError, ModuleResolutionError, CapabilityResolutionError, ExperienceCompositionError, ExperienceLifecycleError, TenantIsolationError, ConfigurationValidationError } from './experience.errors.js'
import { EXPERIENCE_EVENTS, createExperienceEvent } from './experience.events.js'

export {
  ExperienceEngine,
  ExperienceContext,
  ExperienceContextBuilder,
  ProductResolver,
  EcosystemResolver,
  ModuleResolver,
  CapabilityResolver,
  ConfigurationLoader,
  ExperienceLoader,
  ExperienceComposer,
  createResolvers,
  createLoaders,
  createComposition,
  ExperienceEngineError,
  ExperienceResolutionError,
  ProductResolutionError,
  EcosystemLoadError,
  ConfigurationResolutionError,
  ExperienceNotFoundError,
  ModuleResolutionError,
  CapabilityResolutionError,
  ExperienceCompositionError,
  ExperienceLifecycleError,
  TenantIsolationError,
  ConfigurationValidationError,
  EXPERIENCE_EVENTS,
  createExperienceEvent
}

export async function createExperienceEngine(config = {}) {
  const engine = new ExperienceEngine(config)

  const resolvers = createResolvers({
    product: config.product,
    ecosystem: config.ecosystem,
    module: config.module,
    capability: config.capability
  })

  const loaders = createLoaders({
    configuration: config.configuration,
    experience: config.experience
  })

  const composition = createComposition(config.composition)

  engine.registerResolver('product', resolvers.product)
  engine.registerResolver('ecosystem', resolvers.ecosystem)
  engine.registerResolver('module', resolvers.module)
  engine.registerResolver('capability', resolvers.capability)

  engine.registerLoader('configuration', loaders.configuration)
  engine.registerLoader('experience', loaders.experience)

  engine.setComposition(composition)

  if (config.eventBus) {
    engine.setEventBus(config.eventBus)
  }

  await engine.initialize()
  await engine.start()

  return engine
}

export default {
  ExperienceEngine,
  ExperienceContext,
  ExperienceContextBuilder,
  ProductResolver,
  EcosystemResolver,
  ModuleResolver,
  CapabilityResolver,
  ConfigurationLoader,
  ExperienceLoader,
  ExperienceComposer,
  createResolvers,
  createLoaders,
  createComposition,
  createExperienceEngine,
  ExperienceEngineError,
  EXPERIENCE_EVENTS
}
