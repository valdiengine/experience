import { AuthorizationEngine } from '../../authorization/authorization.engine.js'

const ENGINE_REGISTRY = {
  default: AuthorizationEngine,
}

export class AuthorizationRuntimeFactory {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  register(type, EngineClass) {
    ENGINE_REGISTRY[type] = EngineClass
  }

  resolve(type = 'default', options = {}) {
    const EngineClass = ENGINE_REGISTRY[type] || ENGINE_REGISTRY.default
    const engine = new EngineClass({ ...this.#config, ...options })
    return engine
  }

  list() {
    return Object.keys(ENGINE_REGISTRY)
  }

  supports(type) {
    return type in ENGINE_REGISTRY
  }
}

export default AuthorizationRuntimeFactory
