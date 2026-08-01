import { BaseRepository } from '../../contracts/base.repository.js'

export class OwnerRepository extends BaseRepository {
  static entityName = 'owner'
  static version = '1.0.0'
  static dependencies = []
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}

export default OwnerRepository
