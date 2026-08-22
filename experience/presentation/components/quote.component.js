/**
 * Quote UI Component
 *
 * Renders public quote interface from configuration.
 * Consumes ExperienceViewModel and produces render structure.
 * Does NOT directly access infrastructure - uses provided callbacks.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export const QUOTE_COMPONENT_EVENTS = {
  ...COMPONENT_EVENTS,
  QUOTE_CALCULATED: 'component:quote:calculated',
  QUOTE_SUBMITTED: 'component:quote:submitted',
  OPTION_CHANGED: 'component:quote:option-changed',
  FIELD_CHANGED: 'component:quote:field-changed'
}

export class QuoteUIComponent extends BaseComponent {
  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['identity', 'capabilities']
    this.#state = {
      selectedOptions: [],
      quantity: 1,
      customerData: {},
      calculatedResult: null,
      isCalculating: false,
      isSubmitting: false,
      errors: [],
      submitSuccess: false
    }
  }

  #state

  render() {
    this.validate()

    const config = this.getQuoteConfiguration()
    if (!config || !config.enabled) {
      return null
    }

    const identity = this.viewModel.identity
    const branding = this.getBranding()
    const theme = this.getTheme()

    const quoteUI = {
      component: 'quote',
      id: 'quote-section',
      content: {
        title: config.title || 'Solicitar Cotización',
        description: config.description || 'Complete el formulario para recibir una cotización',
        currency: config.currency || 'CLP'
      },
      options: this.#renderOptions(config),
      customerFields: this.#renderCustomerFields(config),
      calculatedResult: this.#state.calculatedResult,
      pricingRules: this.#renderPricingRules(config),
      state: {
        selectedOptions: this.#state.selectedOptions,
        quantity: this.#state.quantity,
        customerData: this.#state.customerData,
        isCalculating: this.#state.isCalculating,
        isSubmitting: this.#state.isSubmitting,
        errors: this.#state.errors,
        submitSuccess: this.#state.submitSuccess
      },
      branding: {
        colors: branding.colors,
        fonts: branding.fonts
      },
      theme: {
        mode: theme?.mode || 'light',
        spacing: theme?.spacing || '8px',
        borderRadius: theme?.borderRadius || '8px'
      },
      metadata: {
        capability: 'quote',
        version: '1.0.0',
        applicationId: identity?.applicationId,
        domain: identity?.domain,
        route: this.viewModel.experience?.id
      },
      accessibility: {
        role: 'region',
        label: 'Quote Request Form'
      },
      actions: {
        onCalculate: this.props.onCalculate || (() => {}),
        onSubmit: this.props.onSubmit || (() => {}),
        onOptionChange: this.props.onOptionChange || (() => {}),
        onFieldChange: this.props.onFieldChange || (() => {})
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'quote', data: quoteUI })
    return quoteUI
  }

  #renderOptions(config) {
    if (!config.options || !Array.isArray(config.options)) {
      return []
    }

    return config.options.map(opt => ({
      id: opt.id,
      label: opt.label || opt.id,
      description: opt.description || '',
      price: opt.price || 0,
      priceType: opt.priceType || 'fixed',
      category: opt.category || 'default',
      selectable: opt.selectable !== false,
      selected: this.#state.selectedOptions.includes(opt.id),
      metadata: opt.metadata || {}
    }))
  }

  #renderCustomerFields(config) {
    if (!config.customerFields || !Array.isArray(config.customerFields)) {
      return []
    }

    return config.customerFields.map(field => ({
      id: field.id,
      type: field.type || 'text',
      label: field.label || field.id,
      placeholder: field.placeholder || '',
      required: field.required || false,
      value: this.#state.customerData[field.id] || '',
      validation: field.validation || {}
    }))
  }

  #renderPricingRules(config) {
    if (!config.pricingRules || !Array.isArray(config.pricingRules)) {
      return []
    }

    return config.pricingRules.map(rule => ({
      id: rule.id,
      type: rule.type,
      value: rule.value,
      order: rule.order
    }))
  }

  getQuoteConfiguration() {
    return this.viewModel.getCapabilityConfiguration('quote')
  }

  setSelectedOptions(optionIds) {
    this.#state.selectedOptions = [...optionIds]
    this.#invalidate()
  }

  setQuantity(quantity) {
    this.#state.quantity = Math.max(1, parseInt(quantity, 10) || 1)
    this.#invalidate()
  }

  setCustomerData(fieldId, value) {
    this.#state.customerData = {
      ...this.#state.customerData,
      [fieldId]: value
    }
    this.#invalidate()
  }

  setCalculatedResult(result) {
    this.#state.calculatedResult = result
    this.#state.isCalculating = false
    this.#invalidate()
  }

  setSubmitting(isSubmitting) {
    this.#state.isSubmitting = isSubmitting
    this.#invalidate()
  }

  setSubmitSuccess(success) {
    this.#state.submitSuccess = success
    this.#state.isSubmitting = false
    this.#invalidate()
  }

  setErrors(errors) {
    this.#state.errors = Array.isArray(errors) ? errors : [errors]
    this.#invalidate()
  }

  clearErrors() {
    this.#state.errors = []
    this.#invalidate()
  }

  reset() {
    this.#state = {
      selectedOptions: [],
      quantity: 1,
      customerData: {},
      calculatedResult: null,
      isCalculating: false,
      isSubmitting: false,
      errors: [],
      submitSuccess: false
    }
    this.#invalidate()
  }

  #invalidate() {
    this.invalidate()
  }

  getState() {
    return { ...this.#state }
  }

  getSelectedOptions() {
    return [...this.#state.selectedOptions]
  }

  getQuantity() {
    return this.#state.quantity
  }

  getCustomerData() {
    return { ...this.#state.customerData }
  }

  isOptionSelected(optionId) {
    return this.#state.selectedOptions.includes(optionId)
  }

  hasErrors() {
    return this.#state.errors.length > 0
  }

  getErrors() {
    return [...this.#state.errors]
  }

  wasSubmitSuccessful() {
    return this.#state.submitSuccess
  }

  handleCalculate() {
    this.clearErrors()
    this.#state.isCalculating = true
    this.#invalidate()

    this.emit(QUOTE_COMPONENT_EVENTS.QUOTE_CALCULATED, {
      options: this.#state.selectedOptions,
      quantity: this.#state.quantity,
      customerData: this.#state.customerData
    })

    if (this.props.onCalculate) {
      this.props.onCalculate({
        options: this.#state.selectedOptions,
        quantity: this.#state.quantity,
        customerData: this.#state.customerData
      })
    }
  }

  handleSubmit() {
    this.clearErrors()
    this.#state.isSubmitting = true
    this.#invalidate()

    this.emit(QUOTE_COMPONENT_EVENTS.QUOTE_SUBMITTED, {
      options: this.#state.selectedOptions,
      quantity: this.#state.quantity,
      customerData: this.#state.customerData
    })

    if (this.props.onSubmit) {
      this.props.onSubmit({
        options: this.#state.selectedOptions,
        quantity: this.#state.quantity,
        customerData: this.#state.customerData
      })
    }
  }

  handleOptionChange(optionId, selected) {
    let newSelectedOptions
    if (selected) {
      newSelectedOptions = [...this.#state.selectedOptions, optionId]
    } else {
      newSelectedOptions = this.#state.selectedOptions.filter(id => id !== optionId)
    }

    this.#state.selectedOptions = newSelectedOptions
    this.#invalidate()

    this.emit(QUOTE_COMPONENT_EVENTS.OPTION_CHANGED, {
      optionId,
      selected,
      options: newSelectedOptions
    })

    if (this.props.onOptionChange) {
      this.props.onOptionChange(optionId, selected)
    }
  }

  handleFieldChange(fieldId, value) {
    this.#state.customerData = {
      ...this.#state.customerData,
      [fieldId]: value
    }
    this.#invalidate()

    this.emit(QUOTE_COMPONENT_EVENTS.FIELD_CHANGED, {
      fieldId,
      value
    })

    if (this.props.onFieldChange) {
      this.props.onFieldChange(fieldId, value)
    }
  }

  static get requiredViewModelProps() {
    return ['identity', 'capabilities']
  }
}

export default QuoteUIComponent
