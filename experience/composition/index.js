/**
 * Experience Composition
 * 
 * Composes experiences from resolved configurations.
 */

import { ExperienceComposer } from './experience.composer.js'

export {
  ExperienceComposer
}

export function createComposition(config = {}) {
  return new ExperienceComposer(config)
}

export default {
  ExperienceComposer,
  createComposition
}
