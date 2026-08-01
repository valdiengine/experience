/**
 * EcoToken Manager — Temporary utility points economy
 */
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

const EARNING_RULES = {
  species_discovery: 5,
  species_validated: 15,
  ecological_report: 20,
  community_cleanup: 50,
  mission_completed: 100,
  memory_created: 10,
  review_written: 5,
  observation_confirmed: 5,
  sports_activity_completed: 25,
  conservation_action: 50,
  guide_completed: 15,
  business_visited: 10,
}

export class EcoTokenManager {
  #context = null
  #accounts = new Map()

  constructor(context) {
    this.#context = context
  }

  getOrCreate(visitorId) {
    if (!this.#accounts.has(visitorId)) {
      this.#accounts.set(visitorId, {
        id: 'et_' + visitorId,
        visitorId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        history: [],
      })
    }
    return this.#accounts.get(visitorId)
  }

  earn(visitorId, action, metadata = {}) {
    const account = this.getOrCreate(visitorId)
    const amount = EARNING_RULES[action] || 0
    if (amount <= 0) return { success: false, error: 'Unknown action' }

    const multiplier = metadata.multiplier || 1
    const total = Math.floor(amount * multiplier)

    account.balance += total
    account.totalEarned += total
    account.history.push({
      type: 'earn',
      action,
      amount: total,
      timestamp: new Date().toISOString(),
      metadata,
    })

    this.#emitEvent(ENGAGEMENT_EVENTS.ECOTOKENS_EARNED, {
      visitorId, action, amount: total, balance: account.balance,
    })

    return { success: true, amount: total, balance: account.balance }
  }

  spend(visitorId, amount, purpose, metadata = {}) {
    const account = this.getOrCreate(visitorId)
    if (account.balance < amount) {
      return { success: false, error: 'Insufficient EcoTokens' }
    }

    account.balance -= amount
    account.totalSpent += amount
    account.history.push({
      type: 'spend',
      purpose,
      amount,
      timestamp: new Date().toISOString(),
      metadata,
    })

    this.#emitEvent(ENGAGEMENT_EVENTS.ECOTOKENS_SPENT, {
      visitorId, purpose, amount, balance: account.balance,
    })

    return { success: true, balance: account.balance }
  }

  getBalance(visitorId) {
    return this.getOrCreate(visitorId).balance
  }

  getHistory(visitorId, limit = 20) {
    const account = this.getOrCreate(visitorId)
    return account.history.slice(-limit)
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
