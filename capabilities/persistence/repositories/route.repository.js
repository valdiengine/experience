import { BaseRepository } from '../contracts/base.repository.js'

export class RouteRepository extends BaseRepository {
  static entityName = 'route'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
