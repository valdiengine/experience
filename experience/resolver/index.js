/**
 * Experience Resolvers
 * 
 * Product, Ecosystem, Module, and Capability resolvers.
 */

import { ProductResolver } from './product.resolver.js'
import { EcosystemResolver } from './ecosystem.resolver.js'
import { ModuleResolver } from './module.resolver.js'
import { CapabilityResolver } from './capability.resolver.js'

export {
  ProductResolver,
  EcosystemResolver,
  ModuleResolver,
  CapabilityResolver
}

export function createResolvers(config = {}) {
  return {
    product: new ProductResolver(config.product),
    ecosystem: new EcosystemResolver(config.ecosystem),
    module: new ModuleResolver(config.module),
    capability: new CapabilityResolver(config.capability)
  }
}

export default {
  ProductResolver,
  EcosystemResolver,
  ModuleResolver,
  CapabilityResolver,
  createResolvers
}
