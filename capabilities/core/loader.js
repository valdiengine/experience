/**
 * CapabilityLoader — Loads and manages capabilities based on tenant config
 *
 * Responsibilities:
 * - Register capabilities from definitions
 * - Load capabilities specified by tenant
 * - Verify dependencies before activation
 * - Activate/deactivate capabilities
 * - Emit capability events
 *
 * Does NOT know about: specific capabilities or business logic.
 */
import { CapabilityRegistry } from './registry.js'
import { CAPABILITY_STATES } from './schema.js'

export class CapabilityLoader {
  #registry
  #eventBus
  #context = {}
  #initialized = false

  /**
   * @param {object} eventBus - Event bus instance
   */
  constructor(eventBus) {
    this.#registry = new CapabilityRegistry()
    this.#eventBus = eventBus
  }

  /**
   * Initialize CapabilityLoader
   * @param {object} options - Initialization options
   * @param {object[]} options.capabilities - Array of capability definitions
   * @param {object} options.context - Context to pass to capabilities
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    // Set context
    if (options.context) {
      this.#context = options.context
    }

    // Register provided capabilities
    if (options.capabilities) {
      for (const capability of options.capabilities) {
        this.register(capability)
      }
    }

    this.#initialized = true
  }

  /**
   * Register a capability
   * @param {object} definition - Capability definition
   * @returns {object} - Registered capability
   */
  register(definition) {
    const capability = this.#registry.register(definition)
    this.#emit('capability:loaded', { capability })
    return capability
  }

  /**
   * Load capabilities for a tenant
   * @param {string[]} capabilityIds - Array of capability IDs to load
   * @returns {Promise<object[]>} - Array of loaded capabilities
   */
  async loadCapabilities(capabilityIds = []) {
    const loaded = []

    for (const id of capabilityIds) {
      const capability = this.#registry.get(id)
      if (!capability) {
        console.warn(`[CapabilityLoader] Unknown capability: ${id}`)
        continue
      }

      // Check dependencies
      const depsValid = this.#checkDependencies(capability)
      if (!depsValid) {
        this.#emit('capability:error', {
          capability,
          error: 'Missing dependencies',
        })
        continue
      }

      // Initialize if needed
      if (capability.init && capability.state === CAPABILITY_STATES.REGISTERED) {
        try {
          await capability.init(this.#context)
          this.#registry.setState(id, CAPABILITY_STATES.LOADED)
        } catch (error) {
          this.#emit('capability:error', { capability, error: error.message })
          this.#registry.setState(id, CAPABILITY_STATES.ERROR)
          continue
        }
      }

      loaded.push(capability)
    }

    return loaded
  }

  /**
   * Activate a capability
   * @param {string} capabilityId - Capability ID to activate
   * @returns {Promise<boolean>} - true if activated
   */
  async activate(capabilityId) {
    const capability = this.#registry.get(capabilityId)
    if (!capability) return false

    // Check dependencies
    if (!this.#checkDependencies(capability)) {
      this.#emit('capability:error', {
        capability,
        error: 'Missing dependencies for activation',
      })
      return false
    }

    try {
      if (capability.activate) {
        await capability.activate()
      }
      this.#registry.setState(capabilityId, CAPABILITY_STATES.ACTIVE)
      this.#emit('capability:activated', { capability })
      return true
    } catch (error) {
      this.#emit('capability:error', { capability, error: error.message })
      this.#registry.setState(capabilityId, CAPABILITY_STATES.ERROR)
      return false
    }
  }

  /**
   * Deactivate a capability
   * @param {string} capabilityId - Capability ID to deactivate
   * @returns {Promise<boolean>} - true if deactivated
   */
  async deactivate(capabilityId) {
    const capability = this.#registry.get(capabilityId)
    if (!capability) return false

    try {
      if (capability.deactivate) {
        await capability.deactivate()
      }
      this.#registry.setState(capabilityId, CAPABILITY_STATES.INACTIVE)
      this.#emit('capability:deactivated', { capability })
      return true
    } catch (error) {
      this.#emit('capability:error', { capability, error: error.message })
      return false
    }
  }

  /**
   * Destroy a capability
   * @param {string} capabilityId - Capability ID to destroy
   * @returns {Promise<boolean>} - true if destroyed
   */
  async destroy(capabilityId) {
    const capability = this.#registry.get(capabilityId)
    if (!capability) return false

    // Deactivate first if active
    if (capability.state === CAPABILITY_STATES.ACTIVE) {
      await this.deactivate(capabilityId)
    }

    try {
      if (capability.destroy) {
        await capability.destroy()
      }
      this.#registry.unregister(capabilityId)
      return true
    } catch (error) {
      this.#emit('capability:error', { capability, error: error.message })
      return false
    }
  }

  /**
   * Get capability by ID
   * @param {string} capabilityId - Capability ID
   * @returns {object|null}
   */
  get(capabilityId) {
    return this.#registry.get(capabilityId)
  }

  /**
   * Get all capabilities
   * @returns {object[]}
   */
  getAll() {
    return this.#registry.getAll()
  }

  /**
   * Get active capabilities
   * @returns {object[]}
   */
  getActive() {
    return this.#registry.getActive()
  }

  /**
   * Check if capability is active
   * @param {string} capabilityId - Capability ID
   * @returns {boolean}
   */
  isActive(capabilityId) {
    const capability = this.#registry.get(capabilityId)
    return capability?.state === CAPABILITY_STATES.ACTIVE
  }

  /**
   * Get capability count
   * @returns {number}
   */
  get size() {
    return this.#registry.size
  }

  /**
   * Check if CapabilityLoader is initialized
   * @returns {boolean}
   */
  get initialized() {
    return this.#initialized
  }

  // ── Private Methods ──

  /**
   * Check if all dependencies are met
   * @private
   */
  #checkDependencies(capability) {
    if (!capability.dependencies?.length) return true

    const missing = capability.dependencies.filter(depId => {
      const dep = this.#registry.get(depId)
      return !dep || dep.state !== CAPABILITY_STATES.ACTIVE
    })

    if (missing.length > 0) {
      this.#emit('capability:dependency_missing', {
        capability,
        missing,
      })
      return false
    }

    return true
  }

  /**
   * Emit event via EventBus
   * @private
   */
  #emit(event, data) {
    this.#eventBus.emit(event, data)
  }
}
