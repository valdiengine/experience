import { BaseRepository } from '../contracts/base.repository.js'

export class MediaRepository extends BaseRepository {
  static entityName = 'media'
  static version = '1.0.0'
  static dependencies = ['tenant']
  static readOnly = false
  static aggregate = false
  static cacheable = true
  static searchable = true
  static softDeletable = true
}
