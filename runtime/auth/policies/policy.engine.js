import { PolicyRegistry } from './policy.registry.js'
import { PolicyContext } from './policy.context.js'
import { PolicyCompileError, PolicyEvaluationError } from '../authorization/authorization.errors.js'
import { AUTHORIZATION_EVENTS, createAuthorizationEvent } from '../authorization/authorization.events.js'

export class PolicyEngine {
  #registry = null
  #permissionResolver = null
  #roleManager = null
  #scopeManager = null
  #policyCache = null
  #eventBus = null
  #config = {}

  constructor(permissionResolver, roleManager, scopeManager, policyCache, config = {}) {
    this.#registry = new PolicyRegistry(config)
    this.#permissionResolver = permissionResolver
    this.#roleManager = roleManager
    this.#scopeManager = scopeManager
    this.#policyCache = policyCache
    this.#config = config
  }

  get registry() { return this.#registry }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async evaluate(identity, action, resource, context) {
    const policies = this.#registry.list()
    if (policies.length === 0) {
      return { allowed: true, reason: 'no_policies', policy: null }
    }

    const ctx = new PolicyContext({
      identity,
      action,
      resource,
      tenant: context.tenant,
      destination: context.destination,
      business: context.business,
      currentTime: context.currentTime || new Date(),
      offline: context.offline || false,
      trustLevel: context.trustLevel,
      device: context.device,
      locale: context.locale,
      timezone: context.timezone,
    })

    let finalDecision = null

    for (const policy of policies) {
      try {
        if (!this.#matchesScope(policy, action, resource)) continue
        if (!this.#matchesConditions(policy, ctx)) continue
        const decision = policy.effect === 'deny' ? false : true
        if (policy.effect === 'deny') {
          return { allowed: false, reason: policy.reason || 'denied_by_policy', policy: policy.name }
        }
        if (decision && !finalDecision) {
          finalDecision = { allowed: true, reason: policy.reason || 'allowed_by_policy', policy: policy.name }
        }
      } catch (err) {
        throw new PolicyEvaluationError(`Policy evaluation failed for "${policy.name}": ${err.message}`, { policy: policy.name, action, resource })
      }
    }

    return finalDecision || { allowed: true, reason: 'default_allow', policy: null }
  }

  async explain(identity, action, resource, context) {
    const policies = this.#registry.list()
    const results = []

    for (const policy of policies) {
      const ctx = new PolicyContext({
        identity, action, resource,
        tenant: context.tenant, destination: context.destination,
        currentTime: context.currentTime || new Date(),
        offline: context.offline || false,
        trustLevel: context.trustLevel,
      })
      const matches = this.#matchesScope(policy, action, resource) && this.#matchesConditions(policy, ctx)
      results.push({
        policy: policy.name,
        effect: policy.effect,
        matchesScope: this.#matchesScope(policy, action, resource),
        matchesConditions: this.#matchesConditions(policy, ctx),
        evaluated: matches,
        reason: matches ? (policy.reason || null) : null,
      })
    }

    return { policies: results, total: results.length, matched: results.filter(r => r.evaluated).length }
  }

  registerPolicy(policy) {
    this.#registry.register(policy)
  }

  async health() {
    const policies = this.#registry.list()
    return {
      status: 'healthy',
      registeredPolicies: policies.length,
      policyTypes: [...new Set(policies.map(p => p.type || 'unknown'))],
      timestamp: Date.now(),
    }
  }

  available() {
    return true
  }

  supports(feature) {
    const features = ['rbac', 'abac', 'pbac', 'scope-matching', 'condition-evaluation', 'explain', 'deny-override', 'default-allow']
    return features.includes(feature)
  }

  #matchesScope(policy, action, resource) {
    if (!policy.actions || policy.actions.length === 0) return true
    return policy.actions.some(a => this.#matchAction(a, action))
  }

  #matchAction(pattern, action) {
    if (pattern === action) return true
    if (pattern === '*') return true
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2)
      return action.startsWith(prefix)
    }
    return false
  }

  #matchesConditions(policy, ctx) {
    if (!policy.conditions || policy.conditions.length === 0) return true
    return policy.conditions.every(condition => this.#evaluateCondition(condition, ctx))
  }

  #evaluateCondition(condition, ctx) {
    const { field, operator, value } = condition
    const actual = ctx.get(field)
    switch (operator) {
      case 'eq': return actual === value
      case 'neq': return actual !== value
      case 'in': return Array.isArray(value) && value.includes(actual)
      case 'nin': return Array.isArray(value) && !value.includes(actual)
      case 'gt': return actual > value
      case 'gte': return actual >= value
      case 'lt': return actual < value
      case 'lte': return actual <= value
      case 'exists': return actual !== null && actual !== undefined
      case 'not_exists': return actual === null || actual === undefined
      case 'contains': return typeof actual === 'string' && actual.includes(value)
      case 'startsWith': return typeof actual === 'string' && actual.startsWith(value)
      case 'between': return Array.isArray(value) && value.length === 2 && actual >= value[0] && actual <= value[1]
      case 'trust_gte': return (ctx.trustLevel || 0) >= value
      case 'time_between': return this.#isTimeBetween(ctx.currentTime, value[0], value[1])
      case 'day_of_week': return this.#isDayOfWeek(ctx.currentTime, value)
      default: return true
    }
  }

  #isTimeBetween(time, start, end) {
    const h = time.getHours()
    const m = time.getMinutes()
    const t = h * 100 + m
    return t >= start && t <= end
  }

  #isDayOfWeek(time, days) {
    const day = time.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return (Array.isArray(days) ? days : [days]).includes(dayNames[day])
  }
}

export default PolicyEngine
