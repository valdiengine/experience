import { LABELS } from '../constants/labels.js'
import { LOCALE } from '../constants/config.js'

export const sanitize = (str) => {
  if (typeof str !== 'string') return String(str ?? '')
  const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }
  return str.replace(/[&<>"']/g, c => ENTITY_MAP[c])
}

export const formatValue = (val) => {
  if (val == null) return '—'
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  if (typeof val === 'number') return val.toLocaleString(LOCALE)
  if (val instanceof Date) return val.toLocaleDateString(LOCALE)
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 60)
  return String(val)
}

export const getType = (val) => {
  if (val == null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

export const getLabel = (key) => LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
