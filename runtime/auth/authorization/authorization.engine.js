import { AuthorizationContext } from './authorization.context.js'
import { AuthorizationRegistry } from './authorization.registry.js'
import { AuthorizationFactory } from './authorization.factory.js'
import { AuthorizationHealth } from './authorization.health.js'
import { AUTHORIZATION_EVENTS, createAuthorizationEvent } from './authorization.events.js'
import { AuthorizationError, PermissionDeniedError, AuthorizationConfigurationError } from './authorization.errors.js'
import { PolicyEngine } from '../policies/policy.engine.js'
import { PermissionResolver } from '../permissions/permission.resolver.js'
import { RoleManager } from '../roles/role.manager.js'
import { ScopeManager } from '../scopes/scope.manager.js'
import { AuthorizationAudit } from '../audit/authorization.audit.js'
import { PolicyCache } from '../policies/policy.cache.js'

export class AuthorizationEngine {
  #registry = null
  #factory = null
  #health = null
  #policyEngine = null
  #permissionResolver = null
  #roleManager = null
  #scopeManager = null
  #audit = null
  #policyCache = null
  #eventBus = null
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = config
    this.#registry = new AuthorizationRegistry(config)
    this.#factory = new AuthorizationFactory(config)
    this.#health = new AuthorizationHealth(config)
    this.#policyCache = new PolicyCache(config)
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get health() { return this.#health }
  get policyEngine() { return this.#policyEngine }
  get permissionResolver() { return this.#permissionResolver }
  get roleManager() { return this.#roleManager }
  get scopeManager() { return this.#scopeManager }
  get audit() { return this.#audit }
  get policyCache() { return this.#policyCache }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#health.setEventBus(eventBus)
    this.#policyCache?.setEventBus(eventBus)
    this.#audit?.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return
    this.#registry.initialize()

    this.#scopeManager = new ScopeManager(this.#config)
    this.#scopeManager.setEventBus?.(this.#eventBus)

    this.#roleManager = new RoleManager(this.#scopeManager, this.#config)
    this.#roleManager.setEventBus?.(this.#eventBus)

    this.#permissionResolver = new PermissionResolver(this.#roleManager, this.#scopeManager, this.#config)
    this.#permissionResolver.setEventBus?.(this.#eventBus)

    this.#policyEngine = new PolicyEngine(this.#permissionResolver, this.#roleManager, this.#scopeManager, this.#policyCache, this.#config)

    this.#audit = new AuthorizationAudit(this.#config)
    this.#audit.setEventBus?.(this.#eventBus)

    this.#registry.register('authorization-engine', { version: '1.0.0', type: 'engine', features: ['rbac', 'abac', 'pbac', 'scope', 'audit'] })
    this.#initialized = true
  }

  async shutdown() {
    this.#policyCache?.invalidateAll()
    this.#initialized = false
  }

  async dispose() {
    this.#policyCache?.invalidateAll()
    this.#initialized = false
  }

  async can(identity, action, resource, options = {}) {
    const decision = await this.evaluate(identity, action, resource, options)
    return decision.allowed
  }

  async cannot(identity, action, resource, options = {}) {
    const decision = await this.evaluate(identity, action, resource, options)
    return !decision.allowed
  }

  async authorize(identity, action, resource, options = {}) {
    const decision = await this.evaluate(identity, action, resource, options)
    if (!decision.allowed) {
      throw new PermissionDeniedError(`Authorization denied: ${action} on ${resource}`, {
        identity: identity?.id,
        action,
        resource,
        reason: decision.reason,
        policy: decision.policy,
      })
    }
    return decision
  }

  async evaluate(identity, action, resource, options = {}) {
    if (!this.#initialized) {
      throw new AuthorizationConfigurationError('Authorization engine is not initialized', {})
    }

    const ctx = new AuthorizationContext({
      identity,
      tenant: options.tenant || identity?.tenant || null,
      destination: options.destination || identity?.destination || null,
      business: options.business || null,
      currentTime: options.currentTime || new Date(),
      offline: options.offline || false,
      trustLevel: options.trustLevel || identity?.trustLevel || null,
      device: options.device || null,
      locale: options.locale || null,
      timezone: options.timezone || null,
      scopes: options.scopes || [],
      permissions: options.permissions || identity?.permissions || [],
      roles: options.roles || identity?.roles || [],
      capabilities: options.capabilities || [],
      ...options.context,
    })

    const cacheKey = this.#buildCacheKey(identity, action, resource, ctx)
    const cached = this.#policyCache.get(cacheKey)
    if (cached) {
      this.#emit(AUTHORIZATION_EVENTS.POLICY_CACHE_HIT, { identityId: identity?.id, action, resource })
      this.#audit?.record({ ...cached, cached: true })
      return cached
    }
    this.#emit(AUTHORIZATION_EVENTS.POLICY_CACHE_MISS, { identityId: identity?.id, action, resource })

    const permissionResult = await this.#permissionResolver.resolve(identity, action, resource, ctx)
    if (permissionResult.denied) {
      const decision = { allowed: false, reason: 'permission_denied', policy: null, action, resource, evaluatedAt: new Date().toISOString() }
      this.#emit(AUTHORIZATION_EVENTS.AUTHORIZATION_DENIED, { identityId: identity?.id, action, resource, reason: 'permission_denied' })
      this.#audit?.record({ ...decision, identityId: identity?.id, context: ctx.toJSON() })
      this.#policyCache.set(cacheKey, decision)
      return decision
    }

    const policyDecision = await this.#policyEngine.evaluate(identity, action, resource, ctx)
    const finalDecision = {
      allowed: policyDecision.allowed,
      reason: policyDecision.reason || 'allowed',
      policy: policyDecision.policy || null,
      action,
      resource,
      evaluatedAt: new Date().toISOString(),
    }

    if (finalDecision.allowed) {
      this.#emit(AUTHORIZATION_EVENTS.AUTHORIZATION_ALLOWED, { identityId: identity?.id, action, resource, policy: finalDecision.policy })
    } else {
      this.#emit(AUTHORIZATION_EVENTS.AUTHORIZATION_DENIED, { identityId: identity?.id, action, resource, reason: finalDecision.reason })
    }

    this.#audit?.record({ ...finalDecision, identityId: identity?.id, context: ctx.toJSON() })
    this.#policyCache.set(cacheKey, finalDecision)
    return finalDecision
  }

  async evaluateMany(identity, requests) {
    const results = []
    for (const req of requests) {
      const decision = await this.evaluate(identity, req.action, req.resource, req.options || {})
      results.push(decision)
    }
    return results
  }

  async explain(identity, action, resource, options = {}) {
    const ctx = new AuthorizationContext({
      identity,
      tenant: options.tenant || identity?.tenant || null,
      destination: options.destination || identity?.destination || null,
      currentTime: options.currentTime || new Date(),
      offline: options.offline || false,
      trustLevel: options.trustLevel || identity?.trustLevel || null,
      scopes: options.scopes || [],
      permissions: options.permissions || identity?.permissions || [],
      roles: options.roles || identity?.roles || [],
      ...options.context,
    })

    const permissionResult = await this.#permissionResolver.explain(identity, action, resource, ctx)
    const policyResult = await this.#policyEngine.explain(identity, action, resource, ctx)

    return {
      action,
      resource,
      identity: { id: identity?.id, roles: identity?.roles, permissions: identity?.permissions },
      permission: permissionResult,
      policy: policyResult,
      context: ctx.toJSON(),
    }
  }

  async health() {
    return this.#health.checkAll(this)
  }

  available() {
    return this.#initialized
  }

  supports(feature) {
    const features = ['can', 'cannot', 'authorize', 'evaluate', 'evaluate-many', 'explain', 'rbac', 'abac', 'pbac', 'scope', 'audit', 'cache']
    return features.includes(feature)
  }

  #buildCacheKey(identity, action, resource, ctx) {
    const parts = [
      identity?.id || 'anon',
      action,
      resource,
      ctx.tenant?.id || '',
      ctx.destination?.id || '',
      ctx.offline ? 'offline' : 'online',
    ]
    return parts.join(':')
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthorizationEvent(event, data))
    }
  }
}

export default AuthorizationEngine
