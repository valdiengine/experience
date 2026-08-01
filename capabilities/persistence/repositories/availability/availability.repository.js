import { BaseRepository } from '../../contracts/base.repository.js'

export class AvailabilityRepository extends BaseRepository {
  static entityName = 'availability'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business', 'accommodation']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = false
  static softDeletable = true
}
