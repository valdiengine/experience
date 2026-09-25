/**
 * Experience Zone Navigation
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Content contract + engine-generated scope for Zone Navigation.
 * Presentation strategies live under experience/presentation.
 */

export {
  ZoneNavigation,
  ZoneNavigationError,
  createZoneNavigation,
  validateZoneNavigationConfig,
  ZONE_NAVIGATION_LAYOUTS,
  ZONE_NAVIGATION_COMPONENTS,
  ZONE_NAVIGATION_FORBIDDEN_FIELDS
} from './zone.navigation.js'

export {
  sanitizeScopeSegment,
  generateZoneNavigationScope
} from './zone.navigation.scope.js'

export default {
  ZoneNavigation,
  createZoneNavigation,
  validateZoneNavigationConfig,
  generateZoneNavigationScope,
  ZONE_NAVIGATION_LAYOUTS,
  ZONE_NAVIGATION_COMPONENTS,
  ZONE_NAVIGATION_FORBIDDEN_FIELDS
}