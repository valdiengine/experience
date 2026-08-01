import { AuthenticationEngineError } from './auth.engine.errors.js'

export class AuthEngineRegistry {
  #providers = new Map()
  #initialized = false

  register(name, provider) {
    if (this.#providers.has(name)) {
      throw new AuthenticationEngineError(`Auth provider "${name}" is already registered`, { name, operation: 'register' })
    }
    this.#providers.set(name, provider)
    return this
  }

  resolve(name) {
    const provider = this.#providers.get(name)
    if (!provider) {
      throw new AuthenticationEngineError(`Auth provider "${name}" is not registered`, { name, operation: 'resolve' })
    }
    return provider
  }

  remove(name) {
    this.#providers.delete(name)
    return this
  }

  validate(name) {
    const provider = this.#providers.get(name)
    if (!provider) return { valid: false, reason: 'not_found' }
    const methods = ['login', 'logout', 'refresh', 'userinfo', 'health']
    const missing = methods.filter(m => typeof provider[m] !== 'function')
    if (missing.length > 0) {
      return { valid: false, reason: `missing_methods:${missing.join(',')}` }
    }
    return { valid: true }
  }

  metadata(name) {
    return this.#providers.get(name) || null
  }

  list() {
    return Array.from(this.#providers.keys())
  }

  health() {
    const result = {}
    for (const [name, provider] of this.#providers) {
      result[name] = provider.health?.() || { status: 'unknown' }
    }
    return result
  }

  supports(name, feature) {
    const provider = this.#providers.get(name)
    return provider?.supports?.(feature) ?? false
  }

  get count() {
    return this.#providers.size
  }

  initialize() {
    this.#initialized = true
  }

  get initialized() {
    return this.#initialized
  }
}

export default AuthEngineRegistry
