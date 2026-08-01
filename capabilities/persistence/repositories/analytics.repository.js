import { ReadRepository } from '../contracts/read.repository.js'

export class AnalyticsRepository extends ReadRepository {
  static entityName = 'analytics'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']
  static readOnly = true
  static aggregate = false
  static cacheable = true
  static searchable = false
  static softDeletable = false
}
