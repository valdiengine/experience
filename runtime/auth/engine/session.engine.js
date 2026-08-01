import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { SessionError } from './auth.engine.errors.js'

export class SessionEngine {
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

  async create(identityId, options = {}) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'create' })
    const session = await this.#contract.createSession(identityId, options)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_SESSION_STARTED, { identityId, sessionId: session?.id })
    return session
  }

  async destroy(sessionId) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'destroy' })
    await this.#contract.destroySession(sessionId)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_SESSION_REVOKED, { sessionId })
  }

  async restore(token) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'restore' })
    const session = await this.#contract.restoreSession(token)
    if (session) this.#emit(AUTH_ENGINE_EVENTS.AUTH_SESSION_RESTORED, { sessionId: session.id })
    return session
  }

  async rotate(sessionId) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'rotate' })
    return this.#contract.rotate(sessionId)
  }

  async extend(sessionId, ttl) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'extend' })
    await this.#contract.extend(sessionId, ttl)
  }

  async list(identityId) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'list' })
    return this.#contract.list(identityId)
  }

  async terminate(sessionId) {
    if (!this.#contract) throw new SessionError('Session contract not available', { operation: 'terminate' })
    await this.#contract.terminate(sessionId)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_SESSION_REVOKED, { sessionId })
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default SessionEngine
