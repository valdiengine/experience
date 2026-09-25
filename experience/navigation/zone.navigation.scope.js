/**
 * ZoneNavigation Engine-Generated Scope
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * The Zone Navigation scope is ALWAYS derived server-side from the
 * ApplicationIdentity (applicationId = `${domain}${route}`) plus the
 * ZoneNavigation scopeId found in authoritative route configuration.
 * A browser-supplied scope is never accepted.
 *
 * Produces:
 * - scope: opaque engine scope identifier (`<applicationId>::<scopeId>`)
 * - cssScope: CSS-class-safe namespacing prefix per application (no two
 *   Applications can produce the same cssScope for the same DOM page)
 *
 * DOM ids for tabs/panels are derived from cssScope by presentation code so
 * that a single page can never host colliding ids between Applications.
 *
 * Framework-free implementation.
 */

const SCOPE_SEGMENT_REPLACE_REGEX = /[^a-z0-9-]+/g
const SCOPE_SEGMENT_COLLAPSE_REGEX = /-+/g

export function sanitizeScopeSegment(input) {
  const lower = String(input ?? '').toLowerCase()
  let segment = lower.replace(SCOPE_SEGMENT_REPLACE_REGEX, '-')
  segment = segment.replace(SCOPE_SEGMENT_COLLAPSE_REGEX, '-').replace(/^-+|-+$/g, '')
  return segment || 'app'
}

export function generateZoneNavigationScope(applicationId, scopeId) {
  if (typeof applicationId !== 'string' || !applicationId.trim()) {
    throw new Error('generateZoneNavigationScope requires a non-empty applicationId')
  }
  if (typeof scopeId !== 'string' || !scopeId.trim()) {
    throw new Error('generateZoneNavigationScope requires a non-empty scopeId')
  }

  const appSegment = sanitizeScopeSegment(applicationId)
  const scopeSegment = sanitizeScopeSegment(scopeId)

  return Object.freeze({
    applicationId,
    scopeId,
    scope: `${applicationId}::${scopeId}`,
    cssScope: `zn-${appSegment}-${scopeSegment}`
  })
}

export default {
  sanitizeScopeSegment,
  generateZoneNavigationScope
}