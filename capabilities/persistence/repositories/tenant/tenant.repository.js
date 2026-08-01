import { BaseRepository } from '../../contracts/base.repository.js'

export class TenantRepository extends BaseRepository {
  static entityName = 'tenant'
  static version = '1.0.0'
  static dependencies = []
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
