/**
 * ZonePresentation — Application-Scoped Visual Identity Contract
 *
 * APP-ZONE-PRESENT-1  Level-2 visual identity.
 *
 * ZonePresentation is the FIRST Level-2 capability: an OPTIONAL, declarative,
 * Application-scoped visual identity for Experience-owned Zone Applications.
 * It is NOT a layout, NOT a navigation strategy, and NOT arbitrary CSS.
 * Zone Navigation (layout: "tabs") and Zone Content contracts are unchanged.
 *
 * Contract shape (declarative only):
 *   zonePresentation: {
 *     version: "1",
 *     variant: "nature",                 // Engine-owned enum (optional)
 *     tokens: { primary: "#3a7d66", ...  // allowlisted token overrides (optional)
 *   }
 *
 * Separation rules (fail-closed, same philosophy as ZoneNavigation/ZoneContent):
 * - Scope authority is the ENGINE. The Application-scoped cssScope is derived
 *   EXCLUSIVELY from generateZoneNavigationScope(applicationId, scopeId) from
 *   the Paired ZoneNavigation. The config can never declare scope, scopeId,
 *   applicationId, domain, or any CSS/layout/behavior vocabulary.
 * - variant is an Engine-owned enum. Variants map to Engine-owned default
 *   token sets (no CSS travels inside the config). Unknown variants reject.
 * - tokens is a depth-1 allowlist of semantic color tokens matching the EXACT
 *   CSS custom properties the Level-1 engine styles already consume
 *   (--color-*). Values must be plain CSS colors (#rgb/#rrggbb/#rrggbbaa,
 *   rgb(), rgba(), hsl(), hsla()). Unknown tokens reject.
 * - ANY unknown or forbidden key rejects the WHOLE block (never silent
 *   stripping). An invalid declared block makes the Application fall back to
 *   the certified Level-1 baseline — a declaration can never break the page.
 * - version must equal the sole supported version "1".
 * - variant and/or tokens must be present: a bare { version: "1" } carries no
 *   visual direction and is rejected.
 * - Input is never mutated; the validated presentation is deep-frozen.
 *
 * Emission (Engine-generated, gated on presence):
 *   [data-application-scope="<cssScope>"] { --color-<token>: <value>; ... }
 * emitted after the Level-1 component styles, plus an optional
 * data-application-scope attribute on <body> only when resolved. No :root
 * mutation; no new CSS vocabulary.
 *
 * Framework-free implementation.
 */

export const ZONE_PRESENTATION_VERSION = '1'

export const ZONE_PRESENTATION_RESERVED_KEYS = Object.freeze(['version', 'variant', 'tokens'])

export const ZONE_PRESENTATION_VARIANTS = Object.freeze(['nature'])

export const ZONE_PRESENTATION_TOKEN_KEYS = Object.freeze([
  'primary',
  'secondary',
  'accent',
  'surface',
  'background',
  'text',
  'textMuted',
  'border'
])

/**
 * Fields the config must NEVER carry: scope/placement authority belongs to the
 * Engine navigation scope; styling/layout/behavior belongs to the engine, not
 * the declarative identity config.
 */
export const ZONE_PRESENTATION_FORBIDDEN_FIELDS = Object.freeze([
  'scope',
  'scopeId',
  'applicationId',
  'domain',
  'class',
  'className',
  'selector',
  'css',
  'cssFile',
  'path',
  'url',
  'style',
  'html',
  'rawHtml',
  'htmlContent',
  'innerHTML',
  'dangerouslySetInnerHTML',
  'image',
  'icon',
  'font',
  'background',
  'backgroundImage',
  'layout',
  'geometry',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'spacing',
  'position',
  'responsive',
  'animation',
  'behavior',
  'script'
])

export const ZONE_PRESENTATION_VARIANT_TOKENS = Object.freeze({
  nature: Object.freeze({
    primary: '#3a7d66',
    secondary: '#1f3530',
    accent: '#e8d5a3'
  })
})

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

const NUMERIC_CHANNEL_RE = /^\d{1,3}(\.\d+)?%?$/
const ALPHA_RE = /^(?:0|1|0?\.\d+)$/

function isNumericChannel(channel, { max = 255, allowPercent = true } = {}) {
  if (!NUMERIC_CHANNEL_RE.test(channel)) return false
  let value
  if (channel.endsWith('%')) {
    if (!allowPercent) return false
    value = parseFloat(channel.slice(0, -1))
  } else {
    value = parseFloat(channel)
  }
  return value >= 0 && value <= max
}

function isAlphaComponent(channel) {
  return ALPHA_RE.test(channel) && parseFloat(channel) >= 0 && parseFloat(channel) <= 1
}

function isFunctionColor(value) {
  const match = /^(rgb|rgba|hsl|hsla)\(\s*(.*?)\s*\)$/i.exec(value)
  if (!match) return false
  const name = match[1].toLowerCase()
  const inner = match[2]
  if (!inner || /[;{}<>]/.test(inner)) return false
  const parts = inner.split(',').map(part => part.trim())
  const hasAlpha = parts.length === 4
  if (parts.length !== 3 && parts.length !== 4) return false
  if ((name === 'rgb' || name === 'hsl') && hasAlpha) return false
  if ((name === 'rgba' || name === 'hsla') && !hasAlpha) return false
  if (hasAlpha && !isAlphaComponent(parts[3])) return false
  if (name === 'rgb' || name === 'rgba') {
    return parts.slice(0, 3).every(channel => isNumericChannel(channel, { max: 255, allowPercent: true }))
  }
  if (!isNumericChannel(parts[0], { max: 360, allowPercent: false })) return false
  return parts.slice(1, 3).every(channel => isNumericChannel(channel, { max: 100, allowPercent: true }))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCSSColor(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  if (HEX_COLOR_RE.test(value)) return true
  return isFunctionColor(value)
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

/**
 * Validates an arbitrary ZonePresentation config.
 * Returns { valid, errors, presentation? }. When valid, `presentation` is the
 * normalized, deep-frozen { version, variant, tokens } where `tokens` is the
 * EFFECTIVE token set (Engine variant defaults merged with config overrides).
 */
export function validateZonePresentationConfig(config) {
  const errors = []

  if (!isPlainObject(config)) {
    return {
      valid: false,
      errors: Object.freeze(['zonePresentation config must be an object']),
      presentation: null
    }
  }

  for (const key of Object.keys(config)) {
    if (ZONE_PRESENTATION_FORBIDDEN_FIELDS.includes(key)) {
      errors.push(
        `Forbidden zonePresentation key "${key}" (scope/placement/styling/behavior ` +
          `authority never comes from the config)`
      )
    } else if (!ZONE_PRESENTATION_RESERVED_KEYS.includes(key)) {
      errors.push(`Unknown zonePresentation key "${key}" (fail-closed: no arbitrary fields)`)
    }
  }

  if (!Object.prototype.hasOwnProperty.call(config, 'version')) {
    errors.push('version is required at zonePresentation')
  } else if (config.version !== ZONE_PRESENTATION_VERSION) {
    errors.push(
      `zonePresentation version "${config.version}" is not supported (only "${ZONE_PRESENTATION_VERSION}")`
    )
  }

  let variant = null
  if (config.variant !== undefined && config.variant !== null) {
    if (typeof config.variant !== 'string' || !ZONE_PRESENTATION_VARIANTS.includes(config.variant)) {
      errors.push(
        `zonePresentation variant "${config.variant}" is not a supported Engine variant ` +
          `(allowed: ${ZONE_PRESENTATION_VARIANTS.join(', ')})`
      )
    } else {
      variant = config.variant
    }
  }

  const overrides = {}
  if (config.tokens !== undefined && config.tokens !== null) {
    if (!isPlainObject(config.tokens)) {
      errors.push('zonePresentation tokens must be an object')
    } else {
      const tokenKeys = Object.keys(config.tokens)
      if (tokenKeys.length === 0) {
        errors.push('zonePresentation tokens must declare at least one token when provided')
      }
      for (const key of tokenKeys) {
        if (!ZONE_PRESENTATION_TOKEN_KEYS.includes(key)) {
          errors.push(
            `Unknown zonePresentation token "${key}" ` +
              `(allowed: ${ZONE_PRESENTATION_TOKEN_KEYS.join(', ')})`
          )
          continue
        }
        const value = config.tokens[key]
        if (!isCSSColor(value)) {
          errors.push(
            `zonePresentation token "${key}" must be a valid CSS color ` +
              `(#rgb/#rrggbb/#rrggbbaa, rgb(), rgba(), hsl(), hsla())`
          )
        } else {
          overrides[key] = value
        }
      }
    }
  }

  const hasVariant = variant !== null
  const hasTokens = Object.keys(overrides).length > 0
  if (!hasVariant && !hasTokens) {
    errors.push('zonePresentation must declare a variant and/or at least one token (no visual direction)')
  }

  if (errors.length > 0) {
    return { valid: false, errors: Object.freeze(errors), presentation: null }
  }

  const tokens = hasVariant
    ? Object.freeze({ ...ZONE_PRESENTATION_VARIANT_TOKENS[variant], ...overrides })
    : Object.freeze({ ...overrides })

  return {
    valid: true,
    errors: Object.freeze([]),
    presentation: deepFreeze({ version: ZONE_PRESENTATION_VERSION, variant, tokens })
  }
}

export default {
  validateZonePresentationConfig,
  ZONE_PRESENTATION_VERSION,
  ZONE_PRESENTATION_VARIANTS,
  ZONE_PRESENTATION_TOKEN_KEYS,
  ZONE_PRESENTATION_RESERVED_KEYS,
  ZONE_PRESENTATION_FORBIDDEN_FIELDS,
  ZONE_PRESENTATION_VARIANT_TOKENS
}