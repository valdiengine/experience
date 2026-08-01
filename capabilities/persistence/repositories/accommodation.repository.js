import { BaseRepository } from '../contracts/base.repository.js'

export class AccommodationRepository extends BaseRepository {
  static entityName = 'accommodation'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
