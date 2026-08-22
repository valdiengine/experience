/**
 * Base Component
 * 
 * Abstract base class for all presentation components.
 * Components consume ExperienceViewModel and produce render structures.
 * Framework-agnostic - produces data structures, not DOM.
 */

export const COMPONENT_EVENTS = {
  CLICK: 'component:click',
  HOVER: 'component:hover',
  FOCUS: 'component:focus',
  BLUR: 'component:blur',
  CHANGE: 'component:change',
  SUBMIT: 'component:submit',
  NAVIGATE: 'component:navigate',
  CTA_CLICK: 'component:cta:click',
  GALLERY_OPEN: 'component:gallery:open',
  GALLERY_CLOSE: 'component:gallery:close',
  GALLERY_NAVIGATE: 'component:gallery:navigate',
  MODAL_OPEN: 'component:modal:open',
  MODAL_CLOSE: 'component:modal:close',
  FORM_SUBMIT: 'component:form:submit',
  CONTACT_REQUESTED: 'component:contact:requested',
  SERVICE_SELECTED: 'component:service:selected',
  CONFIGURATION_CHANGED: 'component:configuration:changed'
}

export class BaseComponent {
  #viewModel = null
  #props = {}
  #state = {}
  #rendered = null
  #listeners = new Map()

  constructor(viewModel, props = {}) {
    if (!viewModel) {
      throw new Error('BaseComponent requires a viewModel')
    }
    this.#viewModel = viewModel
    this.#props = Object.freeze({ ...props })
  }

  get viewModel() {
    return this.#viewModel
  }

  get props() {
    return this.#props
  }

  get state() {
    return { ...this.#state }
  }

  get componentId() {
    return this.constructor.name.replace('Component', '').toLowerCase()
  }

  setState(newState) {
    this.#state = { ...this.#state, ...newState }
    this.#rendered = null
  }

  on(event, handler) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set())
    }
    this.#listeners.get(event).add(handler)
    return this
  }

  off(event, handler) {
    if (this.#listeners.has(event)) {
      this.#listeners.get(event).delete(handler)
    }
    return this
  }

  emit(event, data = {}) {
    if (this.#listeners.has(event)) {
      for (const handler of this.#listeners.get(event)) {
        try {
          handler({ event, component: this.componentId, ...data })
        } catch (e) {
          console.error(`Event handler error for ${event}:`, e)
        }
      }
    }
  }

  getTheme() {
    return this.#viewModel.getTheme()
  }

  getBranding() {
    return {
      logo: this.#viewModel.getBrandingLogo(),
      colors: this.#viewModel.getBrandingColors(),
      fonts: this.#viewModel.branding?.fonts || {}
    }
  }

  getDestination() {
    return {
      slug: this.#viewModel.destinationSlug,
      name: this.#viewModel.destinationName
    }
  }

  render() {
    throw new Error(`${this.constructor.name} must implement render()`)
  }

  toJSON() {
    return {
      component: this.componentId,
      rendered: this.#rendered,
      state: this.#state,
      props: this.#props
    }
  }

  shouldRender() {
    return this.#rendered === null
  }

  invalidate() {
    this.#rendered = null
  }

  static get requiredViewModelProps() {
    return []
  }

  validate() {
    const required = this.constructor.requiredViewModelProps
    const missing = required.filter(prop => !this.#viewModel[prop])
    if (missing.length > 0) {
      throw new Error(`${this.constructor.name} missing required ViewModel props: ${missing.join(', ')}`)
    }
    return true
  }
}

export default BaseComponent
