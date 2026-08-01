import { RepositoryConcurrencyError, RepositoryNotFoundError } from '../errors/repository.errors.js'

export const OptimisticLockMixin = (Base) => class extends Base {
  async #validateVersion(query, expectedVersion, options) {
    if (expectedVersion === undefined) return null
    const current = await this.adapter.findOne(query)
    if (!current) {
      throw new RepositoryNotFoundError(`${this.constructor.entityName} not found for update`, {
        entityName: this.constructor.entityName, operation: 'update',
      })
    }
    if (current.version !== expectedVersion) {
      throw new RepositoryConcurrencyError(`Version conflict on ${this.constructor.entityName}`, {
        entityName: this.constructor.entityName, entityId: current.id, operation: 'update',
        expectedVersion, actualVersion: current.version,
      })
    }
    return current
  }
  #incrementVersion(data, current) {
    return { ...data, version: (current?.version || 0) + 1 }
  }
}
