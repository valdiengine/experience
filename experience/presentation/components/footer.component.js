/**
 * Footer Component
 * 
 * Renders footer with branding, navigation, contact, and legal links.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class FooterComponent extends BaseComponent {
  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['navigation', 'destination']
  }

  render() {
    this.validate()

    const destination = this.getDestination()
    const branding = this.getBranding()
    const navigation = this.viewModel.getNavigation()
    const companyNav = this.#getCompanyNavigation()
    const contact = this.#getContact()
    const theme = this.getTheme()
    const company = this.viewModel.company

    const footer = {
      component: 'footer',
      id: 'main-footer',
      content: {
        branding: {
          logo: branding.logo,
          brandName: company?.name || destination.name,
          description: company?.description || `${destination.name} - Plataforma de gestión turística`
        },
        navigation: {
          columns: this.#buildNavColumns(companyNav || navigation.footer)
        },
        contact: {
          email: contact.email,
          phone: contact.phone,
          address: contact.address
        },
        social: contact.social || []
      },
      links: {
        legal: [
          { id: 'privacy', label: 'Política de Privacidad', path: '/privacidad' },
          { id: 'terms', label: 'Términos de Servicio', path: '/terminos' },
          { id: 'cookies', label: 'Política de Cookies', path: '/cookies' }
        ]
      },
      copyright: {
        text: `© ${new Date().getFullYear()} ${company?.name || destination.name}. Todos los derechos reservados.`,
        year: new Date().getFullYear()
      },
      theme: {
        mode: theme.mode,
        spacing: theme.spacing,
        colors: {
          ...branding.colors,
          background: branding.colors.secondary || '#1a1a2e',
          text: '#ffffff'
        }
      },
      branding: {
        colors: branding.colors
      },
      accessibility: {
        role: 'contentinfo',
        label: `Footer for ${destination.name}`
      },
      events: {
        onLinkClick: { event: COMPONENT_EVENTS.NAVIGATE }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'footer', data: footer })
    return footer
  }

  #getContact() {
    const destination = this.viewModel.destination
    const contact = destination?.contact || {}
    
    return {
      email: contact.email || 'contacto@valdi.app',
      phone: contact.phone || '+56 9 1234 5678',
      address: contact.address ? 
        `${contact.address.city || ''}, ${contact.address.region || ''}, ${contact.address.country || 'Chile'}` :
        'Valdivia, Los Ríos, Chile',
      social: contact.social || []
    }
  }

  #buildNavColumns(footerNav) {
    if (!footerNav || !footerNav.columns) {
      return this.#getDefaultNavColumns()
    }

    return footerNav.columns.map(col => ({
      id: col.id || col.title?.toLowerCase().replace(/\s+/g, '-'),
      title: col.title,
      items: (col.items || []).map(item => ({
        id: item.path || item.label?.toLowerCase().replace(/\s+/g, '-'),
        label: item.label,
        path: item.path
      }))
    }))
  }

  #getCompanyNavigation() {
    const company = this.viewModel.company
    if (company?.navigation?.footer) {
      return company.navigation.footer
    }
    return null
  }

  #getDefaultNavColumns() {
    return [
      {
        id: 'explorar',
        title: 'Explorar',
        items: [
          { id: 'servicios', label: 'Servicios', path: '/servicios' },
          { id: 'empresas', label: 'Empresas', path: '/empresas' },
          { id: 'galeria', label: 'Galería', path: '/galeria' }
        ]
      },
      {
        id: 'nosotros',
        title: 'Nosotros',
        items: [
          { id: 'historia', label: 'Historia', path: '/nosotros' },
          { id: 'equipo', label: 'Equipo', path: '/nosotros/equipo' },
          { id: 'contacto', label: 'Contacto', path: '/contacto' }
        ]
      },
      {
        id: 'legal',
        title: 'Legal',
        items: [
          { id: 'privacidad', label: 'Privacidad', path: '/privacidad' },
          { id: 'terminos', label: 'Términos', path: '/terminos' },
          { id: 'cookies', label: 'Cookies', path: '/cookies' }
        ]
      }
    ]
  }

  handleLinkClick(link) {
    this.emit(COMPONENT_EVENTS.NAVIGATE, {
      target: link.path,
      label: link.label
    })
  }
}

export default FooterComponent
