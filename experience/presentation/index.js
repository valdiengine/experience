/**
 * Experience Presentation Core
 * 
 * P15.3.1 - Experience Presentation Core Implementation
 * 
 * Architecture:
 *   ExperienceContext → PresentationAdapter → ExperienceViewModel
 *                                          ↓
 *                              ComponentResolver → ComponentRegistry
 *                                          ↓
 *                                    Renderer → Rendered Experience
 */

export { PresentationAdapter, PresentationAdapterError, INTERNAL_FIELDS } from './presentation.adapter.js'
export { ExperienceViewModel } from './experience.view-model.js'
export { ComponentRegistry, UnknownComponentError } from './component.registry.js'
export { ComponentResolver, ComponentResolverError } from './component.resolver.js'
export { Renderer, ExperienceRendererFactory, PresentationRenderError } from './renderer.js'

import { PresentationAdapter } from './presentation.adapter.js'
import { ExperienceViewModel } from './experience.view-model.js'
import { ComponentRegistry } from './component.registry.js'
import { ComponentResolver } from './component.resolver.js'
import { Renderer, ExperienceRendererFactory } from './renderer.js'

export default {
  PresentationAdapter,
  ExperienceViewModel,
  ComponentRegistry,
  ComponentResolver,
  Renderer,
  ExperienceRendererFactory
}
