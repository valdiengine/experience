/**
 * Experience Renderer
 * 
 * Core rendering abstraction for Experience View Model.
 * Framework-agnostic core that orchestrates component rendering.
 */

import { ComponentResolver } from './component.resolver.js'

export class PresentationRenderError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'PresentationRenderError'
    this.context = context
  }
}

export class Renderer {
  #resolver = null
  #viewModel = null
  #rendered = null

  constructor(resolver = null) {
    this.#resolver = resolver || new ComponentResolver()
  }

  setResolver(resolver) {
    if (!(resolver instanceof ComponentResolver)) {
      throw new PresentationRenderError('Resolver must be a ComponentResolver instance')
    }
    this.#resolver = resolver
    return this
  }

  setViewModel(viewModel) {
    this.#viewModel = viewModel
    this.#resolver.setViewModel(viewModel)
    return this
  }

  render() {
    if (!this.#viewModel) {
      throw new PresentationRenderError('ViewModel is required')
    }

    const resolved = this.#resolver.resolve()

    this.#rendered = {
      meta: this.#renderMeta(),
      sections: this.#renderSections(resolved.sections),
      modules: this.#renderModules(resolved.modules),
      branding: this.#renderBranding(),
      navigation: this.#renderNavigation(),
      seo: this.#renderSEO(),
      contact: this.#renderContact()
    }

    return this.#rendered
  }

  #renderMeta() {
    return {
      destination: this.#viewModel.destinationSlug,
      destinationName: this.#viewModel.destinationName,
      experience: this.#viewModel.experienceId,
      experienceType: this.#viewModel.experienceType,
      language: this.#viewModel.language,
      locale: this.#viewModel.locale,
      domain: this.#viewModel.domain,
      isResolved: this.#viewModel.isResolved(),
      hasCompany: this.#viewModel.hasCompany()
    }
  }

  #renderSections(sections) {
    return sections.map(section => ({
      id: section.id,
      name: section.name,
      type: section.type,
      rendered: true
    }))
  }

  #renderModules(modules) {
    return modules.map(module => ({
      id: module.id,
      name: module.name,
      type: module.type,
      rendered: true
    }))
  }

  #renderBranding() {
    const colors = this.#viewModel.getBrandingColors()
    return {
      logo: this.#viewModel.getBrandingLogo(),
      colors,
      fonts: this.#viewModel.branding?.fonts || {
        display: 'Inter',
        body: 'Inter'
      }
    }
  }

  #renderNavigation() {
    const navigation = this.#viewModel.getNavigation()
    return {
      header: navigation?.header || { items: [] },
      footer: navigation?.footer || { columns: [] }
    }
  }

  #renderSEO() {
    return {
      title: this.#viewModel.resolveTitle(),
      ...this.#viewModel.getSEO()
    }
  }

  #renderContact() {
    return this.#viewModel.getContact()
  }

  getRendered() {
    return this.#rendered
  }

  getMeta() {
    return this.#rendered?.meta || null
  }

  getSections() {
    return this.#rendered?.sections || []
  }

  getModules() {
    return this.#rendered?.modules || []
  }

  getBranding() {
    return this.#rendered?.branding || null
  }

  getNavigation() {
    return this.#rendered?.navigation || null
  }

  getSEO() {
    return this.#rendered?.seo || null
  }

  getContact() {
    return this.#rendered?.contact || null
  }
}

export class ExperienceRendererFactory {
  static create(registry = null, viewModel = null) {
    const componentRegistry = registry
    const resolver = new ComponentResolver(componentRegistry)
    const renderer = new Renderer(resolver)
    
    if (viewModel) {
      renderer.setViewModel(viewModel)
    }
    
    return renderer
  }
}

export default Renderer
