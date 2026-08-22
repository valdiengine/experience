/**
 * Application Configuration Validator
 *
 * P15.8.1 - Application Configuration Model
 *
 * Validates Application Configuration objects against schema rules.
 * Ensures security: no path traversal, no infrastructure leaks,
 * no invalid domain/route values.
 *
 * Framework-free implementation.
 */

import {
  ApplicationIdentity,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  DESTINATION_MAP
} from './application.identity.js'

import {
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  validateExperienceType,
  validateContentSource,
  validateMigrationState,
  validateCapabilityKey,
  validateCompanySlug
} from './application.schema.js'

export class ApplicationValidator {
  #strict

  constructor(options = {}) {
    this.#strict = options.strict === true
  }

  validate(config) {
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Configuration must be an object']
      }
    }

    const errors = []

    const identityResult = this.#validateIdentity(config.identity)
    if (!identityResult.valid) {
      errors.push(...identityResult.errors)
    }

    const destinationResult = this.#validateDestination(config.destination)
    if (!destinationResult.valid) {
      errors.push(...destinationResult.errors)
    }

    const companyResult = this.#validateCompany(config.company)
    if (!companyResult.valid) {
      errors.push(...companyResult.errors)
    }

    const experienceResult = this.#validateExperience(config.experience)
    if (!experienceResult.valid) {
      errors.push(...experienceResult.errors)
    }

    const capabilitiesResult = this.#validateCapabilities(config.capabilities)
    if (!capabilitiesResult.valid) {
      errors.push(...capabilitiesResult.errors)
    }

    const themeResult = this.#validateTheme(config.theme)
    if (!themeResult.valid) {
      errors.push(...themeResult.errors)
    }

    const contentResult = this.#validateContent(config.content)
    if (!contentResult.valid) {
      errors.push(...contentResult.errors)
    }

    const seoResult = this.#validateSeo(config.seo)
    if (!seoResult.valid) {
      errors.push(...seoResult.errors)
    }

    const integrationsResult = this.#validateIntegrations(config.integrations)
    if (!integrationsResult.valid) {
      errors.push(...integrationsResult.errors)
    }

    const migrationResult = this.#validateMigration(config.migration)
    if (!migrationResult.valid) {
      errors.push(...migrationResult.errors)
    }

    const infrastructureResult = this.#checkInfrastructureLeaks(config)
    if (!infrastructureResult.valid) {
      errors.push(...infrastructureResult.errors)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  #validateIdentity(identity) {
    const errors = []

    if (!identity || typeof identity !== 'object') {
      return { valid: false, errors: ['Identity must be an object'] }
    }

    if (!ApplicationIdentity.isValidDomain(identity.domain)) {
      errors.push(`Invalid domain: ${identity.domain}`)
    }

    if (!ApplicationIdentity.isValidRoute(identity.route)) {
      errors.push(`Invalid route: ${identity.route}`)
    }

    if (identity.applicationId) {
      const expected = `${identity.domain}${identity.route}`
      if (identity.applicationId !== expected) {
        errors.push(`Application ID mismatch: expected "${expected}", got "${identity.applicationId}"`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateDestination(destination) {
    const errors = []

    if (!destination || typeof destination !== 'object') {
      return { valid: false, errors: ['Destination must be an object'] }
    }

    if (destination.slug) {
      const validDestinations = Object.values(DESTINATION_MAP)
      if (!validDestinations.includes(destination.slug)) {
        errors.push(`Invalid destination slug: ${destination.slug}`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateCompany(company) {
    const errors = []

    if (company === null || company === undefined) {
      return { valid: true, errors: [] }
    }

    if (typeof company === 'string') {
      const result = validateCompanySlug(company)
      if (!result.valid) {
        errors.push(result.error)
      }
      return { valid: errors.length === 0, errors }
    }

    if (typeof company !== 'object') {
      return { valid: false, errors: ['Company must be null, string, or object'] }
    }

    if (company.slug) {
      const result = validateCompanySlug(company.slug)
      if (!result.valid) {
        errors.push(result.error)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateExperience(experience) {
    const errors = []

    if (!experience || typeof experience !== 'object') {
      return { valid: false, errors: ['Experience must be an object'] }
    }

    if (experience.type === null || experience.type === undefined) {
      return { valid: true, errors: [] }
    }

    const result = validateExperienceType(experience.type)
    if (!result.valid) {
      errors.push(result.error)
    }

    return { valid: errors.length === 0, errors }
  }

  #validateCapabilities(capabilities) {
    const errors = []

    if (!capabilities || typeof capabilities !== 'object') {
      return { valid: true, errors: [] }
    }

    for (const [key, value] of Object.entries(capabilities)) {
      if (!validateCapabilityKey(key)) {
        errors.push(`Invalid capability key: ${key}`)
        continue
      }

      if (typeof value === 'function') {
        errors.push(`Capability value cannot be a function: ${key}`)
      }

      if (this.#strict && typeof value === 'object' && value !== null) {
        const serialized = JSON.stringify(value)
        if (serialized.includes('Function') || serialized.includes('$')) {
          errors.push(`Suspicious capability value in: ${key}`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateTheme(theme) {
    const errors = []

    if (!theme || typeof theme !== 'object') {
      return { valid: true, errors: [] }
    }

    if (theme.primaryColor) {
      if (typeof theme.primaryColor !== 'string') {
        errors.push('Theme primaryColor must be a string')
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor)) {
        errors.push('Theme primaryColor must be a valid hex color')
      }
    }

    if (theme.fontFamily && typeof theme.fontFamily !== 'string') {
      errors.push('Theme fontFamily must be a string')
    }

    return { valid: errors.length === 0, errors }
  }

  #validateContent(content) {
    const errors = []

    if (!content || typeof content !== 'object') {
      return { valid: false, errors: ['Content must be an object'] }
    }

    const result = validateContentSource(content.source)
    if (!result.valid) {
      errors.push(result.error)
    }

    if (content.configuration && typeof content.configuration === 'object') {
      const infraKeys = ['pg', 'mysql', 'mongodb', 'drizzle', 'stripe', 'sendgrid', 'twilio', 'aws', 'S3Client', 'StorageProvider']
      for (const key of infraKeys) {
        if (key in content.configuration) {
          errors.push(`Infrastructure reference not allowed in content configuration: ${key}`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateSeo(seo) {
    const errors = []

    if (!seo || typeof seo !== 'object') {
      return { valid: true, errors: [] }
    }

    if (seo.canonical) {
      try {
        const url = new URL(seo.canonical)
        if (!CANONICAL_DOMAINS.some(d => url.hostname === d || url.hostname === `www.${d}`)) {
          errors.push('SEO canonical URL must use a canonical domain')
        }
      } catch {
        errors.push('SEO canonical must be a valid URL')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateIntegrations(integrations) {
    const errors = []

    if (!integrations || typeof integrations !== 'object') {
      return { valid: true, errors: [] }
    }

    const allowed = ['whatsapp', 'maps', 'booking', 'payments', 'social', 'notifications', 'analytics']

    for (const [key, value] of Object.entries(integrations)) {
      if (!allowed.includes(key)) {
        errors.push(`Unknown integration: ${key}`)
        continue
      }

      if (typeof value !== 'object' || value === null) {
        errors.push(`Integration ${key} must be an object`)
      }

      if (value && typeof value === 'object') {
        const infraKeys = ['apiKey', 'secret', 'password', 'token', 'credential']
        for (const ikey of infraKeys) {
          if (ikey in value) {
            errors.push(`Credentials not allowed in integration configuration: ${key}.${ikey}`)
          }
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  #validateMigration(migration) {
    const errors = []

    if (!migration || typeof migration !== 'object') {
      return { valid: false, errors: ['Migration must be an object'] }
    }

    const result = validateMigrationState(migration.state)
    if (!result.valid) {
      errors.push(result.error)
    }

    return { valid: errors.length === 0, errors }
  }

  #checkInfrastructureLeaks(config) {
    const errors = []
    const forbidden = ['pg', 'mysql', 'mongodb', 'drizzle', 'postgres', 'redis', 'elasticsearch']

    const checkObject = (obj, path) => {
      if (!obj || typeof obj !== 'object') return

      for (const key of Object.keys(obj)) {
        if (forbidden.some(f => key.toLowerCase().includes(f))) {
          errors.push(`Infrastructure reference forbidden: ${path}${key}`)
        }

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkObject(obj[key], `${path}${key}.`)
        }
      }
    }

    checkObject(config, '')
    return { valid: errors.length === 0, errors }
  }
}

export function createApplicationValidator(options) {
  return new ApplicationValidator(options)
}

export function validateApplicationConfig(config, options) {
  const validator = new ApplicationValidator(options)
  return validator.validate(config)
}

export default {
  ApplicationValidator,
  createApplicationValidator,
  validateApplicationConfig
}