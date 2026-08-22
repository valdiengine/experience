/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * BusinessInteraction model, types, and schemas.
 */

import { DESTINATION_MAP } from '../../application/application.identity.js'

export const INTERACTION_TYPES = Object.freeze({
  QUOTE_REQUEST: 'quote_request',
  CONTACT_REQUEST: 'contact_request',
  LEAD: 'lead',
  BOOKING_REQUEST: 'booking_request'
})

export const INTERACTION_STATUS = Object.freeze({
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESPONDED: 'responded',
  CONVERTED: 'converted',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
})

export const VALID_STATUS_TRANSITIONS = Object.freeze({
  [INTERACTION_STATUS.NEW]: [INTERACTION_STATUS.IN_PROGRESS, INTERACTION_STATUS.CANCELLED],
  [INTERACTION_STATUS.IN_PROGRESS]: [INTERACTION_STATUS.RESPONDED, INTERACTION_STATUS.CANCELLED],
  [INTERACTION_STATUS.RESPONDED]: [INTERACTION_STATUS.CONVERTED, INTERACTION_STATUS.CLOSED, INTERACTION_STATUS.CANCELLED],
  [INTERACTION_STATUS.CONVERTED]: [INTERACTION_STATUS.CLOSED],
  [INTERACTION_STATUS.CLOSED]: [],
  [INTERACTION_STATUS.CANCELLED]: []
})

export const INTERACTION_EVENT_TYPES = Object.freeze({
  CREATED: 'interaction:created',
  UPDATED: 'interaction:updated',
  STATUS_CHANGED: 'interaction:status_changed',
  DELETED: 'interaction:deleted'
})

export const INTERACTION_ENVIRONMENTS = Object.freeze({
  PREVIEW: 'preview',
  PRODUCTION: 'production'
})

export class BusinessInteraction {
  #id
  #type
  #applicationId
  #domain
  #route
  #company
  #destination
  #status
  #source
  #payload
  #metadata
  #correlationId
  #environment
  #createdAt
  #updatedAt
  #version

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#type = data.type || null
    this.#applicationId = data.applicationId || null
    this.#domain = data.domain || null
    this.#route = data.route || null
    this.#company = data.company || null
    this.#destination = data.destination || null
    this.#status = data.status || INTERACTION_STATUS.NEW
    this.#source = data.source || null
    this.#payload = data.payload || {}
    this.#metadata = data.metadata || {}
    this.#correlationId = data.correlationId || this.#generateCorrelationId()
    this.#environment = data.environment || INTERACTION_ENVIRONMENTS.PRODUCTION
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#updatedAt = data.updatedAt || new Date().toISOString()
    this.#version = data.version || 1
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `int_${timestamp}${random}`
  }

  #generateCorrelationId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `corr_${timestamp}${random}`
  }

  get id() {
    return this.#id
  }

  get type() {
    return this.#type
  }

  get applicationId() {
    return this.#applicationId
  }

  get domain() {
    return this.#domain
  }

  get route() {
    return this.#route
  }

  get company() {
    return this.#company
  }

  get destination() {
    return this.#destination
  }

  get status() {
    return this.#status
  }

  get source() {
    return this.#source
  }

  get payload() {
    return { ...this.#payload }
  }

  get metadata() {
    return { ...this.#metadata }
  }

  get correlationId() {
    return this.#correlationId
  }

  get environment() {
    return this.#environment
  }

  get createdAt() {
    return this.#createdAt
  }

  get updatedAt() {
    return this.#updatedAt
  }

  get version() {
    return this.#version
  }

  setStatus(newStatus) {
    const transitions = VALID_STATUS_TRANSITIONS[this.#status]
    if (!transitions || !transitions.includes(newStatus)) {
      return false
    }
    this.#status = newStatus
    this.#updatedAt = new Date().toISOString()
    this.#version++
    return true
  }

  updatePayload(updates) {
    this.#payload = { ...this.#payload, ...updates }
    this.#updatedAt = new Date().toISOString()
    this.#version++
  }

  updateMetadata(updates) {
    this.#metadata = { ...this.#metadata, ...updates }
    this.#updatedAt = new Date().toISOString()
  }

  toJSON() {
    return {
      id: this.#id,
      type: this.#type,
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      company: this.#company,
      destination: this.#destination,
      status: this.#status,
      source: this.#source,
      payload: { ...this.#payload },
      metadata: { ...this.#metadata },
      correlationId: this.#correlationId,
      environment: this.#environment,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      version: this.#version
    }
  }

  toEvent() {
    return {
      id: `evt_${this.#id}`,
      type: INTERACTION_EVENT_TYPES.CREATED,
      source: this.#source || 'business-interaction-core',
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      company: this.#company,
      destination: this.#destination,
      timestamp: new Date().toISOString(),
      correlationId: this.#correlationId,
      payload: {
        interactionId: this.#id,
        interactionType: this.#type,
        status: this.#status,
        environment: this.#environment
      }
    }
  }

  freeze() {
    return Object.freeze(this.toJSON())
  }

  static fromJSON(json) {
    return new BusinessInteraction(json)
  }

  static getTypes() {
    return { ...INTERACTION_TYPES }
  }

  static getStatuses() {
    return { ...INTERACTION_STATUS }
  }

  static getEnvironments() {
    return { ...INTERACTION_ENVIRONMENTS }
  }

  static isValidType(type) {
    return Object.values(INTERACTION_TYPES).includes(type)
  }

  static isValidStatus(status) {
    return Object.values(INTERACTION_STATUS).includes(status)
  }

  static isValidTransition(fromStatus, toStatus) {
    const transitions = VALID_STATUS_TRANSITIONS[fromStatus]
    return transitions && transitions.includes(toStatus)
  }
}

export function createBusinessInteraction(data) {
  return new BusinessInteraction(data)
}

export function validateInteractionType(type) {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Interaction type is required' }
  }
  if (!BusinessInteraction.isValidType(type)) {
    return { valid: false, error: `Invalid interaction type: ${type}` }
  }
  return { valid: true }
}

export function validateInteractionStatus(status) {
  if (!status || typeof status !== 'string') {
    return { valid: false, error: 'Status is required' }
  }
  if (!BusinessInteraction.isValidStatus(status)) {
    return { valid: false, error: `Invalid status: ${status}` }
  }
  return { valid: true }
}

export function extractApplicationIdentity(applicationId) {
  if (!applicationId || typeof applicationId !== 'string') {
    return { valid: false, error: 'Application ID is required' }
  }

  const parts = applicationId.split('/')
  if (parts.length < 2) {
    return { valid: false, error: 'Application ID must be in format: domain/route' }
  }

  const domain = parts[0]
  const route = '/' + parts.slice(1).join('/')

  return {
    valid: true,
    domain,
    route,
    company: null,
    destination: DESTINATION_MAP[domain] || null
  }
}

export default {
  INTERACTION_TYPES,
  INTERACTION_STATUS,
  VALID_STATUS_TRANSITIONS,
  INTERACTION_EVENT_TYPES,
  INTERACTION_ENVIRONMENTS,
  BusinessInteraction,
  createBusinessInteraction,
  validateInteractionType,
  validateInteractionStatus,
  extractApplicationIdentity
}
