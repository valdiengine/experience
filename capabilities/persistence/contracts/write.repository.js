import { BaseRepository } from './base.repository.js'

export class WriteRepository extends BaseRepository {
  static readOnly = false

  async bulkCreate(data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const entities = await this.adapter.bulkCreate(data, options)
    this._emit('repository:entity_created', { count: data.length })
    return entities
  }

  async bulkUpdate(query, data, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const count = await this.adapter.bulkUpdate(this._buildQuery(query), data, options)
    this._emit('repository:entity_updated', { count })
    return count
  }

  async bulkDelete(query, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext(); this._enforceWritable()
    const count = await this.adapter.bulkDelete(this._buildQuery(query), options)
    this._emit('repository:entity_deleted', { count })
    return count
  }
}
