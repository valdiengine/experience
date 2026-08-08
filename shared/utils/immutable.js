/**
 * Immutable Utilities
 * 
 * Helper functions for creating immutable data structures.
 */

export function freeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Object.isFrozen(obj)) {
    return obj
  }
  
  Object.freeze(obj)
  
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      freeze(value)
    }
  }
  
  return obj
}

export function seal(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Object.isSealed(obj)) {
    return obj
  }
  
  Object.seal(obj)
  
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      seal(value)
    }
  }
  
  return obj
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item))
  }
  
  const cloned = {}
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone(obj[key])
  }
  return cloned
}

export function deepMerge(target, source, options = {}) {
  const { arrayMerge = 'union' } = options
  
  const result = { ...target }
  
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key]
    
    if (sourceValue === null || sourceValue === undefined) {
      result[key] = sourceValue
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      if (arrayMerge === 'union') {
        result[key] = [...new Set([...targetValue, ...sourceValue])]
      } else if (arrayMerge === 'replace') {
        result[key] = [...sourceValue]
      } else if (typeof arrayMerge === 'function') {
        result[key] = arrayMerge(targetValue, sourceValue)
      }
    } else if (typeof sourceValue === 'object' && sourceValue !== null &&
               typeof targetValue === 'object' && targetValue !== null) {
      result[key] = deepMerge(targetValue, sourceValue, options)
    } else {
      result[key] = sourceValue
    }
  }
  
  return result
}

export default {
  freeze,
  seal,
  deepClone,
  deepMerge
}
