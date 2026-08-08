/**
 * Configuration Sources
 * 
 * Filesystem and abstract configuration source interfaces.
 */

import { ConfigurationSource } from './configuration.source.js'
import { FilesystemConfigurationSource } from './filesystem.configuration.source.js'

export {
  ConfigurationSource,
  FilesystemConfigurationSource
}

export function createConfigurationSource(type = 'filesystem', options = {}) {
  switch (type) {
    case 'filesystem':
      return new FilesystemConfigurationSource(options)
    case 'memory':
      return new MemoryConfigurationSource(options)
    default:
      throw new Error(`Unknown configuration source type: ${type}`)
  }
}

class MemoryConfigurationSource extends ConfigurationSource {
  #data = {}

  async initialize(options = {}) {
    this.#data = options.data || {}
    return true
  }

  async loadPlatform() {
    return this.#data.platform || { id: 'valdi', name: 'Valdi' }
  }

  async loadCountry(countryCode) {
    return this.#data.countries?.[countryCode] || { code: countryCode }
  }

  async loadRegion(countryCode, regionCode) {
    return this.#data.regions?.[`${countryCode}-${regionCode}`] || { code: regionCode }
  }

  async loadDestination(countryCode, regionCode, destinationCode) {
    return this.#data.destinations?.[`${countryCode}-${regionCode}-${destinationCode}`] || { slug: destinationCode }
  }

  async loadCompany(countryCode, regionCode, destinationCode, companyCode) {
    return this.#data.companies?.[`${countryCode}-${regionCode}-${destinationCode}-${companyCode}`] || { slug: companyCode }
  }

  async loadExperience(experienceId) {
    return this.#data.experiences?.[experienceId] || { id: experienceId }
  }

  async loadModule(moduleId) {
    return this.#data.modules?.[moduleId] || { id: moduleId }
  }

  async loadAllCountries() {
    return this.#data.countries || {}
  }

  async loadAllDestinations(countryCode, regionCode) {
    const dests = {}
    for (const [key, dest] of Object.entries(this.#data.destinations || {})) {
      if (key.startsWith(`${countryCode}-${regionCode}-`)) {
        const parts = key.split('-')
        dests[parts[parts.length - 1]] = dest
      }
    }
    return dests
  }

  async loadAllCompanies(countryCode, regionCode, destinationCode) {
    const companies = {}
    for (const [key, company] of Object.entries(this.#data.companies || {})) {
      if (key.startsWith(`${countryCode}-${regionCode}-${destinationCode}-`)) {
        const parts = key.split('-')
        companies[parts[parts.length - 1]] = company
      }
    }
    return companies
  }

  async loadAllExperiences() {
    return this.#data.experiences || {}
  }
}

export default {
  ConfigurationSource,
  FilesystemConfigurationSource,
  createConfigurationSource
}
