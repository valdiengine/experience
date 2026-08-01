import { OrmSchemaError } from './orm.errors.js'

export class OrmSchemaMapper {
  constructor(config = {}) {
    this.config = config
    this.schemas = new Map()
    this.migrations = []
    this.validationRules = new Map()
  }

  registerSchema(entityName, schema) {
    if (!entityName || !schema) {
      throw new OrmSchemaError('Entity name and schema are required', { entityName })
    }
    const full = {
      entityName,
      table: schema.table || entityName,
      columns: this.#normalizeColumns(schema.columns || [], schema),
      indexes: schema.indexes || [],
      uniqueConstraints: schema.uniqueConstraints || [],
      foreignKeys: schema.foreignKeys || [],
      relations: schema.relations || {},
      timestamps: schema.timestamps !== false,
      softDelete: schema.softDelete || false,
      versioning: schema.versioning || false,
      tenantIsolation: schema.tenantIsolation !== false,
      destinationIsolation: schema.destinationIsolation !== false,
      options: schema.options || {},
      metadata: schema.metadata || {},
    }
    this.schemas.set(entityName, full)
    this.validationRules.set(entityName, this.#buildValidationRules(full))
    return full
  }

  schemaFor(entityName) { return this.schemas.get(entityName) || null }
  hasSchema(entityName) { return this.schemas.has(entityName) }

  toMigrationMetadata(entityName) {
    const schema = this.schemas.get(entityName)
    if (!schema) throw new OrmSchemaError(`No schema for "${entityName}"`, { entityName })
    return {
      entityName: schema.entityName,
      table: schema.table,
      operation: 'upsert',
      columns: schema.columns.map(c => ({
        name: c.name,
        type: c.type,
        nullable: c.nullable !== false,
        primaryKey: c.primaryKey || false,
        default: c.default,
        unique: c.unique || false,
        references: c.references || null,
        onDelete: c.onDelete || null,
      })),
      indexes: schema.indexes,
      uniqueConstraints: schema.uniqueConstraints,
      foreignKeys: schema.foreignKeys,
      timestamps: schema.timestamps,
      softDelete: schema.softDelete,
      versionColumn: schema.versioning ? 'version' : null,
    }
  }

  toValidationRules(entityName) {
    return this.validationRules.get(entityName) || []
  }

  prepareCreateTable(entityName) {
    const schema = this.schemas.get(entityName)
    if (!schema) throw new OrmSchemaError(`No schema for "${entityName}"`, { entityName })
    const columns = [...schema.columns]
    if (schema.timestamps) {
      columns.push({ name: 'createdAt', type: 'datetime', nullable: false, default: 'now' })
      columns.push({ name: 'updatedAt', type: 'datetime', nullable: false, default: 'now' })
    }
    if (schema.softDelete) {
      columns.push({ name: 'deletedAt', type: 'datetime', nullable: true })
    }
    if (schema.versioning) {
      columns.push({ name: 'version', type: 'integer', nullable: false, default: 0 })
    }
    if (schema.tenantIsolation) {
      if (!columns.find(c => c.name === 'tenantId')) {
        columns.unshift({ name: 'tenantId', type: 'string', nullable: false, indexed: true })
      }
    }
    if (schema.destinationIsolation) {
      if (!columns.find(c => c.name === 'destinationId')) {
        columns.unshift({ name: 'destinationId', type: 'string', nullable: true, indexed: true })
      }
    }
    return { table: schema.table, columns, indexes: schema.indexes, foreignKeys: schema.foreignKeys }
  }

  prepareAlterTable(entityName, existingColumns) {
    const schema = this.schemas.get(entityName)
    if (!schema) throw new OrmSchemaError(`No schema for "${entityName}"`, { entityName })
    const desired = this.prepareCreateTable(entityName)
    const existingNames = new Set(existingColumns.map(c => c.name))
    const additions = desired.columns.filter(c => !existingNames.has(c.name))
    const removals = existingColumns.filter(c => !desired.columns.find(d => d.name === c.name))
    return {
      table: schema.table,
      addColumns: additions,
      removeColumns: removals,
      addIndexes: schema.indexes,
    }
  }

  #normalizeColumns(columns, schema) {
    return columns.map(col => {
      if (typeof col === 'string') return { name: col, type: 'string' }
      return {
        name: col.name,
        type: col.type || 'string',
        nullable: col.nullable !== false,
        primaryKey: col.primaryKey || false,
        unique: col.unique || false,
        default: col.default,
        indexed: col.indexed || false,
        references: col.references || null,
        onDelete: col.onDelete || null,
        description: col.description || null,
      }
    })
  }

  #buildValidationRules(schema) {
    const rules = []
    for (const col of schema.columns) {
      if (!col.nullable) rules.push({ field: col.name, rule: 'required', message: `${col.name} is required` })
      if (col.type === 'string' && col.maxLength) rules.push({ field: col.name, rule: 'maxLength', value: col.maxLength, message: `${col.name} max ${col.maxLength} chars` })
      if (col.type === 'email') rules.push({ field: col.name, rule: 'email', message: `${col.name} must be valid email` })
      if (col.unique) rules.push({ field: col.name, rule: 'unique', message: `${col.name} must be unique` })
    }
    return rules
  }
}

export default OrmSchemaMapper
