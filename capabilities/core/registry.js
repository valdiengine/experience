/**
 * CapabilityRegistry — Registry of available capabilities
 *
 * Manages capability registrations and lookups.
 * Does NOT know about specific capability business logic.
 */
import { validateCapability, createCapability, CAPABILITY_STATES } from './schema.js'

export class CapabilityRegistry {
  #capabilities = new Map()

  /**
   * Register a capability
   *
   * Accepts either:
   * - A capability instance (has init, activate, deactivate, destroy methods)
   * - A plain definition object (will be wrapped with createCapability)
   *
   * @param {object} definition - Capability definition or instance
   * @returns {object} - Registered capability
   */
  register(definition) {
    // If definition already implements the capability interface, store directly
    if (definition.id && definition.init && definition.activate && definition.deactivate && definition.destroy) {
      definition.state = CAPABILITY_STATES.REGISTERED
      this.#capabilities.set(definition.id, definition)
      return definition
    }

    // Otherwise, create from plain definition (backward compat)
    const capability = createCapability(definition)
    const validation = validateCapability(capability)

    if (!validation.valid) {
      throw new Error(`Invalid capability: ${validation.errors.join(', ')}`)
    }

    this.#capabilities.set(capability.id, capability)
    return capability
  }

  /**
   * Unregister a capability
   * @param {string} capabilityId - Capability ID
   * @returns {boolean} - true if removed
   */
  unregister(capabilityId) {
    return this.#capabilities.delete(capabilityId)
  }

  /**
   * Get capability by ID
   * @param {string} capabilityId - Capability ID
   * @returns {object|null}
   */
  get(capabilityId) {
    return this.#capabilities.get(capabilityId) || null
  }

  /**
   * Check if capability exists
   * @param {string} capabilityId - Capability ID
   * @returns {boolean}
   */
  has(capabilityId) {
    return this.#capabilities.has(capabilityId)
  }

  /**
   * Get all registered capabilities
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#capabilities.values())
  }

  /**
   * List all capabilities with their state
   * @returns {object[]}
   */
  list() {
    return this.getAll().map(cap => ({
      id: cap.id,
      name: cap.name,
      version: cap.version,
      state: cap.state,
      dependencies: cap.dependencies,
    }))
  }

  /**
   * Get capabilities by state
   * @param {string} state - Capability state
   * @returns {object[]}
   */
  getByState(state) {
    return this.getAll().filter(cap => cap.state === state)
  }

  /**
   * Get active capabilities
   * @returns {object[]}
   */
  getActive() {
    return this.getByState(CAPABILITY_STATES.ACTIVE)
  }

  /**
   * Update capability state
   * @param {string} capabilityId - Capability ID
   * @param {string} state - New state
   */
  setState(capabilityId, state) {
    const capability = this.#capabilities.get(capabilityId)
    if (capability) {
      capability.state = state
    }
  }

  /**
   * Get capability count
   * @returns {number}
   */
  get size() {
    return this.#capabilities.size
  }

  /**
   * Clear all capabilities
   */
  clear() {
    this.#capabilities.clear()
  }
}
