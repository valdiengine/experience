/**
 * BaseCapability — Abstract base class for all capabilities
 *
 * Provides the standard contract and lifecycle methods.
 * All capabilities MUST extend this class or implement the same interface.
 *
 * Context received:
 * {
 *   tenant,      // Current tenant configuration
 *   dataManager, // Central data access layer
 *   eventBus,    // Event bus for communication
 *   provider,    // Data provider for this tenant
 *   config,      // Capability-specific configuration
 * }
 */
import { CAPABILITY_STATES } from './schema.js'

export class BaseCapability {
  #state = CAPABILITY_STATES.REGISTERED
  #context = null
  #config = {}

  /**
   * @type {string} Unique capability identifier (lowercase, hyphens)
   */
  static id = null

  /**
   * @type {string} Human-readable name
   */
  static name = null

  /**
   * @type {string} Semver version
   */
  static version = '1.0.0'

  /**
   * @type {string[]} IDs of required dependencies
   */
  static dependencies = []

  /**
   * Get capability ID
   * @returns {string}
   */
  get id() {
    return this.constructor.id
  }

  /**
   * Get capability name
   * @returns {string}
   */
  get name() {
    return this.constructor.name
  }

  /**
   * Get capability version
   * @returns {string}
   */
  get version() {
    return this.constructor.version
  }

  /**
   * Get capability dependencies
   * @returns {string[]}
   */
  get dependencies() {
    return this.constructor.dependencies
  }

  /**
   * Get current state
   * @returns {string}
   */
  get state() {
    return this.#state
  }

  /**
   * Set state (internal use only)
   * @param {string} newState - New state
   */
  set state(newState) {
    this.#state = newState
  }

  /**
   * Get context
   * @returns {object|null}
   */
  get context() {
    return this.#context
  }

  /**
   * Get config
   * @returns {object}
   */
  get config() {
    return this.#config
  }

  /**
   * Get tenant from context
   * @returns {object|null}
   */
  get tenant() {
    return this.#context?.tenant || null
  }

  /**
   * Get dataManager from context
   * @returns {object|null}
   */
  get dataManager() {
    return this.#context?.dataManager || null
  }

  /**
   * Get eventBus from context
   * @returns {object|null}
   */
  get eventBus() {
    return this.#context?.eventBus || null
  }

  /**
   * Get provider from context
   * @returns {object|null}
   */
  get provider() {
    return this.#context?.provider || null
  }

  /**
   * Initialize capability
   * @param {object} context - Capability context
   * @param {object} config - Capability-specific configuration
   * @returns {Promise<void>}
   */
  async init(context, config = {}) {
    this.#context = context
    this.#config = config
    this.#state = CAPABILITY_STATES.LOADED
  }

  /**
   * Activate capability
   * @returns {Promise<void>}
   */
  async activate() {
    this.#state = CAPABILITY_STATES.ACTIVE
  }

  /**
   * Deactivate capability
   * @returns {Promise<void>}
   */
  async deactivate() {
    this.#state = CAPABILITY_STATES.INACTIVE
  }

  /**
   * Destroy capability and clean up resources
   * @returns {Promise<void>}
   */
  async destroy() {
    this.#context = null
    this.#config = {}
    this.#state = CAPABILITY_STATES.REGISTERED
  }

  /**
   * Emit event via EventBus
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    this.eventBus?.emit(event, data)
  }

  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    return this.eventBus?.on(event, handler)
  }

  /**
   * Get capability as plain object (for registry)
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      dependencies: this.dependencies,
      state: this.#state,
    }
  }
}
