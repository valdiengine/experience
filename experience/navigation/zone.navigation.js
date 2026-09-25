/**
 * ZoneNavigation Core Content Contract
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Content contract for Zone Navigation. Content is destination/zone-facing
 * navigation data and is strictly independent of any presentation strategy:
 * changing the presentation layout (tabs today, grid/radial/lotus in the
 * future) MUST NOT mutate the content items or their contentRefs.
 *
 * Content semantics (only):
 * - scopeId: engine-scoped zone navigation identifier (lowercase slug)
 * - items[]: ordered, non-empty
 *   - key: unique item identifier (lowercase slug)
 *   - label: traveler-visible text
 *   - component: registered zone component id (zone.intro / zone.list / zone.map)
 *   - contentRef: structured content reference (e.g. "valdi:corral:gastronomia")
 *
 * Forbidden inside content:
 * - placement/visual fields (x, y, width, height, rotation, circle, star,
 *   triangle, css, colors, styles, background, color, zIndex)
 * - raw HTML blobs
 * - forced role="tab" (roles/a11y belong to presentation enhancement only)
 *
 * Framework-free implementation.
 */

export const ZONE_NAVIGATION_LAYOUTS = Object.freeze(['tabs'])

/**
 * Registered zone component vocabulary. These ids are registered in the
 * ComponentRegistry and are the ONLY resolvable components a content item may
 * reference. Keeping the vocabulary here keeps the content contract self
 * contained (no core->presentation import) while still enforcing that an
 * item.component is registered/resolvable.
 */
export const ZONE_NAVIGATION_COMPONENTS = Object.freeze([
  'zone.intro',
  'zone.list',
  'zone.map'
])

export const ZONE_NAVIGATION_FORBIDDEN_FIELDS = Object.freeze([
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
  'dangerouslySetInnerHTML'
])

const SCOPE_ID_REGEX = /^[a-z0-9][a-z0-9-]*$/
const ITEM_KEY_REGEX = /^[a-z0-9][a-z0-9-]*$/
const CONTENT_REF_REGEX = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/i

export class ZoneNavigationError extends Error {
  constructor(message, errors = []) {
    super(message)
    this.name = 'ZoneNavigationError'
    this.errors = Object.freeze([...errors])
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function containsRawHtml(value) {
  return typeof value === 'string' && value.includes('<')
}

/**
 * Validates an arbitrary ZoneNavigation config object.
 * Returns { valid, errors, navigation? }. When valid, `navigation` is a
 * normalized plain object { scopeId, items } with only the canonical content
 * fields exposed.
 */
export function validateZoneNavigationConfig(config) {
  const errors = []

  if (!isPlainObject(config)) {
    return {
      valid: false,
      errors: ['ZoneNavigation config must be an object'],
      navigation: null
    }
  }

  if (typeof config.scopeId !== 'string' || !config.scopeId.trim()) {
    errors.push('scopeId is required and must be a non-empty string')
  } else if (!SCOPE_ID_REGEX.test(config.scopeId)) {
    errors.push(`scopeId "${config.scopeId}" must be a lowercase slug (a-z, 0-9, -)`)
  }

  if (!Array.isArray(config.items) || config.items.length === 0) {
    errors.push('items is required and must be a non-empty array')
    return { valid: false, errors: Object.freeze(errors), navigation: null }
  }

  const normalizedItems = []
  const seen = new Set()

  for (let index = 0; index < config.items.length; index++) {
    const item = config.items[index]

    if (!isPlainObject(item)) {
      errors.push(`items[${index}] must be an object`)
      continue
    }

    for (const field of ZONE_NAVIGATION_FORBIDDEN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        errors.push(`items[${index}] contains forbidden presentation field "${field}"`)
      }
    }

    for (const value of Object.values(item)) {
      if (containsRawHtml(value)) {
        errors.push(`items[${index}] contains raw HTML (not allowed in content)`)
        break
      }
    }

    const { key, label, component, contentRef } = item

    if (typeof key !== 'string' || !key.trim()) {
      errors.push(`items[${index}].key is required and must be a non-empty string`)
    } else if (!ITEM_KEY_REGEX.test(key)) {
      errors.push(`items[${index}].key "${key}" must be a lowercase slug (a-z, 0-9, -)`)
    } else if (seen.has(key)) {
      errors.push(`items[${index}].key "${key}" is duplicated (keys must be unique)`)
    } else {
      seen.add(key)
    }

    if (typeof label !== 'string' || !label.trim()) {
      errors.push(`items[${index}].label is required and must be a non-empty string`)
    }

    if (typeof component !== 'string' || !component.trim()) {
      errors.push(`items[${index}].component is required and must be a non-empty string`)
    } else if (!ZONE_NAVIGATION_COMPONENTS.includes(component)) {
      errors.push(
        `items[${index}].component "${component}" is not a registered/resolvable zone component ` +
          `(allowed: ${ZONE_NAVIGATION_COMPONENTS.join(', ')})`
      )
    }

    if (typeof contentRef !== 'string' || !contentRef.trim()) {
      errors.push(`items[${index}].contentRef is required and must be a non-empty string`)
    } else if (!CONTENT_REF_REGEX.test(contentRef)) {
      errors.push(
        `items[${index}].contentRef "${contentRef}" must be structured as "namespace:zone:section"`
      )
    }

    normalizedItems.push({
      key,
      label,
      component,
      contentRef
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors: Object.freeze(errors), navigation: null }
  }

  return {
    valid: true,
    errors: Object.freeze([]),
    navigation: {
      scopeId: config.scopeId,
      items: Object.freeze(normalizedItems.map(item => Object.freeze({ ...item })))
    }
  }
}

export class ZoneNavigation {
  #scopeId
  #items

  constructor(config) {
    const validation = validateZoneNavigationConfig(config)
    if (!validation.valid || !validation.navigation) {
      const message = validation.errors.length > 0
        ? validation.errors[0]
        : 'Invalid ZoneNavigation config'
      throw new ZoneNavigationError(message, validation.errors)
    }
    this.#scopeId = validation.navigation.scopeId
    this.#items = validation.navigation.items
  }

  static create(config) {
    return new ZoneNavigation(config)
  }

  static validate(config) {
    return validateZoneNavigationConfig(config)
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

  hasItem(key) {
    return this.#items.some(item => item.key === key)
  }

  getItem(key) {
    const found = this.#items.find(item => item.key === key)
    return found ? Object.freeze({ ...found }) : null
  }

  toJSON() {
    return {
      scopeId: this.#scopeId,
      items: Object.freeze(this.#items.map(item => Object.freeze({ ...item })))
    }
  }
}

export function createZoneNavigation(config) {
  return new ZoneNavigation(config)
}

export default {
  ZoneNavigation,
  ZoneNavigationError,
  createZoneNavigation,
  validateZoneNavigationConfig,
  ZONE_NAVIGATION_LAYOUTS,
  ZONE_NAVIGATION_COMPONENTS,
  ZONE_NAVIGATION_FORBIDDEN_FIELDS
}