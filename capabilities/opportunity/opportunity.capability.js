/**
 * Opportunity Capability — Thin runtime wrapper over the existing OpportunityEngine
 *
 * P13.5.5 (Runtime Entry & Wiring): architectural placeholder. No business logic lives
 * here — all opportunity discovery is delegated to the existing OpportunityEngine
 * (capabilities/intelligence/opportunity.engine.js), which is fully business-agnostic
 * and consumes data exclusively through DataManager.
 */
import { BaseCapability } from '../core/base.capability.js'
import { OpportunityEngine } from '../intelligence/opportunity.engine.js'

export class OpportunityCapability extends BaseCapability {
  static id = 'opportunity'
  static name = 'Opportunity'
  static version = '1.0.0'
  static dependencies = []

  #engine = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#engine = new OpportunityEngine(context)
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#engine = null
    await super.destroy()
  }

  get engine() {
    return this.#engine
  }

  findOpportunities(resourceId, startDate, endDate) {
    return this.#engine?.findOpportunities(resourceId, startDate, endDate) || []
  }

  findAll(startDate, endDate) {
    return this.#engine?.findAll(startDate, endDate) || []
  }
}

export default OpportunityCapability
