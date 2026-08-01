import { SessionEngine } from './session.engine.js'
import { TokenEngine } from './token.engine.js'
import { AuthorizationEngine } from './authorization.engine.js'
import { PermissionEngine } from './permission.engine.js'
import { RoleEngine } from './role.engine.js'
import { TrustEngine } from './trust.engine.js'
import { DeviceEngine } from './device.engine.js'
import { MfaEngine } from './mfa.engine.js'
import { AnonymousEngine } from './anonymous.engine.js'
import { AuditEngine } from './audit.engine.js'
import { AuthEngineRegistry } from './auth.engine.registry.js'
import { AuthEngineFactory } from './auth.engine.factory.js'
import { AuthEngineContext } from './auth.engine.context.js'
import { AuthEngineHealth } from './auth.engine.health.js'
import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { AuthenticationEngineError } from './auth.engine.errors.js'

export class AuthenticationEngine {
  #registry = null
  #factory = null
  #health = null
  #eventBus = null
  #initialized = false
  #config = {}

  #session = null
  #token = null
  #authorization = null
  #permission = null
  #role = null
  #trust = null
  #device = null
  #mfa = null
  #anonymous = null
  #audit = null

  constructor(config = {}) {
    this.#config = config
    this.#registry = new AuthEngineRegistry()
    this.#factory = new AuthEngineFactory(this.#registry, config)
    this.#health = new AuthEngineHealth(config)

    this.#session = new SessionEngine(config)
    this.#token = new TokenEngine(config)
    this.#authorization = new AuthorizationEngine({ ...config, permissionEngine: this.#permission, roleEngine: this.#role })
    this.#permission = new PermissionEngine(config)
    this.#role = new RoleEngine(config)
    this.#trust = new TrustEngine(config)
    this.#device = new DeviceEngine(config)
    this.#mfa = new MfaEngine(config)
    this.#anonymous = new AnonymousEngine(config)
    this.#audit = new AuditEngine(config)
  }

  get session() { return this.#session }
  get token() { return this.#token }
  get authorization() { return this.#authorization }
  get permission() { return this.#permission }
  get role() { return this.#role }
  get trustEngine() { return this.#trust }
  get deviceEngine() { return this.#device }
  get mfaEngine() { return this.#mfa }
  get anonymousEngine() { return this.#anonymous }
  get auditEngine() { return this.#audit }
  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get health() { return this.#health }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#health.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return
    this.#registry.initialize()
    await this.#session.initialize()
    await this.#token.initialize()
    await this.#authorization.initialize()
    await this.#permission.initialize()
    await this.#role.initialize()
    await this.#trust.initialize()
    await this.#device.initialize()
    await this.#mfa.initialize()
    await this.#anonymous.initialize()
    await this.#audit.initialize()
    this.#initialized = true
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_AUTHENTICATED, { engine: 'authentication', status: 'initialized' })
  }

  async shutdown() {
    await this.#audit.shutdown()
    await this.#anonymous.shutdown()
    await this.#mfa.shutdown()
    await this.#device.shutdown()
    await this.#trust.shutdown()
    await this.#role.shutdown()
    await this.#permission.shutdown()
    await this.#authorization.shutdown()
    await this.#token.shutdown()
    await this.#session.shutdown()
    this.#initialized = false
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_LOGOUT, { engine: 'authentication', status: 'shutdown' })
  }

  async dispose() {
    await this.#factory.disposeAll()
    for (const engine of [this.#session, this.#token, this.#authorization, this.#permission, this.#role, this.#trust, this.#device, this.#mfa, this.#anonymous, this.#audit]) {
      await engine.dispose()
    }
    this.#initialized = false
  }

  async healthCheck() {
    return this.#health.checkAll(this)
  }

  async health() {
    return this.#health.checkAll(this)
  }

  available() {
    return this.#initialized
  }

  supports(feature) {
    const features = ['login', 'logout', 'authenticate', 'refresh', 'validate', 'authorize', 'session', 'token', 'permission', 'role', 'trust', 'device', 'mfa', 'anonymous', 'audit']
    return features.includes(feature)
  }

  async login(credentials) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'login' })
    const provider = this.#registry.resolve('default')
    if (!provider) throw new AuthenticationEngineError('No default auth provider registered', { operation: 'login' })
    const result = await provider.login(credentials)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_LOGIN, { identityId: result?.identity?.id, method: credentials?.method })
    const ctx = new AuthEngineContext({
      identity: result?.identity,
      tenant: result?.tenant,
      session: result?.session,
      permissions: result?.permissions,
      roles: result?.roles,
      trust: result?.trust,
      device: result?.device,
      provider: 'default',
    })
    return { identity: result?.identity, session: result?.session, context: ctx.toJSON() }
  }

  async logout(session) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'logout' })
    await this.#session.destroy(session?.id)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_LOGOUT, { sessionId: session?.id })
  }

  async authenticate(token) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'authenticate' })
    const provider = this.#registry.resolve('default')
    if (!provider) throw new AuthenticationEngineError('No default auth provider registered', { operation: 'authenticate' })
    return provider.authenticate(token)
  }

  async refresh(token) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'refresh' })
    return this.#token.refresh(token)
  }

  async validate(session) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'validate' })
    return this.#session.restore(session?.id)
  }

  async currentIdentity(context) {
    return context?.identity || null
  }

  async currentSession(context) {
    return context?.session || null
  }

  async currentTenant(context) {
    return context?.tenant || null
  }

  async authorize(identity, action, resource) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'authorize' })
    return this.#authorization.authorize(identity, action, resource)
  }

  async can(identity, action, resource) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'can' })
    return this.#authorization.can(identity, action, resource)
  }

  async cannot(identity, action, resource) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'cannot' })
    return this.#authorization.cannot(identity, action, resource)
  }

  async permissions(identityId) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'permissions' })
    return this.#permission.list(identityId)
  }

  async roles(identityId) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'roles' })
    return this.#role.list(identityId)
  }

  async trust(identityId) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'trust' })
    return this.#trust.calculate(identityId)
  }

  async device(identityId) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'device' })
    return this.#device.list(identityId)
  }

  async mfa(identityId) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'mfa' })
    return { challenge: (method) => this.#mfa.challenge(identityId, method) }
  }

  async anonymous(fingerprint) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'anonymous' })
    return this.#anonymous.createGuest(fingerprint)
  }

  async audit(filters) {
    if (!this.#initialized) throw new AuthenticationEngineError('Authentication engine is not initialized', { operation: 'audit' })
    return this.#audit.query(filters)
  }

  registerProvider(name, ProviderClass, config = {}) {
    this.#registry.register(name, ProviderClass)
    this.#factory.registerProvider(name, ProviderClass)
  }

  setContracts(contracts = {}) {
    if (contracts.session) this.#session.setContract(contracts.session)
    if (contracts.token) this.#token.setContract(contracts.token)
    if (contracts.authorization) this.#authorization.setContract(contracts.authorization)
    if (contracts.permission) this.#permission.setContract(contracts.permission)
    if (contracts.role) this.#role.setContract(contracts.role)
    if (contracts.trust) this.#trust.setContract(contracts.trust)
    if (contracts.device) this.#device.setContract(contracts.device)
    if (contracts.mfa) this.#mfa.setContract(contracts.mfa)
    if (contracts.anonymous) this.#anonymous.setContract(contracts.anonymous)
    if (contracts.audit) this.#audit.setContract(contracts.audit)
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthEngineEvent(event, data))
    }
  }
}

export default AuthenticationEngine
