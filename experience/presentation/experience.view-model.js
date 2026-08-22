/**
 * Experience View Model
 * 
 * Presentation-safe view model for rendering.
 * Derived from ExperienceContext via PresentationAdapter.
 * NOT a second source of truth - purely a projection.
 */

export class ExperienceViewModel {
  #data = null
  #frozen = false

  constructor(data) {
    if (!data) {
      throw new Error('ExperienceViewModel requires data')
    }
    this.#data = Object.freeze({ ...data })
  }

  get identity() {
    return this.#data.identity
  }

  get destination() {
    return this.#data.destination
  }

  get ecosystem() {
    return this.#data.ecosystem
  }

  get company() {
    return this.#data.company
  }

  get experience() {
    return this.#data.experience
  }

  get modules() {
    return this.#data.modules
  }

  get capabilities() {
    return this.#data.capabilities
  }

  get branding() {
    return this.#data.branding
  }

  get theme() {
    return this.#data.theme
  }

  get navigation() {
    return this.#data.navigation
  }

  get seo() {
    return this.#data.seo
  }

  get i18n() {
    return this.#data.i18n
  }

  get maps() {
    return this.#data.maps
  }

  get analytics() {
    return this.#data.analytics
  }

  get contact() {
    return this.#data.contact
  }

  get language() {
    return this.#data.language
  }

  get locale() {
    return this.#data.locale
  }

  get domain() {
    return this.#data.domain
  }

  get metadata() {
    return this.#data.metadata
  }

  get destinationSlug() {
    return this.#data.destination?.slug || null
  }

  get destinationName() {
    return this.#data.destination?.name || null
  }

  get experienceId() {
    return this.#data.experience?.id || null
  }

  get experienceType() {
    return this.#data.experience?.type || null
  }

  get experienceSections() {
    return this.#data.experience?.sections || []
  }

  get experienceComponents() {
    return this.#data.experience?.components || []
  }

  hasModule(moduleId) {
    return this.#data.modules.includes(moduleId)
  }

  hasCapability(capabilityId) {
    if (Array.isArray(this.#data.capabilities)) {
      return this.#data.capabilities.some(cap =>
        typeof cap === 'string' ? cap === capabilityId : cap.name === capabilityId
      )
    }
    return false
  }

  getCapability(capabilityId) {
    if (Array.isArray(this.#data.capabilities)) {
      const cap = this.#data.capabilities.find(c =>
        typeof c === 'string' ? c === capabilityId : c.name === capabilityId
      )
      return cap || null
    }
    return null
  }

  getCapabilityConfiguration(capabilityId) {
    const cap = this.getCapability(capabilityId)
    if (!cap) return null
    return typeof cap === 'object' ? cap.configuration : null
  }

  hasCompany() {
    return this.#data.company !== null
  }

  isResolved() {
    return this.#data.metadata?.isResolved === true
  }

  getBrandingLogo() {
    return this.#data.branding?.logo || '/assets/branding/default-logo.svg'
  }

  getBrandingColors() {
    return this.#data.branding?.colors || {
      primary: '#c8a55c',
      secondary: '#1a1a2e',
      accent: '#e8d5a3'
    }
  }

  getTheme() {
    return this.#data.theme
  }

  getSEO() {
    return this.#data.seo
  }

  getNavigation() {
    return this.#data.navigation
  }

  getContact() {
    return this.#data.contact
  }

  resolveTitle() {
    const seo = this.#data.seo || {}
    const destName = this.#data.destination?.name || 'Untitled'
    
    let title = seo.titleTemplate || seo.title || destName
    
    if (title.includes('{name}')) {
      title = title.replace('{name}', destName)
    }
    if (title.includes('{experience}')) {
      title = title.replace('{experience}', this.#data.experience?.name || '')
    }
    
    return title
  }

  toJSON() {
    return { ...this.#data }
  }

  freeze() {
    if (!this.#frozen) {
      this.#data = Object.freeze(this.#data)
      this.#frozen = true
    }
    return this
  }

  isFrozen() {
    return this.#frozen
  }
}

export default ExperienceViewModel
