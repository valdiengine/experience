import crypto from 'crypto'

export class ConflictDetector {
  constructor() {
    this.detectors = []
  }

  detect(sourceEntity, targetEntity, options = {}) {
    const fields = options.fields || this.#getAllFields(sourceEntity, targetEntity)
    const sourceChecksum = this.#checksum(sourceEntity, fields)
    const targetChecksum = this.#checksum(targetEntity, fields)

    if (sourceChecksum === targetChecksum) {
      return { hasConflict: false, reason: 'identical' }
    }

    if (!sourceEntity.updatedAt && !targetEntity.updatedAt) {
      return { hasConflict: false, reason: 'no_timestamps' }
    }

    if (!sourceEntity.updatedAt) {
      return { hasConflict: false, reason: 'source_no_timestamp', winner: 'target' }
    }

    if (!targetEntity.updatedAt) {
      return { hasConflict: false, reason: 'target_no_timestamp', winner: 'source' }
    }

    const sourceTime = new Date(sourceEntity.updatedAt).getTime()
    const targetTime = new Date(targetEntity.updatedAt).getTime()

    const sourceModifiedAfterSync = options.lastSync
      ? sourceTime > options.lastSync
      : true

    const targetModifiedAfterSync = options.lastSync
      ? targetTime > options.lastSync
      : true

    if (!sourceModifiedAfterSync && !targetModifiedAfterSync) {
      return { hasConflict: false, reason: 'neither_modified_after_sync' }
    }

    if (sourceModifiedAfterSync && !targetModifiedAfterSync) {
      return { hasConflict: false, reason: 'only_source_modified', winner: 'source' }
    }

    if (!sourceModifiedAfterSync && targetModifiedAfterSync) {
      return { hasConflict: false, reason: 'only_target_modified', winner: 'target' }
    }

    const changedFields = this.#findChangedFields(sourceEntity, targetEntity, fields)
    const hasOverlap = this.#hasFieldOverlap(changedFields)

    if (!hasOverlap) {
      return { hasConflict: false, reason: 'different_fields_changed', changedFields, winner: 'merge' }
    }

    return {
      hasConflict: true,
      reason: 'both_modified_same_fields',
      changedFields,
      sourceTimestamp: sourceTime,
      targetTimestamp: targetTime,
      sourceChecksum,
      targetChecksum,
      sourceData: this.#extractFields(sourceEntity, changedFields),
      targetData: this.#extractFields(targetEntity, changedFields),
    }
  }

  #getAllFields(source, target) {
    const fields = new Set()
    for (const key of Object.keys(source || {})) {
      if (!key.startsWith('_') && key !== 'raw' && key !== 'meta') {
        fields.add(key)
      }
    }
    for (const key of Object.keys(target || {})) {
      if (!key.startsWith('_') && key !== 'raw' && key !== 'meta') {
        fields.add(key)
      }
    }
    return [...fields]
  }

  #findChangedFields(source, target, fields) {
    const changed = []
    for (const field of fields) {
      const sVal = source?.[field]
      const tVal = target?.[field]
      if (JSON.stringify(sVal) !== JSON.stringify(tVal)) {
        changed.push(field)
      }
    }
    return changed
  }

  #hasFieldOverlap(changedFields) {
    return changedFields.length > 0
  }

  #extractFields(entity, fields) {
    const extracted = {}
    for (const field of fields) {
      extracted[field] = entity?.[field]
    }
    return extracted
  }

  #checksum(entity, fields) {
    const relevant = {}
    for (const field of fields) {
      relevant[field] = entity?.[field]
    }
    return crypto.createHash('md5').update(JSON.stringify(relevant)).digest('hex')
  }
}

export default ConflictDetector
