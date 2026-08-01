/**
 * Exploration Capability — Entry point for exploration, gamification and eco pokedex
 */
import { BaseCapability } from '../core/base.capability.js'
import { ExplorationManager } from './exploration.manager.js'
import { PokedexManager } from './pokedex/pokedex.manager.js'
import { GamificationManager } from './gamification/gamification.manager.js'
import { PointsManager } from './gamification/points.manager.js'
import { MissionManager } from './missions/mission.manager.js'
import { MediaOptimizer } from './media/media.optimizer.js'
import { LeaderboardManager } from './leaderboard/leaderboard.manager.js'
import { EngagementRulesManager } from './engagement/engagement-rules.manager.js'

export class ExplorationCapability extends BaseCapability {
  static id = 'exploration'
  static name = 'Exploration'
  static version = '1.1.0'
  static dependencies = []

  #manager = null
  #pokedex = null
  #gamification = null
  #points = null
  #missions = null
  #media = null
  #leaderboard = null
  #engagement = null

  constructor() {
    super()
  }

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new ExplorationManager(context)
    this.#pokedex = new PokedexManager(context)
    this.#gamification = new GamificationManager(context)
    this.#points = new PointsManager(context)
    this.#missions = new MissionManager(context)
    this.#media = new MediaOptimizer(context)
    this.#leaderboard = new LeaderboardManager(context)
    this.#engagement = new EngagementRulesManager(context)
  }

  get manager() { return this.#manager }
  get pokedex() { return this.#pokedex }
  get gamification() { return this.#gamification }
  get points() { return this.#points }
  get missions() { return this.#missions }
  get media() { return this.#media }
  get leaderboard() { return this.#leaderboard }
  get engagement() { return this.#engagement }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    this.#pokedex = null
    this.#gamification = null
    this.#points = null
    this.#missions = null
    this.#media = null
    this.#leaderboard = null
    this.#engagement = null
    await super.destroy()
  }
}
