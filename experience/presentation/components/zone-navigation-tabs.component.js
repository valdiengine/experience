/**
 * ZoneNavigation Tabs Component
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Registered, resolvable presentation component for the "tabs" layout.
 * Consumes the tabs presentation descriptor already produced by the
 * presentation pipeline (adapter -> presentZoneNavigationTabs) and exposes a
 * framework-agnostic render structure with a11y/keyboard wiring events.
 *
 * Framework-free implementation.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'
import { ZONE_TABS_EVENTS } from '../zone.navigation.tabs.js'

export class ZoneNavigationTabsComponent extends BaseComponent {
  static get requiredViewModelProps() {
    return ['zoneNavigation']
  }

  render() {
    this.validate()

    const zoneNav = this.viewModel.zoneNavigation
    if (!zoneNav || zoneNav.layout !== 'tabs' || !Array.isArray(zoneNav.items) || zoneNav.items.length === 0) {
      return null
    }

    return Object.freeze({
      component: this.componentId,
      layout: zoneNav.layout,
      scope: zoneNav.scope ? Object.freeze({ ...zoneNav.scope }) : null,
      activeKey: zoneNav.activeKey || null,
      items: Object.freeze((zoneNav.items || []).map(item => Object.freeze({ ...item }))),
      events: Object.freeze({
        select: ZONE_TABS_EVENTS.SELECT,
        keyboard: ZONE_TABS_EVENTS.KEYBOARD,
        navigate: COMPONENT_EVENTS.NAVIGATE,
        focus: COMPONENT_EVENTS.FOCUS
      })
    })
  }
}

export default ZoneNavigationTabsComponent