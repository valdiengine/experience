export const ConflictResolutionStrategy = Object.freeze({
  LAST_WRITE_WINS: 'last_write_wins',
  SOURCE_PRIORITY: 'source_priority',
  TARGET_PRIORITY: 'target_priority',
  MANUAL_REVIEW: 'manual_review',
  FIELD_LEVEL_MERGE: 'field_level_merge',
  CUSTOM_POLICY: 'custom_policy',
  SKIP: 'skip',
})

export class ConflictPolicy {
  #policies = new Map()

  constructor() {
    this.#setDefaults()
  }

  set(entityType, policy) {
    this.#policies.set(entityType, {
      strategy: policy.strategy || ConflictResolutionStrategy.LAST_WRITE_WINS,
      priority: policy.priority || 'source',
      fieldRules: policy.fieldRules || {},
      customResolver: policy.customResolver || null,
      autoResolve: policy.autoResolve ?? true,
      escalateAfter: policy.escalateAfter || 3,
    })
  }

  get(entityType) {
    return this.#policies.get(entityType) || this.#policies.get('default')
  }

  resolve(entityType, conflict, context = {}) {
    const policy = this.get(entityType)
    if (!policy) return { action: 'skip', reason: 'no_policy' }

    switch (policy.strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return this.#lastWriteWins(conflict, policy)
      case ConflictResolutionStrategy.SOURCE_PRIORITY:
        return this.#sourcePriority(conflict, policy)
      case ConflictResolutionStrategy.TARGET_PRIORITY:
        return this.#targetPriority(conflict, policy)
      case ConflictResolutionStrategy.FIELD_LEVEL_MERGE:
        return this.#fieldLevelMerge(conflict, policy)
      case ConflictResolutionStrategy.CUSTOM_POLICY:
        return this.#customPolicy(conflict, policy, context)
      case ConflictResolutionStrategy.MANUAL_REVIEW:
        return { action: 'escalate', reason: 'manual_review_required' }
      case ConflictResolutionStrategy.SKIP:
        return { action: 'skip', reason: 'skipped_by_policy' }
      default:
        return { action: 'escalate', reason: 'unknown_strategy' }
    }
  }

  #lastWriteWins(conflict) {
    const winner = conflict.sourceTimestamp >= conflict.targetTimestamp ? 'source' : 'target'
    return {
      action: 'auto_resolve',
      winner,
      strategy: 'last_write_wins',
      reason: `Last write wins: ${winner} at ${Math.max(conflict.sourceTimestamp, conflict.targetTimestamp)}`,
    }
  }

  #sourcePriority(conflict) {
    return {
      action: 'auto_resolve',
      winner: 'source',
      strategy: 'source_priority',
      reason: 'Source CMS has priority over target',
    }
  }

  #targetPriority(conflict) {
    return {
      action: 'auto_resolve',
      winner: 'target',
      strategy: 'target_priority',
      reason: 'Target has priority over source CMS',
    }
  }

  #fieldLevelMerge(conflict, policy) {
    const merged = {}
    const fields = new Set([...Object.keys(conflict.sourceData || {}), ...Object.keys(conflict.targetData || {})])

    for (const field of fields) {
      const rule = policy.fieldRules?.[field]
      if (!rule) {
        merged[field] = conflict.sourceData?.[field] ?? conflict.targetData?.[field]
        continue
      }

      switch (rule) {
        case 'source':
          merged[field] = conflict.sourceData?.[field]
          break
        case 'target':
          merged[field] = conflict.targetData?.[field]
          break
        case 'merge':
          merged[field] = this.#mergeValues(conflict.sourceData?.[field], conflict.targetData?.[field])
          break
        default:
          merged[field] = conflict.sourceData?.[field] ?? conflict.targetData?.[field]
      }
    }

    return {
      action: 'auto_resolve',
      winner: 'merged',
      strategy: 'field_level_merge',
      merged,
      reason: 'Field-level merge applied',
    }
  }

  #customPolicy(conflict, policy, context) {
    if (typeof policy.customResolver === 'function') {
      return policy.customResolver(conflict, context)
    }
    return { action: 'escalate', reason: 'custom_resolver_not_available' }
  }

  #mergeValues(sourceVal, targetVal) {
    if (sourceVal === undefined && targetVal === undefined) return undefined
    if (sourceVal === undefined) return targetVal
    if (targetVal === undefined) return sourceVal
    if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
      return [...new Set([...sourceVal, ...targetVal])]
    }
    if (typeof sourceVal === 'object' && typeof targetVal === 'object' && sourceVal !== null && targetVal !== null) {
      return { ...sourceVal, ...targetVal }
    }
    return targetVal ?? sourceVal
  }

  #setDefaults() {
    this.#policies.set('default', {
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      priority: 'source',
      fieldRules: {},
      autoResolve: true,
      escalateAfter: 3,
    })

    this.#policies.set('post', {
      strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
      priority: 'source',
      fieldRules: {
        title: 'source',
        content: 'source',
        excerpt: 'source',
        slug: 'target',
        status: 'target',
        featuredMediaId: 'source',
      },
      autoResolve: true,
      escalateAfter: 3,
    })

    this.#policies.set('page', {
      strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
      priority: 'source',
      fieldRules: {
        title: 'source',
        content: 'source',
        slug: 'target',
        status: 'target',
        template: 'source',
      },
      autoResolve: true,
      escalateAfter: 3,
    })

    this.#policies.set('seo', {
      strategy: ConflictResolutionStrategy.FIELD_LEVEL_MERGE,
      priority: 'target',
      fieldRules: {
        title: 'target',
        description: 'target',
        canonicalUrl: 'source',
        ogTitle: 'target',
        ogDescription: 'target',
        noIndex: 'source',
        keywords: 'merge',
      },
      autoResolve: true,
      escalateAfter: 5,
    })

    this.#policies.set('media', {
      strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
      priority: 'source',
      autoResolve: true,
      escalateAfter: 2,
    })

    this.#policies.set('category', {
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      priority: 'source',
      autoResolve: true,
      escalateAfter: 3,
    })
  }

  list() {
    const result = {}
    for (const [key, policy] of this.#policies) {
      result[key] = {
        strategy: policy.strategy,
        priority: policy.priority,
        autoResolve: policy.autoResolve,
        escalateAfter: policy.escalateAfter,
        fieldRules: Object.keys(policy.fieldRules),
      }
    }
    return result
  }
}

export default ConflictPolicy
