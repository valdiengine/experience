import { BaseRepository } from '../../contracts/base.repository.js'

export class SubscriptionRepository extends BaseRepository {
  static entityName = 'subscription'
  static version = '1.0.0'
  static dependencies = ['tenant', 'business']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
