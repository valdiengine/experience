/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * Input validation for BusinessInteraction operations.
 */

import { INTERACTION_TYPES, INTERACTION_STATUS, VALID_STATUS_TRANSITIONS, INTERACTION_ENVIRONMENTS, extractApplicationIdentity } from './business-interaction.model.js'
import { CANONICAL_DOMAINS } from '../../application/application.identity.js'

const MAX_PAYLOAD_SIZE = 65536
const MAX_METADATA_SIZE = 16384
const MAX_STRING_LENGTH = 1000

export class BusinessInteractionValidator {
  #errors
  #warnings

  constructor() {
    this.#errors = []
    this.#warnings = []
  }

  validateCreate(data) {
    this.#errors = []
    this.#warnings = []

    if (!data) {
      this.#errors.push('Data is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    this.#validateType(data.type)
    this.#validateApplicationId(data.applicationId)
    this.#validateStatus(data.status, true)
    this.#validatePayload(data.payload)
    this.#validateMetadata(data.metadata)
    this.#validateEnvironment(data.environment)
    this.#validateDomainAndRoute(data.domain, data.route)
    this.#validateCompanyAndDestination(data.company, data.destination)

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateUpdate(data) {
    this.#errors = []
    this.#warnings = []

    if (!data) {
      this.#errors.push('Data is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (data.payload !== undefined) {
      this.#validatePayload(data.payload)
    }

    if (data.metadata !== undefined) {
      this.#validateMetadata(data.metadata)
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateStatusChange(fromStatus, toStatus) {
    this.#errors = []
    this.#warnings = []

    if (!fromStatus) {
      this.#errors.push('Current status is required')
    }

    if (!toStatus) {
      this.#errors.push('New status is required')
    }

    if (fromStatus && toStatus) {
      const validStatuses = Object.values(INTERACTION_STATUS)
      if (!validStatuses.includes(fromStatus)) {
        this.#errors.push(`Invalid current status: ${fromStatus}`)
      }
      if (!validStatuses.includes(toStatus)) {
        this.#errors.push(`Invalid new status: ${toStatus}`)
      }

      if (validStatuses.includes(fromStatus) && validStatuses.includes(toStatus)) {
        const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus]
        if (!validTransitions || !validTransitions.includes(toStatus)) {
          this.#errors.push(`Invalid transition from ${fromStatus} to ${toStatus}`)
        }
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateApplicationId(applicationId) {
    this.#errors = []
    this.#warnings = []

    if (!applicationId) {
      this.#errors.push('Application ID is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (typeof applicationId !== 'string') {
      this.#errors.push('Application ID must be a string')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (applicationId.includes('..') || applicationId.includes('~') || applicationId.includes('\0')) {
      this.#errors.push('Application ID contains invalid characters')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    const identity = extractApplicationIdentity(applicationId)
    if (!identity.valid) {
      this.#errors.push(identity.error)
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!CANONICAL_DOMAINS.includes(identity.domain)) {
      this.#errors.push(`Invalid domain: ${identity.domain}`)
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    return { valid: true, errors: [], warnings: [] }
  }

  validateApplicationIsolation(interaction, requestApplicationId) {
    this.#errors = []
    this.#warnings = []

    if (!interaction) {
      this.#errors.push('Interaction is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!requestApplicationId) {
      this.#errors.push('Request application ID is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (interaction.applicationId !== requestApplicationId) {
      this.#errors.push(`Application isolation violation: ${interaction.applicationId} cannot be accessed by ${requestApplicationId}`)
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    return { valid: true, errors: [], warnings: [] }
  }

  #validateType(type) {
    if (!type) {
      this.#errors.push('Interaction type is required')
      return
    }

    if (typeof type !== 'string') {
      this.#errors.push('Interaction type must be a string')
      return
    }

    if (!Object.values(INTERACTION_TYPES).includes(type)) {
      this.#errors.push(`Invalid interaction type: ${type}`)
    }
  }

  #validateApplicationId(applicationId) {
    if (!applicationId) {
      this.#errors.push('Application ID is required')
      return
    }

    if (typeof applicationId !== 'string') {
      this.#errors.push('Application ID must be a string')
      return
    }

    if (applicationId.includes('..') || applicationId.includes('~') || applicationId.includes('\0')) {
      this.#errors.push('Application ID contains invalid characters')
      return
    }

    const firstSlash = applicationId.indexOf('/')
    if (firstSlash === -1) {
      this.#errors.push('Application ID must be in format: domain/route')
      return
    }

    const domain = applicationId.substring(0, firstSlash)
    if (!CANONICAL_DOMAINS.includes(domain)) {
      this.#errors.push(`Invalid domain: ${domain}`)
    }
  }

  #validateStatus(status, isCreate = false) {
    if (isCreate && !status) {
      return
    }

    if (status && !Object.values(INTERACTION_STATUS).includes(status)) {
      this.#errors.push(`Invalid status: ${status}`)
    }
  }

  #validatePayload(payload) {
    if (payload === undefined) {
      return
    }

    if (typeof payload !== 'object' || payload === null) {
      this.#errors.push('Payload must be an object')
      return
    }

    const size = JSON.stringify(payload).length
    if (size > MAX_PAYLOAD_SIZE) {
      this.#errors.push(`Payload too large: ${size} bytes (max: ${MAX_PAYLOAD_SIZE})`)
    }

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        this.#errors.push(`Payload field "${key}" exceeds max length: ${value.length} > ${MAX_STRING_LENGTH}`)
      }
    }
  }

  #validateMetadata(metadata) {
    if (metadata === undefined) {
      return
    }

    if (typeof metadata !== 'object' || metadata === null) {
      this.#errors.push('Metadata must be an object')
      return
    }

    const size = JSON.stringify(metadata).length
    if (size > MAX_METADATA_SIZE) {
      this.#errors.push(`Metadata too large: ${size} bytes (max: ${MAX_METADATA_SIZE})`)
    }
  }

  #validateEnvironment(environment) {
    if (environment === undefined) {
      return
    }

    if (!Object.values(INTERACTION_ENVIRONMENTS).includes(environment)) {
      this.#errors.push(`Invalid environment: ${environment}`)
    }
  }

  #validateDomainAndRoute(domain, route) {
    if (!domain) {
      this.#errors.push('Domain is required')
    } else if (!CANONICAL_DOMAINS.includes(domain)) {
      this.#errors.push(`Invalid domain: ${domain}`)
    }

    if (!route) {
      this.#errors.push('Route is required')
    } else if (!route.startsWith('/')) {
      this.#errors.push('Route must start with /')
    } else if (route.includes('..') || route.includes('/../')) {
      this.#errors.push('Route cannot contain path traversal')
    }
  }

  #validateCompanyAndDestination(company, destination) {
    if (company !== undefined && company !== null) {
      if (typeof company !== 'string') {
        this.#errors.push('Company must be a string or null')
      }
    }

    if (destination !== undefined && destination !== null) {
      if (typeof destination !== 'string') {
        this.#errors.push('Destination must be a string or null')
      }
    }
  }
}

export function createBusinessInteractionValidator() {
  return new BusinessInteractionValidator()
}

export function validateInteractionCreate(data) {
  const validator = new BusinessInteractionValidator()
  return validator.validateCreate(data)
}

export function validateInteractionUpdate(data) {
  const validator = new BusinessInteractionValidator()
  return validator.validateUpdate(data)
}

export function validateStatusTransition(fromStatus, toStatus) {
  const validator = new BusinessInteractionValidator()
  return validator.validateStatusChange(fromStatus, toStatus)
}

export function validateApplicationIdForInteraction(applicationId) {
  const validator = new BusinessInteractionValidator()
  return validator.validateApplicationId(applicationId)
}

export function validateInteractionIsolation(interaction, requestApplicationId) {
  const validator = new BusinessInteractionValidator()
  return validator.validateApplicationIsolation(interaction, requestApplicationId)
}

export default {
  BusinessInteractionValidator,
  createBusinessInteractionValidator,
  validateInteractionCreate,
  validateInteractionUpdate,
  validateStatusTransition,
  validateApplicationIdForInteraction,
  validateInteractionIsolation,
  MAX_PAYLOAD_SIZE,
  MAX_METADATA_SIZE,
  MAX_STRING_LENGTH
}
