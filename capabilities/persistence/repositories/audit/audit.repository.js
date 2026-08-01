import { WriteRepository } from '../../contracts/write.repository.js'

export class AuditRepository extends WriteRepository {
  static entityName = 'audit'
  static version = '1.0.0'
  static dependencies = ['tenant']
  static readOnly = false
  static aggregate = false
  static cacheable = false
  static searchable = true
  static softDeletable = false
}
