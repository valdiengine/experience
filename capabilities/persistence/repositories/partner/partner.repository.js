import { BaseRepository } from '../../contracts/base.repository.js'

export class PartnerRepository extends BaseRepository {
  static entityName = 'partner'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination', 'business']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
