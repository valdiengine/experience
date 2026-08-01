import { ScopeNotFoundError } from '../authorization/authorization.errors.js'

export class ScopeRegistry {
  #scopes = new Map()
  #initialized = false

  define(scopeName, definition = {}) {
    if (this.#scopes.has(scopeName)) return this
    const parts = scopeName.split(':')
    const namespace = parts[0]
    this.#scopes.set(scopeName, {
      name: scopeName,
      namespace: definition.namespace || namespace,
      action: definition.action || parts[1] || null,
      resource: definition.resource || parts[2] || null,
      description: definition.description || '',
      type: definition.type || 'custom',
      roles: definition.roles || [],
      capabilities: definition.capabilities || [],
      parent: definition.parent || this.#inferParent(scopeName),
      children: [],
      wildcard: scopeName.endsWith(':*'),
      createdAt: Date.now(),
    })

    const parent = this.#scopes.get(this.#scopes.get(scopeName).parent)
    if (parent) parent.children.push(scopeName)

    return this
  }

  resolve(scopeName) {
    return this.#scopes.get(scopeName) || null
  }

  exists(scopeName) {
    return this.#scopes.has(scopeName)
  }

  list() {
    return Array.from(this.#scopes.values())
  }

  listByNamespace(namespace) {
    return this.list().filter(s => s.namespace === namespace)
  }

  listByCapability(capability) {
    return this.list().filter(s => s.capabilities.includes(capability))
  }

  getChildren(scopeName) {
    const scope = this.#scopes.get(scopeName)
    return scope ? scope.children : []
  }

  getDescendants(scopeName) {
    const result = []
    const queue = [scopeName]
    while (queue.length > 0) {
      const current = queue.shift()
      const scope = this.#scopes.get(current)
      if (scope) {
        for (const child of scope.children) {
          result.push(child)
          queue.push(child)
        }
      }
    }
    return result
  }

  count() {
    return this.#scopes.size
  }

  initialize() { this.#initialized = true }
  get initialized() { return this.#initialized }

  #inferParent(scopeName) {
    const parts = scopeName.split(':')
    if (parts.length <= 2) return null
    return parts.slice(0, -1).join(':')
  }
}

export default ScopeRegistry
