/**
 * ZoneContent Core Content Contract
 *
 * APP-ZONE-TABS-2 - Isla Teja visual integration
 *
 * Structured, destination-facing panel CONTENT for Zone Navigation items,
 * keyed by the exact same contentRef the ZoneNavigation content contract
 * uses (namespace:zone:section). Content is owned by the content layer;
 * Presentation never resolves or invents it.
 *
 * Content semantics (only):
 * - scopeId: engine-scoped zone content identifier (must equal the paired
 *   ZoneNavigation scopeId)
 * - items[]: ordered; exactly one entry per paired navigation contentRef
 *   - contentRef: structured content reference (e.g. "valdi:isla-teja:mapa")
 *   - component: registered zone component id (zone.intro / zone.list /
 *     zone.map) — must match the component declared by the navigation item
 *   - title: optional panel heading (defaults to the tab label at render)
 *   - lead: optional traveler-visible intro line
 *   - zone.intro  → paragraphs: string[] (required)
 *   - zone.list   → items: [{ name, description?, note? }] (required)
 *   - zone.map    → location + coordinates [lat, lng] + optional note
 *
 * Forbidden inside content (same philosophy as ZoneNavigation): placement /
 * visual fields (x, y, width, height, rotation, circle, star, triangle, css,
 * colors, styles, background, color, zIndex), raw HTML blobs, and class/style
 * injection. Coordinates ARE content data (not visual placement).
 *
 * Framework-free implementation.
 */

import { ZONE_NAVIGATION_COMPONENTS } from '../navigation/zone.navigation.js'

export const ZONE_CONTENT_COMPONENTS = Object.freeze([...ZONE_NAVIGATION_COMPONENTS])

export const ZONE_CONTENT_FORBIDDEN_FIELDS = Object.freeze([
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'circle',
  'star',
  'triangle',
  'css',
  'colors',
  'styles',
  'background',
  'color',
  'zIndex',
  'html',
  'rawHtml',
  'htmlContent',
  'innerHTML',
  'dangerouslySetInnerHTML',
  'className',
  'style'
])

const SCOPE_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/
const CONTENT_REF_REGEX = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/i

export class ZoneContentError extends Error {
  constructor(message, errors = []) {
    super(message)
    this.name = 'ZoneContentError'
    this.errors = Object.freeze([...errors])
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function containsRawHtml(value) {
  if (typeof value === 'string') {
    return value.includes('<')
  }
  if (Array.isArray(value)) {
    return value.some(containsRawHtml)
  }
  if (isPlainObject(value)) {
    return Object.values(value).some(containsRawHtml)
  }
  return false
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) {
      deepFreeze(value[key])
    }
  }
  return value
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isCoordinatePair(value) {
  if (!Array.isArray(value) || value.length !== 2) return false
  return value.every(n => typeof n === 'number' && Number.isFinite(n))
}

/**
 * APP-ZONE-TABS-2 (correction pass): recursively rejects forbidden
 * Presentation/style keys ANYWHERE inside the semantic ZoneContent shape —
 * including nested list entries and nested objects — instead of only at the
 * top level of a content item. Rejection (never silent stripping) keeps the
 * semantic-content / Presentation separation contract honest: visual fields
 * cannot be smuggled one level down and then silently discarded by
 * normalization.
 */
function pushForbiddenShapeErrors(errors, value, path) {
  if (!isPlainObject(value)) {
    return
  }
  for (const key of Object.keys(value)) {
    const childPath = path ? `${path}.${key}` : key
    if (ZONE_CONTENT_FORBIDDEN_FIELDS.includes(key)) {
      errors.push(`Forbidden presentation field "${key}" at ZoneContent ${childPath}`)
      continue
    }
    const child = value[key]
    if (isPlainObject(child)) {
      pushForbiddenShapeErrors(errors, child, childPath)
    } else if (Array.isArray(child)) {
      for (let index = 0; index < child.length; index++) {
        pushForbiddenShapeErrors(errors, child[index], `${childPath}[${index}]`)
      }
    }
  }
}

/**
 * Validates an arbitrary ZoneContent config object.
 * Returns { valid, errors, content? }. When valid, `content` is a normalized
 * plain object { scopeId, items } exposing only canonical content fields.
 */
export function validateZoneContentConfig(config) {
  const errors = []

  if (!isPlainObject(config)) {
    return {
      valid: false,
      errors: ['ZoneContent config must be an object'],
      content: null
    }
  }

  if (typeof config.scopeId !== 'string' || !config.scopeId.trim()) {
    errors.push('scopeId is required and must be a non-empty string')
  } else if (!SCOPE_ID_REGEX.test(config.scopeId)) {
    errors.push(`scopeId "${config.scopeId}" must be a lowercase slug (a-z, 0-9, -)`)
  }

  if (!Array.isArray(config.items) || config.items.length === 0) {
    errors.push('items is required and must be a non-empty array')
    return { valid: false, errors: Object.freeze(errors), content: null }
  }

  const normalizedItems = []
  const seen = new Set()

  for (let index = 0; index < config.items.length; index++) {
    const item = config.items[index]

    if (!isPlainObject(item)) {
      errors.push(`items[${index}] must be an object`)
      continue
    }

    pushForbiddenShapeErrors(errors, item, `items[${index}]`)

    for (const value of Object.values(item)) {
      if (containsRawHtml(value)) {
        errors.push(`items[${index}] contains raw HTML (not allowed in content)`)
        break
      }
    }

    if (typeof item.contentRef !== 'string' || !item.contentRef.trim()) {
      errors.push(`items[${index}].contentRef is required and must be a non-empty string`)
    } else if (!CONTENT_REF_REGEX.test(item.contentRef)) {
      errors.push(
        `items[${index}].contentRef "${item.contentRef}" must be structured as "namespace:zone:section"`
      )
    } else if (seen.has(item.contentRef)) {
      errors.push(`items[${index}].contentRef "${item.contentRef}" is duplicated (must be unique)`)
    } else {
      seen.add(item.contentRef)
    }

    if (typeof item.component !== 'string' || !item.component.trim()) {
      errors.push(`items[${index}].component is required and must be a non-empty string`)
    } else if (!ZONE_CONTENT_COMPONENTS.includes(item.component)) {
      errors.push(
        `items[${index}].component "${item.component}" is not a registered/resolvable zone component ` +
          `(allowed: ${ZONE_CONTENT_COMPONENTS.join(', ')})`
      )
    }

    if (item.title !== undefined && item.title !== null && !isNonEmptyString(item.title)) {
      errors.push(`items[${index}].title must be a non-empty string when provided`)
    }
    if (item.lead !== undefined && item.lead !== null && !isNonEmptyString(item.lead)) {
      errors.push(`items[${index}].lead must be a non-empty string when provided`)
    }

    const component = typeof item.component === 'string' ? item.component : null

    if (component === 'zone.intro') {
      if (!Array.isArray(item.paragraphs) || item.paragraphs.length === 0) {
        errors.push(`items[${index}].paragraphs is required and must be a non-empty array`)
      } else {
        for (let p = 0; p < item.paragraphs.length; p++) {
          if (!isNonEmptyString(item.paragraphs[p])) {
            errors.push(`items[${index}].paragraphs[${p}] must be a non-empty string`)
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(item, 'items')) {
        errors.push(`items[${index}] zone.intro content must not include a "items" list`)
      }
      if ('location' in item || 'coordinates' in item) {
        errors.push(`items[${index}] zone.intro content must not include map fields`)
      }
    }

    if (component === 'zone.list') {
      if (!Array.isArray(item.items) || item.items.length === 0) {
        errors.push(`items[${index}].items is required and must be a non-empty array`)
      } else {
        for (let li = 0; li < item.items.length; li++) {
          const entry = item.items[li]
          if (!isPlainObject(entry)) {
            errors.push(`items[${index}].items[${li}] must be an object`)
            continue
          }
          if (!isNonEmptyString(entry.name)) {
            errors.push(`items[${index}].items[${li}].name is required and must be a non-empty string`)
          }
          if (entry.description !== undefined && entry.description !== null && !isNonEmptyString(entry.description)) {
            errors.push(`items[${index}].items[${li}].description must be a non-empty string when provided`)
          }
          if (entry.note !== undefined && entry.note !== null && !isNonEmptyString(entry.note)) {
            errors.push(`items[${index}].items[${li}].note must be a non-empty string when provided`)
          }
        }
      }
      if ('location' in item || 'coordinates' in item) {
        errors.push(`items[${index}] zone.list content must not include map fields`)
      }
    }

    if (component === 'zone.map') {
      if (!isNonEmptyString(item.location)) {
        errors.push(`items[${index}].location is required and must be a non-empty string`)
      }
      if (!isCoordinatePair(item.coordinates)) {
        errors.push(`items[${index}].coordinates must be an array of two finite numbers [lat, lng]`)
      }
      if (item.note !== undefined && item.note !== null && !isNonEmptyString(item.note)) {
        errors.push(`items[${index}].note must be a non-empty string when provided`)
      }
      if (Object.prototype.hasOwnProperty.call(item, 'paragraphs') || Object.prototype.hasOwnProperty.call(item, 'items')) {
        errors.push(`items[${index}] zone.map content must not include intro/list fields`)
      }
    }

    const normalized = {
      contentRef: typeof item.contentRef === 'string' ? item.contentRef : null,
      component,
      title: item.title || null,
      lead: item.lead || null
    }

    if (component === 'zone.intro') {
      normalized.paragraphs = Array.isArray(item.paragraphs)
        ? item.paragraphs.filter(isNonEmptyString)
        : []
    }

    if (component === 'zone.list') {
      normalized.items = Array.isArray(item.items)
        ? item.items.filter(isPlainObject).map(entry => {
            const out = { name: entry.name || '' }
            if (isNonEmptyString(entry.description)) out.description = entry.description
            if (isNonEmptyString(entry.note)) out.note = entry.note
            return out
          })
        : []
    }

    if (component === 'zone.map') {
      normalized.location = typeof item.location === 'string' ? item.location : null
      normalized.coordinates = isCoordinatePair(item.coordinates) ? [...item.coordinates] : null
      if (isNonEmptyString(item.note)) normalized.note = item.note
    }

    normalizedItems.push(normalized)
  }

  if (errors.length > 0) {
    return { valid: false, errors: Object.freeze(errors), content: null }
  }

  return {
    valid: true,
    errors: Object.freeze([]),
    content: deepFreeze({
      scopeId: config.scopeId,
      items: normalizedItems
    })
  }
}

/**
 * Cross-validates ZoneContent against the paired ZoneNavigation so a route can
 * never ship content that is fragmented (missing panels, orphan sections, or
 * contradictory component kinds). Both `navigation` and `content` use the same
 * structured contentRefs.
 */
export function validateZoneContentPairing(navigation, content) {
  const errors = []

  if (!isPlainObject(navigation)) {
    return { valid: false, errors: ['ZoneNavigation pairing source is required'] }
  }
  if (!isPlainObject(content)) {
    return { valid: false, errors: ['ZoneContent pairing source is required'] }
  }
  if (!Array.isArray(navigation.items) || navigation.items.length === 0) {
    return { valid: false, errors: ['ZoneNavigation pairing items must be a non-empty array'] }
  }
  if (!Array.isArray(content.items) || content.items.length === 0) {
    return { valid: false, errors: ['ZoneContent pairing items must be a non-empty array'] }
  }
  if (navigation.scopeId && content.scopeId && navigation.scopeId !== content.scopeId) {
    errors.push(`ZoneContent scopeId "${content.scopeId}" does not match navigation scopeId "${navigation.scopeId}"`)
  }

  const navRefs = navigation.items.map(item => item.contentRef)
  const contentRefs = content.items.map(item => item.contentRef)

  if (new Set(navRefs).size !== navRefs.length) {
    errors.push('ZoneNavigation pairing contains duplicated contentRefs')
  }
  if (new Set(contentRefs).size !== contentRefs.length) {
    errors.push('ZoneContent pairing contains duplicated contentRefs')
  }

  const contentRefSet = new Set(contentRefs)
  for (const ref of navRefs) {
    if (!contentRefSet.has(ref)) {
      errors.push(`ZoneNavigation item "${ref}" has no paired ZoneContent`)
    }
  }

  const navRefSet = new Set(navRefs)
  for (const ref of contentRefs) {
    if (!navRefSet.has(ref)) {
      errors.push(`ZoneContent item "${ref}" has no paired ZoneNavigation item`)
    }
  }

  const navByRef = new Map(navigation.items.map(item => [item.contentRef, item]))
  const contentByRef = new Map(content.items.map(item => [item.contentRef, item]))
  for (const ref of navRefs) {
    const nav = navByRef.get(ref)
    const content = contentByRef.get(ref)
    if (nav && content && nav.component !== content.component) {
      errors.push(`ZoneNavigation item "${ref}" uses component "${nav.component}" but ` +
        `ZoneContent declares "${content.component}"`)
    }
  }

  return {
    valid: errors.length === 0,
    errors: Object.freeze(errors)
  }
}

export class ZoneContent {
  #scopeId
  #items

  constructor(config) {
    const validation = validateZoneContentConfig(config)
    if (!validation.valid || !validation.content) {
      const message = validation.errors.length > 0
        ? validation.errors[0]
        : 'Invalid ZoneContent config'
      throw new ZoneContentError(message, validation.errors)
    }
    this.#scopeId = validation.content.scopeId
    this.#items = validation.content.items
  }

  static create(config) {
    return new ZoneContent(config)
  }

  static validate(config) {
    return validateZoneContentConfig(config)
  }

  get scopeId() {
    return this.#scopeId
  }

  get items() {
    return this.#items.map(item => Object.freeze({ ...item }))
  }

  get size() {
    return this.#items.length
  }

  hasItem(contentRef) {
    return this.#items.some(item => item.contentRef === contentRef)
  }

  getItem(contentRef) {
    const found = this.#items.find(item => item.contentRef === contentRef)
    return found ? Object.freeze({ ...found }) : null
  }

  toJSON() {
    return {
      scopeId: this.#scopeId,
      items: Object.freeze(this.#items.map(item => Object.freeze({ ...item })))
    }
  }
}

export function createZoneContent(config) {
  return new ZoneContent(config)
}

export default {
  ZoneContent,
  ZoneContentError,
  createZoneContent,
  validateZoneContentConfig,
  validateZoneContentPairing,
  ZONE_CONTENT_COMPONENTS,
  ZONE_CONTENT_FORBIDDEN_FIELDS
}