/**
 * Configuration Source Interface
 * 
 * Abstract interface for configuration sources.
 * Allows filesystem, database, API, or remote configuration sources.
 */

export class ConfigurationSource {
  constructor(options = {}) {
    if (new.target === ConfigurationSource) {
      throw new Error('ConfigurationSource is abstract. Use FilesystemConfigurationSource or create a subclass.')
    }
    this.options = options
  }

  async loadPlatform() {
    throw new Error('loadPlatform() must be implemented')
  }

  async loadCountry(countryCode) {
    throw new Error('loadCountry() must be implemented')
  }

  async loadRegion(countryCode, regionCode) {
    throw new Error('loadRegion() must be implemented')
  }

  async loadDestination(countryCode, regionCode, destinationCode) {
    throw new Error('loadDestination() must be implemented')
  }

  async loadCompany(countryCode, regionCode, destinationCode, companyCode) {
    throw new Error('loadCompany() must be implemented')
  }

  async loadExperience(experienceId) {
    throw new Error('loadExperience() must be implemented')
  }

  async loadModule(moduleId) {
    throw new Error('loadModule() must be implemented')
  }

  async loadAllCountries() {
    throw new Error('loadAllCountries() must be implemented')
  }

  async loadAllDestinations(countryCode, regionCode) {
    throw new Error('loadAllDestinations() must be implemented')
  }

  async loadAllCompanies(countryCode, regionCode, destinationCode) {
    throw new Error('loadAllCompanies() must be implemented')
  }

  async loadAllExperiences() {
    throw new Error('loadAllExperiences() must be implemented')
  }

  async healthCheck() {
    return { status: 'ok', name: this.constructor.name }
  }

  async stop() {
    return true
  }
}

export default ConfigurationSource
