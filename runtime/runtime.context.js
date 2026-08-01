export class RuntimeContext {
  #modules = new Map()
  #eventBus = null

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setModule(name, module) {
    this.#modules.set(name, module)

    Object.defineProperty(this, name, {
      get: () => this.#modules.get(name),
      enumerable: true,
      configurable: false,
    })
  }

  getModule(name) {
    return this.#modules.get(name) || null
  }

  listModules() {
    return Array.from(this.#modules.keys())
  }

  get database() { return this.#modules.get('database') || null }
  get auth() { return this.#modules.get('auth') || null }
  get storage() { return this.#modules.get('storage') || null }
  get cache() { return this.#modules.get('cache') || null }
  get queue() { return this.#modules.get('queue') || null }
  get mail() { return this.#modules.get('mail') || null }
  get notification() { return this.#modules.get('notification') || null }
  get payment() { return this.#modules.get('payment') || null }
  get media() { return this.#modules.get('media') || null }
  get search() { return this.#modules.get('search') || null }
  get ai() { return this.#modules.get('ai') || null }
  get sync() { return this.#modules.get('sync') || null }
  get analytics() { return this.#modules.get('analytics') || null }
  get maps() { return this.#modules.get('maps') || null }
  get weather() { return this.#modules.get('weather') || null }
  get filesystem() { return this.#modules.get('filesystem') || null }
}

export default RuntimeContext
