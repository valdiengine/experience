import { RUNTIME_EVENTS, createRuntimeEvent } from './runtime.events.js'

export class RuntimeLifecycle {
  #states = new Map()
  #eventBus = null

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async start(runtimeEngine, registry) {
    const modules = runtimeEngine.listModules()
    const order = this.#resolveOrder(modules, registry || runtimeEngine.registry)

    for (const name of order) {
      const module = runtimeEngine.getModule(name)
      if (!module) continue

      try {
        this.#states.set(name, 'starting')
        await module.initialize()
        this.#states.set(name, 'started')
        this.#emit(RUNTIME_EVENTS.RUNTIME_INITIALIZED, { module: name })
      } catch (err) {
        this.#states.set(name, 'failed')
        this.#emit(RUNTIME_EVENTS.RUNTIME_PROVIDER_FAILED, { module: name, error: err.message })
      }
    }
  }

  async shutdown(runtimeEngine) {
    const modules = runtimeEngine.listModules()
    const order = [...modules].reverse()

    for (const name of order) {
      const module = runtimeEngine.getModule(name)
      if (!module) continue

      try {
        this.#states.set(name, 'stopping')
        await module.shutdown?.()
        await module.dispose?.()
        this.#states.set(name, 'stopped')
      } catch {}
    }

    this.#emit(RUNTIME_EVENTS.RUNTIME_SHUTDOWN, { timestamp: Date.now() })
  }

  async restart(runtimeEngine) {
    await this.shutdown(runtimeEngine)
    await this.start(runtimeEngine)
  }

  getState(name) {
    return this.#states.get(name) || 'unknown'
  }

  getStates() {
    const result = {}
    for (const [name, state] of this.#states) {
      result[name] = state
    }
    return result
  }

  isRunning(name) {
    return this.#states.get(name) === 'started'
  }

  #resolveOrder(modules, registry) {
    const visited = new Set()
    const order = []
    const reg = registry

    function visit(name) {
      if (visited.has(name)) return
      visited.add(name)
      if (reg && typeof reg.metadata === 'function') {
        const descriptor = reg.metadata(name)
        if (descriptor?.dependencies) {
          for (const dep of descriptor.dependencies) {
            if (modules.includes(dep) || reg.isRegistered(dep)) {
              visit(dep)
            }
          }
        }
      }
      order.push(name)
    }

    for (const name of modules) {
      visit(name)
    }

    return order
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createRuntimeEvent(event, data))
    }
  }
}

export default RuntimeLifecycle
