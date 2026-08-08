/**
 * Experience Loaders
 * 
 * Configuration and Experience loaders.
 */

import { ConfigurationLoader } from './configuration.loader.js'
import { ExperienceLoader } from './experience.loader.js'

export {
  ConfigurationLoader,
  ExperienceLoader
}

export function createLoaders(config = {}) {
  return {
    configuration: new ConfigurationLoader(config.configuration),
    experience: new ExperienceLoader(config.experience)
  }
}

export default {
  ConfigurationLoader,
  ExperienceLoader,
  createLoaders
}
