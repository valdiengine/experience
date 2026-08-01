import { BaseRepository } from './base.repository.js'

export class ReadRepository extends BaseRepository {
  static readOnly = true

  async aggregate(pipeline, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.adapter.aggregate(pipeline, options)
  }

  async distinct(field, query = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.adapter.distinct(field, this._buildQuery(query))
  }

  async projection(query, fields, options = {}) {
    this._enforceNotDisposed(); this._enforceInitialized(); this._enforceContext()
    return this.adapter.find(this._buildQuery(query), { ...options, fields })
  }
}
