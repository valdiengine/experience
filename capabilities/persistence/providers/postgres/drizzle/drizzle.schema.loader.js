import { DrizzleError } from './drizzle.errors.js'

export class DrizzleSchemaLoader {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null
    this._schemas = new Map()
    this._tables = new Map()
    this._loaded = false
  }

  register(entityName, schemaDef) {
    if (!entityName || !schemaDef) throw new DrizzleError('Entity name and schema definition required', { operation: 'register' })
    const entry = {
      entityName,
      tableName: schemaDef.tableName || entityName,
      columns: schemaDef.columns || [],
      relations: schemaDef.relations || [],
      indexes: schemaDef.indexes || [],
      primaryKey: schemaDef.primaryKey || 'id',
      timestamps: schemaDef.timestamps !== false,
      softDelete: schemaDef.softDelete || false,
      versioning: schemaDef.versioning || false,
      tenantField: schemaDef.tenantField || 'tenantId',
      destinationField: schemaDef.destinationField || 'destinationId',
      drizzleTable: null,
      drizzleRelations: null,
    }
    this._schemas.set(entityName, entry)
  }

  async load(drizzleClient) {
    if (this._loaded) return
    const { drizzle } = drizzleClient
    if (!drizzle) {
      this._loaded = true
      return
    }
    try {
      for (const [entityName, schema] of this._schemas) {
        const table = this.#buildTable(schema, drizzle)
        schema.drizzleTable = table
        this._tables.set(entityName, table)
      }
      for (const [entityName, schema] of this._schemas) {
        if (schema.relations.length > 0) {
          schema.drizzleRelations = this.#buildRelations(schema)
        }
      }
      this._loaded = true
    } catch (err) {
      throw new DrizzleError(`Schema loading failed: ${err.message}`, { operation: 'load', cause: err })
    }
  }

  getTable(entityName) { return this._tables.get(entityName) || null }
  getSchema(entityName) { return this._schemas.get(entityName) || null }
  hasSchema(entityName) { return this._schemas.has(entityName) }

  tableNames() { return [...this._tables.keys()] }

  getCreateTableSQL(entityName) {
    const schema = this._schemas.get(entityName)
    if (!schema) return null
    const cols = schema.columns.map(c => {
      const parts = [`"${c.name}" ${c.type}`]
      if (c.primaryKey) parts.push('PRIMARY KEY')
      if (c.notNull) parts.push('NOT NULL')
      if (c.default !== undefined) parts.push(`DEFAULT ${c.default}`)
      if (c.unique) parts.push('UNIQUE')
      if (c.references) parts.push(`REFERENCES "${c.references.table}"("${c.references.column}")`)
      return parts.join(' ')
    })
    if (schema.timestamps) {
      cols.push('"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()')
      cols.push('"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    }
    if (schema.softDelete) cols.push('"deletedAt" TIMESTAMPTZ')
    if (schema.versioning) cols.push('"version" INTEGER NOT NULL DEFAULT 0')
    return `CREATE TABLE IF NOT EXISTS "${schema.tableName}" (\n  ${cols.join(',\n  ')}\n)`
  }

  #buildTable(schema, drizzle) {
    if (!drizzle.pgTable) return null
    const columns = {}
    for (const col of schema.columns) {
      columns[col.name] = this.#mapColumn(col, drizzle)
    }
    if (schema.timestamps) {
      columns.createdAt = drizzle.timestamptz('createdAt').notNull().defaultNow()
      columns.updatedAt = drizzle.timestamptz('updatedAt').notNull().defaultNow()
    }
    if (schema.softDelete) columns.deletedAt = drizzle.timestamptz('deletedAt')
    if (schema.versioning) columns.version = drizzle.integer('version').notNull().default(0)
    return drizzle.pgTable(schema.tableName, columns)
  }

  #mapColumn(col, drizzle) {
    const typeMap = {
      string: () => drizzle.text(col.name),
      text: () => drizzle.text(col.name),
      varchar: () => drizzle.varchar(col.name, { length: col.length || 255 }),
      integer: () => drizzle.integer(col.name),
      bigint: () => drizzle.bigint(col.name, { mode: 'number' }),
      boolean: () => drizzle.boolean(col.name),
      date: () => drizzle.date(col.name),
      timestamp: () => drizzle.timestamp(col.name),
      timestamptz: () => drizzle.timestamptz(col.name),
      float: () => drizzle.doublePrecision(col.name),
      decimal: () => drizzle.numeric(col.name),
      json: () => drizzle.json(col.name),
      jsonb: () => drizzle.jsonb(col.name),
      uuid: () => drizzle.uuid(col.name),
      serial: () => drizzle.serial(col.name),
      bigserial: () => drizzle.bigserial(col.name, { mode: 'number' }),
    }
    const mapper = typeMap[col.type]
    if (!mapper) return drizzle.text(col.name)
    let column = mapper()
    if (col.primaryKey) column = column.primaryKey()
    if (col.notNull) column = column.notNull()
    if (col.default !== undefined) column = column.default(col.default)
    if (col.unique) column = column.unique()
    return column
  }

  #buildRelations(schema) {
    return schema.relations.map(rel => ({
      field: rel.field,
      type: rel.type,
      references: rel.references,
      fields: rel.fields || [rel.field],
    }))
  }

  async destroy() {
    this._schemas.clear()
    this._tables.clear()
    this._loaded = false
  }
}

export default DrizzleSchemaLoader
