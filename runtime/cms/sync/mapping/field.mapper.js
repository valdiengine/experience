export class FieldMapper {
  #mappings = new Map()

  constructor() {
    this.#registerDefaults()
  }

  register(entityType, fieldMappings) {
    this.#mappings.set(entityType, fieldMappings)
  }

  map(source, direction, options = {}) {
    const entityType = options.entityType || source.type || 'default'
    const mappings = this.#mappings.get(entityType) || this.#mappings.get('default')
    if (!mappings) return { ...source }

    const result = {}
    const map = direction === 'toEngine' ? mappings.toEngine : mappings.toProvider

    for (const [targetField, sourceField] of Object.entries(map)) {
      const value = this.#resolveValue(source, sourceField)
      if (value !== undefined) {
        result[targetField] = value
      }
    }

    return result
  }

  mapToEngine(source, options = {}) {
    return this.map(source, 'toEngine', options)
  }

  mapToProvider(source, options = {}) {
    return this.map(source, 'toProvider', options)
  }

  getMapping(entityType) {
    return this.#mappings.get(entityType) || this.#mappings.get('default')
  }

  #resolveValue(source, fieldPath) {
    if (typeof fieldPath === 'function') return fieldPath(source)
    if (typeof fieldPath === 'string') {
      return source[fieldPath]
    }
    return undefined
  }

  #registerDefaults() {
    this.#mappings.set('default', {
      toEngine: {
        id: 'id',
        type: 'type',
        title: 'title',
        slug: 'slug',
        status: 'status',
        updatedAt: 'updatedAt',
      },
      toProvider: {
        id: 'id',
        type: 'type',
        title: 'title',
        slug: 'slug',
        status: 'status',
        updatedAt: 'updatedAt',
      },
    })

    this.#mappings.set('post', {
      toEngine: {
        cmsId: 'cmsId',
        type: () => 'post',
        title: 'title',
        slug: 'slug',
        content: 'content',
        excerpt: 'excerpt',
        status: 'status',
        authorId: 'authorId',
        categoryIds: 'categoryIds',
        tagIds: 'tagIds',
        featuredMediaId: 'featuredMediaId',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      toProvider: {
        title: 'title',
        slug: 'slug',
        content: 'content',
        excerpt: 'excerpt',
        status: 'status',
      },
    })

    this.#mappings.set('page', {
      toEngine: {
        cmsId: 'cmsId',
        type: () => 'page',
        title: 'title',
        slug: 'slug',
        content: 'content',
        status: 'status',
        parentId: 'parentId',
        template: 'template',
        order: 'order',
        featuredMediaId: 'featuredMediaId',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      toProvider: {
        title: 'title',
        slug: 'slug',
        content: 'content',
        status: 'status',
        template: 'template',
      },
    })

    this.#mappings.set('media', {
      toEngine: {
        mediaId: 'mediaId',
        url: 'url',
        thumbnails: 'thumbnails',
        mimeType: 'mimeType',
        size: 'size',
        width: 'width',
        height: 'height',
        alt: 'alt',
        caption: 'caption',
      },
      toProvider: {
        url: 'url',
        alt: 'alt',
        caption: 'caption',
      },
    })

    this.#mappings.set('seo', {
      toEngine: {
        entityId: 'entityId',
        entityType: 'entityType',
        title: 'title',
        description: 'description',
        canonicalUrl: 'canonicalUrl',
        ogTitle: 'ogTitle',
        ogDescription: 'ogDescription',
        ogImage: 'ogImage',
        noIndex: 'noIndex',
        keywords: 'keywords',
      },
      toProvider: {
        title: 'title',
        description: 'description',
        canonicalUrl: 'canonicalUrl',
      },
    })
  }
}

export default FieldMapper
