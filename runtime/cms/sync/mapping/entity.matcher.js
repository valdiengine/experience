export class EntityMatcher {
  constructor() {
    this.matchers = new Map()
    this.#registerDefaults()
  }

  register(entityType, matcherFn) {
    this.matchers.set(entityType, matcherFn)
  }

  match(source, target, options = {}) {
    const matcher = this.matchers.get(options.entityType || source.type || 'default')
    if (matcher) {
      return matcher(source, target, options)
    }
    return this.#defaultMatch(source, target)
  }

  findByExternalId(externalId, entities) {
    return (entities || []).find(e => e.cmsId === externalId || e.providerMediaId === externalId || e.externalId === externalId) || null
  }

  findBySlug(slug, entities) {
    return (entities || []).find(e => e.slug === slug) || null
  }

  findByTitle(title, entities) {
    return (entities || []).find(e => e.title === title) || null
  }

  matchBatch(sources, targets, options = {}) {
    const matched = []
    const unmatchedSources = []
    const unmatchedTargets = [...targets]

    for (const source of sources) {
      let found = false
      for (let i = unmatchedTargets.length - 1; i >= 0; i--) {
        if (this.match(source, unmatchedTargets[i], options).matched) {
          matched.push({ source, target: unmatchedTargets[i] })
          unmatchedTargets.splice(i, 1)
          found = true
          break
        }
      }
      if (!found) {
        unmatchedSources.push(source)
      }
    }

    return { matched, unmatchedSources, unmatchedTargets }
  }

  #defaultMatch(source, target) {
    const sourceId = source.cmsId || source.externalId || source.id
    const targetId = target.cmsId || target.externalId || target.id

    if (sourceId && targetId && sourceId === targetId) {
      return { matched: true, confidence: 1, by: 'id' }
    }

    if (source.slug && target.slug && source.slug === target.slug) {
      return { matched: true, confidence: 0.9, by: 'slug' }
    }

    return { matched: false, confidence: 0 }
  }

  #registerDefaults() {
    this.matchers.set('default', (source, target) => this.#defaultMatch(source, target))

    this.matchers.set('post', (source, target) => {
      if (source.cmsId && target.cmsId && source.cmsId === target.cmsId) {
        return { matched: true, confidence: 1, by: 'cmsId' }
      }
      if (source.slug && target.slug && source.slug === target.slug) {
        return { matched: true, confidence: 0.95, by: 'slug' }
      }
      if (source.title && target.title && source.title === target.title) {
        return { matched: true, confidence: 0.7, by: 'title' }
      }
      return { matched: false, confidence: 0 }
    })

    this.matchers.set('page', (source, target) => {
      if (source.cmsId && target.cmsId && source.cmsId === target.cmsId) {
        return { matched: true, confidence: 1, by: 'cmsId' }
      }
      if (source.slug && target.slug && source.slug === target.slug) {
        return { matched: true, confidence: 0.95, by: 'slug' }
      }
      return { matched: false, confidence: 0 }
    })

    this.matchers.set('media', (source, target) => {
      if (source.mediaId && target.mediaId && source.mediaId === target.mediaId) {
        return { matched: true, confidence: 1, by: 'mediaId' }
      }
      if (source.providerMediaId && target.providerMediaId && source.providerMediaId === target.providerMediaId) {
        return { matched: true, confidence: 1, by: 'providerMediaId' }
      }
      if (source.checksum && target.checksum && source.checksum === target.checksum) {
        return { matched: true, confidence: 0.9, by: 'checksum' }
      }
      return { matched: false, confidence: 0 }
    })

    this.matchers.set('seo', (source, target) => {
      if (source.entityId && target.entityId && source.entityType && target.entityType &&
          source.entityId === target.entityId && source.entityType === target.entityType) {
        return { matched: true, confidence: 1, by: 'entityId_entityType' }
      }
      return { matched: false, confidence: 0 }
    })

    this.matchers.set('category', (source, target) => {
      if (source.cmsId && target.cmsId && source.cmsId === target.cmsId) {
        return { matched: true, confidence: 1, by: 'cmsId' }
      }
      if (source.slug && target.slug && source.slug === target.slug) {
        return { matched: true, confidence: 0.95, by: 'slug' }
      }
      if (source.name && target.name && source.name.toLowerCase() === target.name.toLowerCase()) {
        return { matched: true, confidence: 0.8, by: 'name' }
      }
      return { matched: false, confidence: 0 }
    })
  }
}

export default EntityMatcher
