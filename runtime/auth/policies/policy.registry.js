import { PolicyNotFoundError } from '../authorization/authorization.errors.js'

export class PolicyRegistry {
  #policies = new Map()
  #initialized = false

  register(policy) {
    if (!policy.name) throw new PolicyNotFoundError('Policy must have a name', {})
    if (this.#policies.has(policy.name)) return this
    this.#policies.set(policy.name, {
      name: policy.name,
      description: policy.description || '',
      type: policy.type || 'rbac',
      effect: policy.effect || 'allow',
      priority: policy.priority || 0,
      actions: policy.actions || [],
      resources: policy.resources || [],
      conditions: policy.conditions || [],
      roles: policy.roles || [],
      scopes: policy.scopes || [],
      reason: policy.reason || null,
      registeredAt: Date.now(),
    })
    return this
  }

  resolve(name) {
    const policy = this.#policies.get(name)
    if (!policy) throw new PolicyNotFoundError(`Policy "${name}" not found`, { name })
    return policy
  }

  remove(name) {
    this.#policies.delete(name)
  }

  list() {
    return Array.from(this.#policies.values()).sort((a, b) => b.priority - a.priority)
  }

  listByType(type) {
    return this.list().filter(p => p.type === type)
  }

  listByEffect(effect) {
    return this.list().filter(p => p.effect === effect)
  }

  findByAction(action) {
    return this.list().filter(p => !p.actions.length || p.actions.some(a => a === action || a === '*' || (a.endsWith(':*') && action.startsWith(a.slice(0, -2)))))
  }

  count() {
    return this.#policies.size
  }

  initialize() { this.#initialized = true }
  get initialized() { return this.#initialized }
}

export default PolicyRegistry
