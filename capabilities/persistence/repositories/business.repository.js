import { BaseRepository } from '../contracts/base.repository.js'

export class BusinessRepository extends BaseRepository {
  static entityName = 'business'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']
  static readOnly = false
  static aggregate = true
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
