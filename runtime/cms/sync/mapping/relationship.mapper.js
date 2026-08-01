export class RelationshipMapper {
  #relationships = new Map()

  constructor() {
    this.#registerDefaults()
  }

  register(entityType, relationshipConfig) {
    this.#relationships.set(entityType, relationshipConfig)
  }

  resolveRelationships(entity, options = {}) {
    const entityType = options.entityType || entity.type || 'default'
    const config = this.#relationships.get(entityType)
    if (!config) return { references: [] }

    const references = []
    for (const [field, relConfig] of Object.entries(config)) {
      const value = entity[field]
      if (!value) continue

      const ref = {
        field,
        type: relConfig.type,
        sourceId: entity.cmsId || entity.id,
        targetId: null,
        cardinality: relConfig.cardinality || 'single',
      }

      if (relConfig.cardinality === 'single') {
        ref.targetId = String(value)
      } else if (relConfig.cardinality === 'many') {
        ref.targetId = (Array.isArray(value) ? value : [value]).map(String)
      }

      references.push(ref)
    }

    return { references }
  }

  updateRelationships(entity, references, options = {}) {
    const entityType = options.entityType || entity.type || 'default'
    const config = this.#relationships.get(entityType)
    if (!config) return entity

    const updated = { ...entity }
    for (const ref of references || []) {
      const fieldConfig = config[ref.field]
      if (!fieldConfig) continue

      if (fieldConfig.cardinality === 'single') {
        updated[ref.field] = ref.targetId
      } else if (fieldConfig.cardinality === 'many') {
        updated[ref.field] = Array.isArray(ref.targetId) ? ref.targetId : [ref.targetId]
      }
    }

    return updated
  }

  getRelationships(entityType) {
    return this.#relationships.get(entityType) || {}
  }

  #registerDefaults() {
    this.#relationships.set('post', {
      authorId: { type: 'author', cardinality: 'single' },
      categoryIds: { type: 'category', cardinality: 'many' },
      tagIds: { type: 'tag', cardinality: 'many' },
      featuredMediaId: { type: 'media', cardinality: 'single' },
    })

    this.#relationships.set('page', {
      authorId: { type: 'author', cardinality: 'single' },
      parentId: { type: 'page', cardinality: 'single' },
      featuredMediaId: { type: 'media', cardinality: 'single' },
    })

    this.#relationships.set('category', {
      parentId: { type: 'category', cardinality: 'single' },
    })

    this.#relationships.set('media', {
      post: { type: 'post', cardinality: 'single' },
    })
  }
}

export default RelationshipMapper
