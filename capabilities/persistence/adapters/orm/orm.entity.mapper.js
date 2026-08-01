import { OrmMappingError } from './orm.errors.js'

export class OrmEntityMapper {
  constructor(config = {}) {
    this.config = config
    this.mappings = new Map()
    this.valueObjectMappers = new Map()
    this.embeddedMappers = new Map()
    this.relationMappers = new Map()
  }

  registerMapping(entityName, mapping) {
    this.mappings.set(entityName, {
      table: mapping.table || entityName,
      fields: mapping.fields || [],
      valueObjects: mapping.valueObjects || {},
      embedded: mapping.embedded || {},
      relations: mapping.relations || {},
      enums: mapping.enums || {},
      timestamps: mapping.timestamps || { createdAt: 'createdAt', updatedAt: 'updatedAt', deletedAt: 'deletedAt' },
      versionField: mapping.versionField || 'version',
      tenantField: mapping.tenantField || 'tenantId',
      destinationField: mapping.destinationField || 'destinationId',
      identityField: mapping.identityField || 'createdBy',
      ...mapping,
    })
  }

  registerValueObject(entityName, fieldName, mapper) {
    const key = `${entityName}.${fieldName}`
    this.valueObjectMappers.set(key, mapper)
  }

  registerEmbedded(entityName, fieldName, mapper) {
    const key = `${entityName}.${fieldName}`
    this.embeddedMappers.set(key, mapper)
  }

  registerRelation(entityName, fieldName, mapper) {
    const key = `${entityName}.${fieldName}`
    this.relationMappers.set(key, mapper)
  }

  toPersistence(entityName, domainEntity) {
    const mapping = this.mappings.get(entityName)
    if (!mapping) throw new OrmMappingError(`No mapping registered for entity "${entityName}"`, { entityName, direction: 'toPersistence' })
    if (!domainEntity || typeof domainEntity !== 'object') {
      throw new OrmMappingError(`Invalid domain entity for "${entityName}"`, { entityName, direction: 'toPersistence' })
    }
    const record = {}
    for (const field of mapping.fields) {
      const sourceField = field.source || field.name
      const targetField = field.target || field.name
      const value = domainEntity[sourceField]
      record[targetField] = value !== undefined ? value : (field.defaultValue ?? null)
    }
    for (const [voField, voConfig] of Object.entries(mapping.valueObjects)) {
      const voMapper = this.valueObjectMappers.get(`${entityName}.${voField}`)
      const value = domainEntity[voField]
      if (value !== undefined) {
        record[voConfig.targetField || voField] = voMapper ? voMapper.toPersistence(value) : this.#defaultVoToPersistence(value, voConfig)
      }
    }
    for (const [embField, embConfig] of Object.entries(mapping.embedded)) {
      const embMapper = this.embeddedMappers.get(`${entityName}.${embField}`)
      const value = domainEntity[embField]
      if (value !== undefined) {
        const flattened = embMapper ? embMapper.toPersistence(value) : value
        if (embConfig.prefix) {
          for (const [k, v] of Object.entries(flattened)) record[`${embConfig.prefix}${k}`] = v
        } else {
          Object.assign(record, flattened)
        }
      }
    }
    if (mapping.timestamps) {
      if (mapping.timestamps.createdAt && domainEntity.createdAt) record[mapping.timestamps.createdAt] = domainEntity.createdAt
      if (mapping.timestamps.updatedAt && domainEntity.updatedAt) record[mapping.timestamps.updatedAt] = domainEntity.updatedAt
      if (mapping.timestamps.deletedAt && domainEntity.deletedAt !== undefined) record[mapping.timestamps.deletedAt] = domainEntity.deletedAt
    }
    if (mapping.versionField && domainEntity.version !== undefined) record[mapping.versionField] = domainEntity.version
    if (mapping.tenantField && domainEntity.tenantId) record[mapping.tenantField] = domainEntity.tenantId
    if (mapping.destinationField && domainEntity.destinationId) record[mapping.destinationField] = domainEntity.destinationId
    if (mapping.identityField && domainEntity.createdBy) record[mapping.identityField] = domainEntity.createdBy
    return record
  }

  toDomain(entityName, persistenceRecord) {
    const mapping = this.mappings.get(entityName)
    if (!mapping) throw new OrmMappingError(`No mapping registered for entity "${entityName}"`, { entityName, direction: 'toDomain' })
    if (!persistenceRecord || typeof persistenceRecord !== 'object') {
      throw new OrmMappingError(`Invalid persistence record for "${entityName}"`, { entityName, direction: 'toDomain' })
    }
    const entity = {}
    for (const field of mapping.fields) {
      const sourceField = field.target || field.name
      const targetField = field.source || field.name
      const value = persistenceRecord[sourceField]
      entity[targetField] = value !== undefined ? this.#convertField(value, field.type) : null
    }
    for (const [voField, voConfig] of Object.entries(mapping.valueObjects)) {
      const voMapper = this.valueObjectMappers.get(`${entityName}.${voField}`)
      const sourceField = voConfig.targetField || voField
      const rawValue = persistenceRecord[sourceField]
      if (rawValue !== undefined) {
        entity[voField] = voMapper ? voMapper.toDomain(rawValue) : rawValue
      }
    }
    for (const [embField, embConfig] of Object.entries(mapping.embedded)) {
      const embMapper = this.embeddedMappers.get(`${entityName}.${embField}`)
      if (embConfig.prefix) {
        const extracted = {}
        for (const [k, v] of Object.entries(persistenceRecord)) {
          if (k.startsWith(embConfig.prefix)) extracted[k.slice(embConfig.prefix.length)] = v
        }
        entity[embField] = embMapper ? embMapper.toDomain(extracted) : extracted
      }
    }
    for (const [relField, relConfig] of Object.entries(mapping.relations)) {
      const relMapper = this.relationMappers.get(`${entityName}.${relField}`)
      const rawValue = persistenceRecord[relConfig.foreignKey || `${relField}Id`]
      if (rawValue !== undefined) {
        entity[relField] = relMapper ? relMapper.toDomain(rawValue) : rawValue
      }
    }
    if (mapping.timestamps) {
      if (mapping.timestamps.createdAt) entity.createdAt = persistenceRecord[mapping.timestamps.createdAt] || null
      if (mapping.timestamps.updatedAt) entity.updatedAt = persistenceRecord[mapping.timestamps.updatedAt] || null
      if (mapping.timestamps.deletedAt) entity.deletedAt = persistenceRecord[mapping.timestamps.deletedAt] || null
    }
    if (mapping.versionField) entity.version = persistenceRecord[mapping.versionField] || 0
    if (mapping.tenantField) entity.tenantId = persistenceRecord[mapping.tenantField] || null
    if (mapping.destinationField) entity.destinationId = persistenceRecord[mapping.destinationField] || null
    if (mapping.identityField) entity.createdBy = persistenceRecord[mapping.identityField] || null
    return entity
  }

  toOrm(entityName, domainEntity) {
    return this.toPersistence(entityName, domainEntity)
  }

  fromOrm(entityName, ormRecord) {
    return this.toDomain(entityName, ormRecord)
  }

  toOrmBatch(entityName, domainEntities) {
    return domainEntities.map(e => this.toOrm(entityName, e))
  }

  fromOrmBatch(entityName, ormRecords) {
    return ormRecords.map(r => this.fromOrm(entityName, r))
  }

  mappingFor(entityName) { return this.mappings.get(entityName) || null }

  hasMapping(entityName) { return this.mappings.has(entityName) }

  #convertField(value, type) {
    if (value === null || value === undefined) return null
    switch (type) {
      case 'date': return value instanceof Date ? value : new Date(value)
      case 'number': return Number(value)
      case 'boolean': return Boolean(value)
      case 'json': return typeof value === 'string' ? JSON.parse(value) : value
      default: return value
    }
  }

  #defaultVoToPersistence(value, voConfig) {
    if (voConfig.serialize) return voConfig.serialize(value)
    if (typeof value === 'object' && value !== null) {
      if (typeof value.toJSON === 'function') return value.toJSON()
      if (typeof value.toString === 'function') return value.toString()
      return JSON.stringify(value)
    }
    return value
  }
}

export default OrmEntityMapper
