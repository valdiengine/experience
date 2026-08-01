import { BaseRepository } from '../contracts/base.repository.js'

export class NotificationRepository extends BaseRepository {
  static entityName = 'notification'
  static version = '1.0.0'
  static dependencies = ['tenant', 'identity']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
