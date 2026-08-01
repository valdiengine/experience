import { ScopeRegistry } from './scope.registry.js'
import { AUTHORIZATION_EVENTS, createAuthorizationEvent } from '../authorization/authorization.events.js'

export class ScopeManager {
  #registry = null
  #eventBus = null
  #config = {}

  constructor(config = {}) {
    this.#registry = new ScopeRegistry(config)
    this.#config = {
      wildcardEnabled: config.wildcardEnabled !== false,
      prefixMatching: config.prefixMatching !== false,
      namespaceValidation: config.namespaceValidation !== false,
      ...config,
    }
  }

  get registry() { return this.#registry }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  validate(scope, requiredScope) {
    if (requiredScope === '*' || scope === '*') return true
    if (scope === requiredScope) return true
    if (this.#config.wildcardEnabled && requiredScope.endsWith(':*')) {
      const prefix = requiredScope.slice(0, -2)
      return scope.startsWith(prefix)
    }
    if (this.#config.wildcardEnabled && scope.endsWith(':*')) {
      const prefix = scope.slice(0, -2)
      return requiredScope.startsWith(prefix)
    }
    if (this.#config.prefixMatching) {
      const [scopeNs] = scope.split(':')
      const [reqNs] = requiredScope.split(':')
      return scopeNs === reqNs
    }
    return false
  }

  validateMany(scopes, requiredScopes) {
    if (requiredScopes.length === 0) return true
    return requiredScopes.every(req => scopes.some(s => this.validate(s, req)))
  }

  getEffectiveScopes(identity, context = {}) {
    const assigned = identity?.scopes || context?.scopes || []
    const roleScopes = []
    for (const roleName of (context?.roles || identity?.roles || [])) {
      const role = this.#registry.getRoleScopes?.(roleName) || []
      roleScopes.push(...role)
    }
    return this.#mergeScopes([...assigned, ...roleScopes])
  }

  async health() {
    return {
      status: 'healthy',
      registeredScopes: this.#registry.count(),
      timestamp: Date.now(),
    }
  }

  available() { return true }

  supports(feature) {
    const features = ['validate', 'validate-many', 'wildcard', 'prefix-matching', 'namespace', 'effective-scopes', 'scope-hierarchy']
    return features.includes(feature)
  }

  #mergeScopes(scopes) {
    const result = new Set()
    for (const scope of scopes) {
      if (scope === '*') return ['*']
      result.add(scope)
    }
    return Array.from(result)
  }
}

export default ScopeManager
