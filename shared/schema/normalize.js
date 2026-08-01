import { EXCLUDE_FIELDS } from '../constants/status.js'
import { getType } from '../utils/format.js'

export const inferFields = (items, max = 6) => {
  if (!items?.length) return []
  return Object.keys(items[0]).filter(k => {
    if (EXCLUDE_FIELDS.has(k)) return false
    const t = getType(items[0][k])
    return t === 'string' || t === 'number' || t === 'boolean'
  }).slice(0, max)
}

export const inferEnumFields = (items) => {
  if (!items?.length) return {}
  const skip = new Set(['id', 'slug', 'name', 'title', 'description', 'bio', 'synopsis', 'quote', 'question', 'answer', 'email', 'phone', 'address', 'avatar', 'logo', 'icon'])
  const enums = {}
  for (const key of Object.keys(items[0])) {
    if (skip.has(key)) continue
    const values = [...new Set(items.map(i => i[key]).filter(v => v != null && typeof v === 'string'))]
    if (values.length > 1 && values.length <= 12) enums[key] = values
  }
  return enums
}
