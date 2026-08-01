import { BaseRepository } from '../../contracts/base.repository.js'

export class ObservationRepository extends BaseRepository {
  static entityName = 'observation'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'species', 'visitor']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
