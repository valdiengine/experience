import { BaseRepository } from '../../contracts/base.repository.js'

export class CampaignRepository extends BaseRepository {
  static entityName = 'campaign'
  static version = '1.0.0'
  static dependencies = ['tenant', 'destination']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
