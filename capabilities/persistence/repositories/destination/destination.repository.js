import { BaseRepository } from '../../contracts/base.repository.js'

export class DestinationRepository extends BaseRepository {
  static entityName = 'destination'
  static version = '1.0.0'
  static dependencies = ['tenant']
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
