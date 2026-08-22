/**
 * Component Resolver
 * 
 * Resolves which presentation components to render based on
 * ExperienceViewModel configuration. Configuration-driven only.
 * Does NOT resolve business capabilities.
 */

import { ComponentRegistry } from './component.registry.js'

export class ComponentResolverError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'ComponentResolverError'
    this.context = context
  }
}

export class ComponentResolver {
  #registry = null
  #viewModel = null

  constructor(registry = null) {
    this.#registry = registry || new ComponentRegistry()
  }

  setRegistry(registry) {
    if (!(registry instanceof ComponentRegistry)) {
      throw new ComponentResolverError('Registry must be a ComponentRegistry instance')
    }
    this.#registry = registry
    return this
  }

  setViewModel(viewModel) {
    this.#viewModel = viewModel
    return this
  }

  resolve() {
    if (!this.#viewModel) {
      throw new ComponentResolverError('ViewModel is required')
    }

    return {
      sections: this.#resolveSections(),
      modules: this.#resolveModules()
    }
  }

  #resolveSections() {
    const experienceSections = this.#viewModel.experienceSections
    if (!experienceSections || !Array.isArray(experienceSections)) {
      return []
    }

    return experienceSections
      .map(sectionId => this.#registry.getSection(sectionId))
      .filter(section => section && section.id !== 'unknown-section')
  }

  #resolveModules() {
    const enabledModules = this.#viewModel.modules
    if (!enabledModules || !Array.isArray(enabledModules)) {
      return []
    }

    return enabledModules
      .map(moduleId => this.#registry.getModule(moduleId))
      .filter(module => module && module.id !== 'unknown-module')
  }

  resolveSection(sectionId) {
    if (!sectionId || typeof sectionId !== 'string') {
      throw new ComponentResolverError('Section ID is required')
    }
    return this.#registry.getSection(sectionId)
  }

  resolveModule(moduleId) {
    if (!moduleId || typeof moduleId !== 'string') {
      throw new ComponentResolverError('Module ID is required')
    }
    return this.#registry.getModule(moduleId)
  }

  resolveComponent(componentId) {
    if (!componentId || typeof componentId !== 'string') {
      throw new ComponentResolverError('Component ID is required')
    }
    return this.#registry.resolve(componentId)
  }

  hasSection(sectionId) {
    return this.#registry.hasSection(sectionId)
  }

  hasModule(moduleId) {
    return this.#registry.hasModule(moduleId)
  }

  isModuleEnabled(moduleId) {
    return this.#viewModel?.hasModule(moduleId) ?? false
  }

  getEnabledModules() {
    return this.#resolveModules()
  }

  getSections() {
    return this.#resolveSections()
  }

  getRegistry() {
    return this.#registry
  }

  getViewModel() {
    return this.#viewModel
  }
}

export default ComponentResolver
