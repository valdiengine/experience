import { AuditError } from './auth.engine.errors.js'

export class AuditEngine {
  #contract = null
  #eventBus = null
  #initialized = false

  constructor(options = {}) {
    this.#contract = options.contract || null
    this.#eventBus = options.eventBus || null
  }

  setContract(contract) {
    this.#contract = contract
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async initialize() {
    this.#initialized = true
  }

  async shutdown() {
    this.#initialized = false
  }

  async dispose() {
    this.#contract = null
    this.#initialized = false
  }

  async health() {
    return { status: this.#initialized ? 'healthy' : 'unknown', initialized: this.#initialized }
  }

  available() {
    return this.#initialized && !!this.#contract
  }

  supports(feature) {
    return this.#contract?.supports?.(feature) ?? false
  }

  async record(event, data) {
    if (!this.#contract) throw new AuditError('Audit contract not available', { operation: 'record' })
    return this.#contract.record(event, data)
  }

  async query(filters) {
    if (!this.#contract) throw new AuditError('Audit contract not available', { operation: 'query' })
    return this.#contract.query(filters)
  }

  async export(options) {
    if (!this.#contract) throw new AuditError('Audit contract not available', { operation: 'export' })
    return this.#contract.export(options)
  }

  async purge(before) {
    if (!this.#contract) throw new AuditError('Audit contract not available', { operation: 'purge' })
    await this.#contract.purge(before)
  }
}

export default AuditEngine
