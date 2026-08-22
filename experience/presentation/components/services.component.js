/**
 * Services Component
 * 
 * Renders services/categories listing.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class ServicesComponent extends BaseComponent {
  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['destination']
  }

  render() {
    this.validate()

    const destination = this.getDestination()
    const branding = this.getBranding()
    const theme = this.getTheme()
    const categories = this.#getCategories()

    const services = {
      component: 'services',
      id: 'services-section',
      content: {
        title: 'Servicios',
        subtitle: `Explora los servicios disponibles en ${destination.name}`,
        link: {
          label: 'Ver todos',
          path: '/servicios'
        }
      },
      items: categories,
      theme: {
        mode: theme.mode,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        colors: branding.colors
      },
      branding: {
        colors: branding.colors
      },
      accessibility: {
        role: 'region',
        label: `Services available in ${destination.name}`,
        itemType: 'listitem'
      },
      layout: {
        columns: {
          mobile: 1,
          tablet: 2,
          desktop: 3
        },
        gap: theme.spacing
      },
      events: {
        onServiceClick: { event: COMPONENT_EVENTS.SERVICE_SELECTED },
        onViewAllClick: { event: COMPONENT_EVENTS.NAVIGATE, target: '/servicios' }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'services', data: services })
    return services
  }

  #getCategories() {
    const destination = this.viewModel.destination
    const categories = destination?.categories || {}
    
    return Object.entries(categories)
      .filter(([key, value]) => typeof value === 'object' && value !== null)
      .map(([key, category]) => ({
        id: key,
        name: category.name || key,
        icon: category.icon || 'folder',
        color: category.color || '#888888',
        description: category.description || `Explore ${category.name} services`,
        path: `/servicios/${key}`,
        count: 0
      }))
      .slice(0, 6)
  }

  handleServiceClick(service) {
    this.emit(COMPONENT_EVENTS.SERVICE_SELECTED, {
      serviceId: service.id,
      serviceName: service.name,
      path: service.path
    })
  }

  handleViewAllClick() {
    this.emit(COMPONENT_EVENTS.NAVIGATE, {
      target: '/servicios'
    })
  }
}

export default ServicesComponent
