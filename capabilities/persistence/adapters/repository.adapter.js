export class RepositoryAdapter {
  constructor(provider, config = {}) {
    if (new.target === RepositoryAdapter) throw new Error('RepositoryAdapter is abstract')
    this.provider = provider; this.config = config; this.entityName = config.entityName || 'unknown'
  }
  async find(query, options) { throw new Error(`Adapter#find not implemented for ${this.entityName}`) }
  async findOne(query, options) { throw new Error(`Adapter#findOne not implemented for ${this.entityName}`) }
  async findById(id, options) { throw new Error(`Adapter#findById not implemented for ${this.entityName}`) }
  async findAll(options) { throw new Error(`Adapter#findAll not implemented for ${this.entityName}`) }
  async create(data, options) { throw new Error(`Adapter#create not implemented for ${this.entityName}`) }
  async createMany(data, options) { throw new Error(`Adapter#createMany not implemented for ${this.entityName}`) }
  async update(query, data, options) { throw new Error(`Adapter#update not implemented for ${this.entityName}`) }
  async updateMany(query, data, options) { throw new Error(`Adapter#updateMany not implemented for ${this.entityName}`) }
  async delete(query, options) { throw new Error(`Adapter#delete not implemented for ${this.entityName}`) }
  async count(query) { throw new Error(`Adapter#count not implemented for ${this.entityName}`) }
  async exists(query) { throw new Error(`Adapter#exists not implemented for ${this.entityName}`) }
  async paginate(query, page, size, options) { throw new Error(`Adapter#paginate not implemented for ${this.entityName}`) }
  async search(text, options) { throw new Error(`Adapter#search not implemented for ${this.entityName}`) }
  async aggregate(pipeline, options) { throw new Error(`Adapter#aggregate not implemented for ${this.entityName}`) }
  async distinct(field, query) { throw new Error(`Adapter#distinct not implemented for ${this.entityName}`) }
  async bulkCreate(data, options) { throw new Error(`Adapter#bulkCreate not implemented for ${this.entityName}`) }
  async bulkUpdate(query, data, options) { throw new Error(`Adapter#bulkUpdate not implemented for ${this.entityName}`) }
  async bulkDelete(query, options) { throw new Error(`Adapter#bulkDelete not implemented for ${this.entityName}`) }
  async beginTransaction(options) { throw new Error(`Adapter#beginTransaction not implemented for ${this.entityName}`) }
  async commitTransaction(handle) { throw new Error(`Adapter#commitTransaction not implemented for ${this.entityName}`) }
  async rollbackTransaction(handle) { throw new Error(`Adapter#rollbackTransaction not implemented for ${this.entityName}`) }
  async ping() { throw new Error(`Adapter#ping not implemented for ${this.entityName}`) }
  async health() { return { status: 'unknown', latency: -1 } }
}
