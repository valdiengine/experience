/**
 * Hero Component
 * 
 * Renders hero section with title, description, background, and CTA.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class HeroComponent extends BaseComponent {
  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['destination', 'experience']
  }

  render() {
    this.validate()

    const destination = this.getDestination()
    const branding = this.getBranding()
    const theme = this.getTheme()
    const seo = this.viewModel.getSEO()
    const company = this.viewModel.company
    const heroConfig = this.#getHeroConfiguration()

    const hero = {
      component: 'hero',
      id: 'hero-section',
      content: {
        title: heroConfig.title || this.#resolveTitle(),
        subtitle: heroConfig.subtitle || destination.name,
        description: heroConfig.description || this.#getDescription(),
        background: {
          type: 'gradient',
          gradient: `linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%)`
        },
        overlay: {
          opacity: 0.7,
          color: branding.colors.secondary
        }
      },
      branding: {
        logo: branding.logo,
        colors: branding.colors
      },
      cta: {
        primary: heroConfig.cta?.primary || {
          label: 'Cotizar',
          action: 'scroll',
          target: '#cotizar',
          style: 'primary'
        },
        secondary: heroConfig.cta?.secondary || {
          label: 'Ver Modelos',
          action: 'scroll',
          target: '#modelos',
          style: 'secondary'
        }
      },
      theme: {
        mode: theme.mode,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius
      },
      metadata: {
        destination: destination.slug,
        experience: this.viewModel.experienceType,
        company: company?.name
      },
      accessibility: {
        role: 'region',
        label: `Welcome to ${destination.name}`,
        headingLevel: 1
      },
      responsive: {
        mobile: { titleScale: 0.7, showDescription: true },
        tablet: { titleScale: 0.85, showDescription: true },
        desktop: { titleScale: 1, showDescription: true }
      },
      events: {
        onPrimaryCtaClick: { event: COMPONENT_EVENTS.CTA_CLICK, action: heroConfig.cta?.primary?.action || 'scroll' },
        onSecondaryCtaClick: { event: COMPONENT_EVENTS.CTA_CLICK, action: heroConfig.cta?.secondary?.action || 'scroll' }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'hero', data: hero })
    return hero
  }

  #resolveTitle() {
    const seo = this.viewModel.getSEO()
    const destination = this.getDestination()
    
    let title = seo?.titleTemplate || seo?.title || destination.name
    
    if (title.includes('{name}')) {
      title = title.replace('{name}', destination.name)
    }
    
    return title
  }

  #getHeroConfiguration() {
    const company = this.viewModel.company
    if (company?.hero) {
      return company.hero
    }
    return {}
  }

  #getDescription() {
    const seo = this.viewModel.getSEO()
    return seo?.descriptionTemplate || seo?.description || ''
  }

  handlePrimaryCtaClick() {
    const company = this.viewModel.company
    const heroConfig = this.#getHeroConfiguration()
    const primaryCta = heroConfig.cta?.primary || {}
    this.emit(COMPONENT_EVENTS.CTA_CLICK, {
      action: primaryCta.action || 'scroll',
      target: primaryCta.target || '#cotizar'
    })
  }

  handleSecondaryCtaClick() {
    const company = this.viewModel.company
    const heroConfig = this.#getHeroConfiguration()
    const secondaryCta = heroConfig.cta?.secondary || {}
    this.emit(COMPONENT_EVENTS.CTA_CLICK, {
      action: secondaryCta.action || 'scroll',
      target: secondaryCta.target || '#modelos'
    })
  }
}

export default HeroComponent
