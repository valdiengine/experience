/**
 * Journey Manager — Customer lifecycle management
 *
 * Business-agnostic: tracks customer stages, enables automated actions per stage
 * No direct capability imports — uses context.capabilities.get()
 */
import { JOURNEY_STAGE, validateJourney } from '../engagement.schema.js'
import { ENGAGEMENT_EVENTS } from '../engagement.events.js'

const STAGE_ORDER = [
  JOURNEY_STAGE.VISITOR,
  JOURNEY_STAGE.INQUIRY,
  JOURNEY_STAGE.RESERVATION_REQUESTED,
  JOURNEY_STAGE.RESERVATION_CONFIRMED,
  JOURNEY_STAGE.DURING_SERVICE,
  JOURNEY_STAGE.COMPLETED,
  JOURNEY_STAGE.RETURNING,
]

export class JourneyManager {
  #context = null
  #journeys = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Get or create customer journey
   * @param {string} customerId
   * @param {string} customerName
   * @returns {object}
   */
  getOrCreate(customerId, customerName) {
    if (this.#journeys.has(customerId)) {
      return this.#journeys.get(customerId)
    }

    const journey = {
      id: `journey_${customerId}`,
      tenantId: this.#context?.tenant?.id,
      customerId,
      customerName: customerName || 'Unknown',
      stage: JOURNEY_STAGE.VISITOR,
      history: [{
        stage: JOURNEY_STAGE.VISITOR,
        timestamp: new Date().toISOString(),
      }],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const validation = validateJourney(journey)
    if (!validation.valid) {
      console.error('[Journey] Invalid journey:', validation.errors)
      return null
    }

    this.#journeys.set(customerId, journey)
    return journey
  }

  /**
   * Advance customer to next stage
   * @param {string} customerId
   * @param {string} newStage
   * @returns {{ success: boolean, journey?: object, errors?: string[] }}
   */
  advanceStage(customerId, newStage) {
    const journey = this.#journeys.get(customerId)
    if (!journey) {
      return { success: false, errors: ['Journey not found'] }
    }

    const currentIdx = STAGE_ORDER.indexOf(journey.stage)
    const newIdx = STAGE_ORDER.indexOf(newStage)

    if (newIdx < 0) {
      return { success: false, errors: ['Invalid stage'] }
    }

    if (newIdx <= currentIdx && newStage !== JOURNEY_STAGE.RETURNING) {
      return { success: false, errors: ['Cannot go backward (except to returning)'] }
    }

    const previousStage = journey.stage
    journey.stage = newStage
    journey.updatedAt = new Date().toISOString()
    journey.history.push({
      stage: newStage,
      previousStage,
      timestamp: new Date().toISOString(),
    })

    this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.JOURNEY_STAGE_CHANGED, {
      customerId,
      previousStage,
      newStage,
    })

    return { success: true, journey }
  }

  /**
   * Set customer stage directly
   * @param {string} customerId
   * @param {string} stage
   */
  setStage(customerId, stage) {
    const journey = this.#journeys.get(customerId)
    if (journey) {
      const previousStage = journey.stage
      journey.stage = stage
      journey.updatedAt = new Date().toISOString()
      journey.history.push({
        stage,
        previousStage,
        timestamp: new Date().toISOString(),
      })
      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.JOURNEY_STAGE_CHANGED, {
        customerId,
        previousStage,
        newStage: stage,
      })
    }
  }

  /**
   * Add metadata to journey
   * @param {string} customerId
   * @param {object} metadata
   */
  addMetadata(customerId, metadata) {
    const journey = this.#journeys.get(customerId)
    if (journey) {
      Object.assign(journey.metadata, metadata)
      journey.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Get journey by customer ID
   * @param {string} customerId
   * @returns {object|null}
   */
  getById(customerId) {
    return this.#journeys.get(customerId) || null
  }

  /**
   * Get all journeys
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#journeys.values())
  }

  /**
   * Get journeys by stage
   * @param {string} stage
   * @returns {object[]}
   */
  getByStage(stage) {
    return Array.from(this.#journeys.values()).filter(j => j.stage === stage)
  }

  /**
   * Get customers in a specific stage
   * @param {string} stage
   * @returns {string[]} - Customer IDs
   */
  getCustomerIdsByStage(stage) {
    return this.getByStage(stage).map(j => j.customerId)
  }

  /**
   * Handle reservation created — advance journey
   * @param {string} customerId
   * @param {string} customerName
   */
  onReservationCreated(customerId, customerName) {
    const journey = this.getOrCreate(customerId, customerName)
    if (journey) {
      this.advanceStage(customerId, JOURNEY_STAGE.RESERVATION_REQUESTED)
    }
  }

  /**
   * Handle reservation confirmed — advance journey
   * @param {string} customerId
   */
  onReservationConfirmed(customerId) {
    this.advanceStage(customerId, JOURNEY_STAGE.RESERVATION_CONFIRMED)
  }

  /**
   * Handle reservation completed — advance journey
   * @param {string} customerId
   */
  onReservationCompleted(customerId) {
    this.advanceStage(customerId, JOURNEY_STAGE.COMPLETED)
  }

  /**
   * Handle return visit — set returning stage
   * @param {string} customerId
   */
  onReturnVisit(customerId) {
    const journey = this.#journeys.get(customerId)
    if (journey && journey.stage === JOURNEY_STAGE.COMPLETED) {
      this.setStage(customerId, JOURNEY_STAGE.RETURNING)
    }
  }

  /**
   * Get journey summary for a customer
   * @param {string} customerId
   * @returns {object|null}
   */
  getSummary(customerId) {
    const journey = this.#journeys.get(customerId)
    if (!journey) return null

    return {
      customerId: journey.customerId,
      customerName: journey.customerName,
      currentStage: journey.stage,
      stageIndex: STAGE_ORDER.indexOf(journey.stage),
      totalStages: STAGE_ORDER.length,
      historyLength: journey.history.length,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
    }
  }
}
