/**
 * Companies Component
 * 
 * Renders business/company listings.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 * Company data is isolated by context - no cross-destination leakage.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class CompaniesComponent extends BaseComponent {
  #selectedCategory = null

  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['destination']
  }

  render() {
    this.validate()

    const destination = this.getDestination()
    const branding = this.getBranding()
    const theme = this.getTheme()
    const companies = this.#getCompanies()
    const categories = this.#getCategories()

    const companiesData = {
      component: 'companies',
      id: 'companies-section',
      content: {
        title: 'Empresas',
        subtitle: `Negocios en ${destination.name}`,
        empty: companies.length === 0,
        hasCompanyContext: this.viewModel.hasCompany()
      },
      filters: {
        categories: categories,
        selectedCategory: this.#selectedCategory
      },
      items: companies,
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
        label: `Business listings for ${destination.name}`,
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
      companyContext: this.viewModel.hasCompany() ? {
        slug: this.viewModel.company?.slug,
        name: this.viewModel.company?.name
      } : null,
      events: {
        onCompanyClick: { event: COMPONENT_EVENTS.NAVIGATE },
        onCategoryFilter: { event: COMPONENT_EVENTS.CHANGE }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'companies', data: companiesData })
    return companiesData
  }

  #getCompanies() {
    const destination = this.viewModel.destination
    const featured = destination?.featured
    
    if (!featured || !featured.companies) {
      return this.#getPlaceholderCompanies()
    }

    return featured.companies.map((company, index) => ({
      id: company.slug || `company-${index}`,
      slug: company.slug,
      name: company.name || 'Business Name',
      description: company.description || 'Business description',
      category: company.category || 'general',
      location: company.location || destination.name,
      logo: company.logo || '/assets/companies/default-logo.svg',
      featured: company.featured || false,
      contact: {
        email: company.contact?.email || '',
        phone: company.contact?.phone || '',
        website: company.contact?.website || ''
      }
    }))
  }

  #getPlaceholderCompanies() {
    return [
      {
        id: 'company-1',
        slug: 'albasie',
        name: 'Albasie',
        description: 'Operador turístico especializado en experiencias patrimoniales',
        category: 'tourism',
        location: 'Valdivia',
        logo: '/assets/companies/albasie/logo.svg',
        featured: true,
        contact: {
          email: 'info@albasie.cl',
          phone: '+56 9 1234 5678',
          website: 'https://albasie.cl'
        }
      },
      {
        id: 'company-2',
        slug: 'secnet',
        name: 'Secnet',
        description: 'Proveedor de servicios de telecomunicaciones y seguridad',
        category: 'services',
        location: 'Valdivia',
        logo: '/assets/companies/secnet/logo.svg',
        featured: false,
        contact: {
          email: 'info@secnet.cl',
          phone: '+56 9 8765 4321',
          website: ''
        }
      }
    ]
  }

  #getCategories() {
    const destination = this.viewModel.destination
    const categories = destination?.categories || {}
    
    return Object.entries(categories)
      .filter(([key, value]) => typeof value === 'object' && value !== null)
      .map(([key, category]) => ({
        id: key,
        name: category.name || key,
        color: category.color || '#888888'
      }))
  }

  filterByCategory(categoryId) {
    this.#selectedCategory = categoryId
    this.setState({ selectedCategory: categoryId })
    this.emit(COMPONENT_EVENTS.CHANGE, {
      field: 'categoryFilter',
      value: categoryId
    })
  }

  clearFilter() {
    this.#selectedCategory = null
    this.setState({ selectedCategory: null })
    this.emit(COMPONENT_EVENTS.CHANGE, {
      field: 'categoryFilter',
      value: null
    })
  }

  handleCompanyClick(company) {
    this.emit(COMPONENT_EVENTS.NAVIGATE, {
      target: `/empresas/${company.slug}`
    })
  }

  handleCategoryFilter(category) {
    if (this.#selectedCategory === category.id) {
      this.clearFilter()
    } else {
      this.filterByCategory(category.id)
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      selectedCategory: this.#selectedCategory
    }
  }
}

export default CompaniesComponent
