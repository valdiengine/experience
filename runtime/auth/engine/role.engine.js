import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { RoleError } from './auth.engine.errors.js'

export class RoleEngine {
  #contract = null
  #eventBus = null
  #initialized = false

  constructor(options = {}) {
    this.#contract = options.contract || null
    this.#eventBus = options.eventBus || null
  }

  setContract(contract) {
    this.#contract = contract
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async initialize() {
    this.#initialized = true
  }

  async shutdown() {
    this.#initialized = false
  }

  async dispose() {
    this.#contract = null
    this.#initialized = false
  }

  async health() {
    return { status: this.#initialized ? 'healthy' : 'unknown', initialized: this.#initialized }
  }

  available() {
    return this.#initialized && !!this.#contract
  }

  supports(feature) {
    return this.#contract?.supports?.(feature) ?? false
  }

  async assign(identityId, roleId) {
    if (!this.#contract) throw new RoleError('Role contract not available', { operation: 'assign' })
    await this.#contract.assign(identityId, roleId)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_ROLE_ASSIGNED, { identityId, roleId })
  }

  async remove(identityId, roleId) {
    if (!this.#contract) throw new RoleError('Role contract not available', { operation: 'remove' })
    await this.#contract.remove(identityId, roleId)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_ROLE_REMOVED, { identityId, roleId })
  }

  async list(identityId) {
    if (!this.#contract) throw new RoleError('Role contract not available', { operation: 'list' })
    return this.#contract.list(identityId)
  }

  async inherit(roleId) {
    if (!this.#contract) throw new RoleError('Role contract not available', { operation: 'inherit' })
    return this.#contract.inherit(roleId)
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default RoleEngine
