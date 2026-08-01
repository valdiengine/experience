import { SyncRegistry } from './sync.registry.js'
import { PullStrategy } from './strategies/pull.strategy.js'
import { PushStrategy } from './strategies/push.strategy.js'
import { BidirectionalStrategy } from './strategies/bidirectional.strategy.js'

export class SyncFactory {
  #defaultStrategies = {
    pull: PullStrategy,
    push: PushStrategy,
    bidirectional: BidirectionalStrategy,
  }

  constructor() {
    this.#defaultStrategies = { ...this.#defaultStrategies }
  }

  createRegistry() {
    const registry = new SyncRegistry()

    registry.registerStrategy('pull', new PullStrategy())
    registry.registerStrategy('push', new PushStrategy())
    registry.registerStrategy('bidirectional', new BidirectionalStrategy())

    registry.registerEntityType('post', {
      supportedDirections: ['pull', 'push', 'bidirectional'],
    })

    registry.registerEntityType('page', {
      supportedDirections: ['pull', 'push', 'bidirectional'],
    })

    registry.registerEntityType('media', {
      supportedDirections: ['pull'],
    })

    registry.registerEntityType('seo', {
      supportedDirections: ['pull', 'push'],
    })

    registry.registerEntityType('category', {
      supportedDirections: ['pull', 'push'],
    })

    registry.registerEntityType('tag', {
      supportedDirections: ['pull'],
    })

    registry.registerEntityType('author', {
      supportedDirections: ['pull'],
    })

    return registry
  }

  resolveStrategy(direction, options = {}) {
    const StrategyClass = this.#defaultStrategies[direction]
    if (!StrategyClass) return null
    return new StrategyClass(options)
  }

  registerCustomStrategy(direction, StrategyClass) {
    this.#defaultStrategies[direction] = StrategyClass
  }

  listAvailableStrategies() {
    return Object.keys(this.#defaultStrategies)
  }
}

export default SyncFactory
