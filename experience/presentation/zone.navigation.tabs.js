/**
 * ZoneNavigation Tabs Presentation Strategy
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Presentation concerns only. Consumes validated ZoneNavigation CONTENT and an
 * engine-generated scope and produces a plain "tabs" presentation descriptor.
 *
 * Contract guarantees:
 * - Content items are never mutated; the exact same content can be presented
 *   by a future layout (grid, radial, lotus, freeform, columns) unchanged.
 * - Layout selection, ids, and active state live here in presentation, never
 *   in content.
 * - No role="tab" / ARIA is forced into content; a11y roles are applied at
 *   runtime progressive enhancement (and reflected in SSR ids/relationships).
 *
 * Framework-free implementation.
 */

import { ZONE_NAVIGATION_LAYOUTS } from '../navigation/zone.navigation.js'

export const ZONE_TABS_EVENTS = Object.freeze({
  SELECT: 'zone:tabs:select',
  KEYBOARD: 'zone:tabs:keyboard'
})

export function presentZoneNavigationTabs({
  content,
  scope = {},
  activeKey = null
} = {}) {
  const items = Array.isArray(content?.items) ? content.items : []
  if (items.length === 0) {
    return null
  }

  const cssScope = typeof scope.cssScope === 'string' && scope.cssScope
    ? scope.cssScope
    : 'zone-nav'

  const keys = items.map(item => item.key)
  const resolvedActive = typeof activeKey === 'string' && keys.includes(activeKey)
    ? activeKey
    : keys[0]

  const presentedItems = items.map(item => Object.freeze({
    key: item.key,
    label: item.label,
    component: item.component,
    contentRef: item.contentRef,
    active: item.key === resolvedActive,
    tabId: `${cssScope}-tab-${item.key}`,
    panelId: `${cssScope}-panel-${item.key}`
  }))

  return Object.freeze({
    layout: ZONE_NAVIGATION_LAYOUTS[0],
    scope: Object.freeze({
      applicationId: scope.applicationId || null,
      scopeId: scope.scopeId || content.scopeId || null,
      scope: scope.scope || null,
      cssScope
    }),
    activeKey: resolvedActive,
    items: Object.freeze(presentedItems)
  })
}

export default {
  presentZoneNavigationTabs,
  ZONE_TABS_EVENTS
}