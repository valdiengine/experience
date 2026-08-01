import { AuthorizationEngine } from './authorization.engine.js'

const DEFAULT_ENGINE = () => AuthorizationEngine

const ENGINE_REGISTRY = {
  default: DEFAULT_ENGINE,
}

export class AuthorizationFactory {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  register(type, EngineClass) {
    ENGINE_REGISTRY[type] = EngineClass
  }

  resolve(type = 'default', options = {}) {
    const entry = ENGINE_REGISTRY[type] || ENGINE_REGISTRY.default
    const EngineClass = typeof entry === 'function' ? entry() : entry
    return new EngineClass({ ...this.#config, ...options })
  }

  list() {
    return Object.keys(ENGINE_REGISTRY)
  }

  supports(type) {
    return type in ENGINE_REGISTRY
  }
}

export default AuthorizationFactory
