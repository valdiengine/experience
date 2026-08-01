/**
 * InMemoryRepositoryAdapter — writable test adapter (P13.5.7)
 *
 * Implements the same RepositoryAdapter contract as the interface-only
 * MockRepositoryAdapter, but backed by a real in-memory store. This is what
 * closes the "no storage" gap so capability tests can assert persisted state.
 *
 * It is test infrastructure only — never registered by the runtime.
 */
import { RepositoryAdapter } from '../../capabilities/persistence/adapters/repository.adapter.js'

const OPS = ['gte', 'lte', 'gt', 'lt', 'ne', 'in', 'contains', 'startsWith', 'endsWith']

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return a === b
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => bk.includes(k) && deepEqual(a[k], b[k]))
}

function getPath(entity, field) {
  const parts = String(field).split('.')
  let value = entity
  for (const part of parts) {
    if (value === null || typeof value !== 'object') return undefined
    value = value[part]
  }
  return value
}

function setPath(target, field, value) {
  const parts = String(field).split('.')
  let cursor = target
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (cursor[part] === null || typeof cursor[part] !== 'object') cursor[part] = {}
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

function mergePaths(entity, data) {
  const shallow = {}
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('.')) setPath(entity, key, value)
    else shallow[key] = value
  }
  return { ...entity, ...shallow }
}

function matches(entity, query = {}) {
  for (const [field, expected] of Object.entries(query)) {
    if (expected === undefined) continue
    if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
      const hasOps = Object.keys(expected).some((k) => OPS.includes(k))
      if (hasOps) {
        const actual = getPath(entity, field)
        for (const [op, value] of Object.entries(expected)) {
          if (op === 'gte') { if (!(actual >= value)) return false }
          else if (op === 'lte') { if (!(actual <= value)) return false }
          else if (op === 'gt') { if (!(actual > value)) return false }
          else if (op === 'lt') { if (!(actual < value)) return false }
          else if (op === 'ne') { if (actual === value) return false }
          else if (op === 'in') { if (!(Array.isArray(value) && value.includes(actual))) return false }
          else if (op === 'contains') {
            if (Array.isArray(actual)) { if (!actual.includes(value)) return false }
            else if (!String(actual ?? '').includes(String(value))) return false
          }
          else if (op === 'startsWith') { if (!String(actual ?? '').startsWith(String(value))) return false }
          else if (op === 'endsWith') { if (!String(actual ?? '').endsWith(String(value))) return false }
        }
        continue
      }
      if (!deepEqual(getPath(entity, field), expected)) return false
      continue
    }
    if (expected === null) {
      if (getPath(entity, field) !== null && getPath(entity, field) !== undefined) return false
      continue
    }
    if (getPath(entity, field) !== expected) return false
  }
  return true
}

export class InMemoryRepositoryAdapter extends RepositoryAdapter {
  static store = new Map()

  constructor(provider, config = {}) {
    super(provider, config)
    this.entityName = config.entityName || 'unknown'
  }

  #table() {
    if (!InMemoryRepositoryAdapter.store.has(this.entityName)) {
      InMemoryRepositoryAdapter.store.set(this.entityName, new Map())
    }
    return InMemoryRepositoryAdapter.store.get(this.entityName)
  }

  static reset() {
    InMemoryRepositoryAdapter.store.clear()
  }

  static seed(entityName, entities) {
    const table = InMemoryRepositoryAdapter.store.get(entityName) || new Map()
    for (const entity of entities) table.set(entity.id, entity)
    InMemoryRepositoryAdapter.store.set(entityName, table)
  }

  #all() {
    return Array.from(this.#table().values())
  }

  #matching(query) {
    return this.#all().filter((e) => matches(e, query))
  }

  async ping() { return true }

  async health() {
    return { status: 'up', provider: 'in-memory', entityName: this.entityName, rows: this.#table().size }
  }

  async find(query = {}, options = {}) {
    let rows = this.#matching(query)
    if (options?.limit && Number.isFinite(options.limit)) rows = rows.slice(0, options.limit)
    return rows
  }

  async findOne(query = {}, options = {}) {
    return this.#matching(query)[0] || null
  }

  async findById(id, options = {}) {
    return this.#table().get(id) || null
  }

  async findAll(options = {}) {
    return this.#all()
  }

  async create(data = {}, options = {}) {
    if (data == null || typeof data !== 'object') return null
    const entity = { ...data }
    if (!entity.id) entity.id = `${this.entityName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.#table().set(entity.id, entity)
    return entity
  }

  async createMany(data = [], options = {}) {
    return Promise.all(data.map((d) => this.create(d)))
  }

  async update(query = {}, data = {}, options = {}) {
    const matched = this.#matching(query)
    if (matched.length === 0) return null
    const first = matched[0]
    const updated = mergePaths({ ...first }, data)
    this.#table().set(first.id, updated)
    return updated
  }

  async updateMany(query = {}, data = {}, options = {}) {
    const matched = this.#matching(query)
    for (const entity of matched) {
      this.#table().set(entity.id, mergePaths({ ...entity }, data))
    }
    return matched.length
  }

  async delete(query = {}, options = {}) {
    const matched = this.#matching(query)
    for (const entity of matched) this.#table().delete(entity.id)
    return matched.length
  }

  async upsert(query = {}, data = {}, options = {}) {
    const existing = this.#matching(query)[0]
    if (existing) {
      const updated = mergePaths({ ...existing }, data)
      this.#table().set(existing.id, updated)
      return updated
    }
    return this.create(data)
  }

  async count(query = {}) {
    return this.#matching(query).length
  }

  async exists(query = {}) {
    return this.#matching(query).length > 0
  }

  async paginate(query = {}, page = 1, size = 50, options = {}) {
    const rows = this.#matching(query)
    const start = (page - 1) * size
    return { items: rows.slice(start, start + size), total: rows.length, page, size }
  }

  async search(text = '', options = {}) {
    const needle = String(text).toLowerCase()
    if (!needle) return []
    return this.#all().filter((e) =>
      Object.entries(e).some(([k, v]) =>
        typeof v === 'string' && v.toLowerCase().includes(needle)
      )
    )
  }

  async aggregate(pipeline = [], options = {}) {
    const by = pipeline.find((s) => s.$group)
    if (!by) return []
    const key = by.$group?._id
    if (!key) return []
    const buckets = new Map()
    for (const entity of this.#all()) {
      const group = entity[key] ?? null
      if (!buckets.has(group)) buckets.set(group, [])
      buckets.get(group).push(entity)
    }
    return Array.from(buckets.entries()).map(([group, items]) => ({ key: group, count: items.length, items }))
  }

  async distinct(field, query = {}) {
    return [...new Set(this.#matching(query).map((e) => e[field]))]
  }

  async bulkCreate(data = [], options = {}) { return this.createMany(data) }
  async bulkUpdate(query = {}, data = {}, options = {}) { return this.updateMany(query, data) }
  async bulkDelete(query = {}, options = {}) { return this.delete(query) }

  async beginTransaction() { return { id: `inmem_tx_${Date.now()}`, provider: 'in-memory' } }
  async commitTransaction() { return true }
  async rollbackTransaction() { return true }
}

export default InMemoryRepositoryAdapter
