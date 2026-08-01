import { BaseRepository } from '../contracts/base.repository.js'

export class PaymentRepository extends BaseRepository {
  static entityName = 'payment'
  static version = '1.0.0'
  static dependencies = ['tenant', 'business', 'subscription']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
