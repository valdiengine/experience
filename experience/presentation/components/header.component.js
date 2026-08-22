/**
 * Header Component
 * 
 * Renders navigation header with branding, navigation items, and CTA.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class HeaderComponent extends BaseComponent {
  #mobileMenuOpen = false

  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['navigation', 'branding']
  }

  render() {
    this.validate()

    const branding = this.getBranding()
    const destination = this.getDestination()
    const navigation = this.viewModel.getNavigation()
    const company = this.viewModel.company
    const theme = this.getTheme()
    const companyNav = this.#getCompanyNavigation()

    const header = {
      component: 'header',
      id: 'main-header',
      branding: {
        logo: branding.logo,
        brandName: company?.name || destination.name,
        colors: branding.colors
      },
      navigation: {
        items: this.#renderNavItems(companyNav?.items || navigation.header?.items || []),
        cta: {
          label: 'Contacto',
          action: 'scroll',
          target: '#contacto'
        }
      },
      theme: {
        mode: theme.mode,
        colors: branding.colors
      },
      accessibility: {
        role: 'banner',
        label: `Main navigation for ${destination.name}`
      },
      mobile: {
        enabled: true,
        menuOpen: this.#mobileMenuOpen,
        toggleAriaLabel: this.#mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
      },
      events: {
        onLogoClick: { event: COMPONENT_EVENTS.NAVIGATE, target: '/' },
        onNavItemClick: { event: COMPONENT_EVENTS.NAVIGATE },
        onCtaClick: { event: COMPONENT_EVENTS.CTA_CLICK, target: '#contacto' }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'header', data: header })
    return header
  }

  #renderNavItems(items) {
    return items.map(item => ({
      id: item.path || item.label?.toLowerCase().replace(/\s+/g, '-'),
      label: item.label,
      path: item.path,
      icon: item.icon || null,
      active: item.path === '/' ? true : false,
      ariaLabel: item.label
    }))
  }

  #getCompanyNavigation() {
    const company = this.viewModel.company
    if (company?.navigation?.header) {
      return company.navigation.header
    }
    return null
  }

  toggleMobileMenu() {
    this.#mobileMenuOpen = !this.#mobileMenuOpen
    this.setState({ mobileMenuOpen: this.#mobileMenuOpen })
    this.emit(COMPONENT_EVENTS.CHANGE, { 
      field: 'mobileMenu', 
      value: this.#mobileMenuOpen 
    })
  }

  handleNavClick(item) {
    this.emit(COMPONENT_EVENTS.NAVIGATE, {
      path: item.path,
      label: item.label
    })
  }

  handleCtaClick() {
    this.emit(COMPONENT_EVENTS.CTA_CLICK, {
      target: '/contacto'
    })
  }

  toJSON() {
    return {
      ...super.toJSON(),
      mobileMenuOpen: this.#mobileMenuOpen
    }
  }
}

export default HeaderComponent
