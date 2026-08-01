import { BaseRepository } from './base.repository.js'

export class AggregateRepository extends BaseRepository {
  static aggregate = true

  async save(root, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    if (!root || typeof root !== 'object') throw new Error(`Aggregate root is required for ${this.constructor.entityName}`)
    if (typeof root.validate === 'function') {
      const validation = root.validate()
      if (!validation.valid) throw new Error(`Aggregate root validation failed: ${validation.errors?.join(', ')}`)
    }
    const result = await this.adapter.create(root, options)
    this._emit('repository:entity_created', { entityId: root.id, aggregate: true })
    return result
  }

  async load(id, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    const query = this._buildQuery({ id })
    const root = await this.adapter.findOne(query, options)
    if (!root && options.throwIfNotFound !== false) {
      throw new Error(`${this.constructor.entityName} aggregate with id ${id} not found`)
    }
    return root || null
  }

  async remove(id, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const result = await this.adapter.delete(this._buildQuery({ id }), options)
    this._emit('repository:entity_deleted', { entityId: id, aggregate: true })
    return result
  }
}
