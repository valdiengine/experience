import { BaseRepository } from '../../contracts/base.repository.js'

export class MemoryRepository extends BaseRepository {
  static entityName = 'memory'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'visitor', 'community']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
