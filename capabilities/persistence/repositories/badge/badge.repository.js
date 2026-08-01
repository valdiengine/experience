import { BaseRepository } from '../../contracts/base.repository.js'

export class BadgeRepository extends BaseRepository {
  static entityName = 'badge'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
