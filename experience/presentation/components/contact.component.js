/**
 * Contact Component
 * 
 * Renders contact information and contact form.
 * Consumes ExperienceViewModel - configuration-driven, destination-independent.
 */

import { BaseComponent, COMPONENT_EVENTS } from './base.component.js'

export class ContactComponent extends BaseComponent {
  #formData = {
    name: '',
    email: '',
    message: ''
  }
  #formSubmitted = false

  constructor(viewModel, props = {}) {
    super(viewModel, props)
    this.requiredViewModelProps = ['destination']
  }

  render() {
    this.validate()

    const destination = this.getDestination()
    const branding = this.getBranding()
    const theme = this.getTheme()
    const contact = this.#getContact()

    const contactData = {
      component: 'contact',
      id: 'contact-section',
      content: {
        title: 'Contacto',
        subtitle: `Contáctanos en ${destination.name}`
      },
      contact: {
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        social: contact.social || {}
      },
      form: {
        enabled: true,
        fields: [
          { id: 'name', label: 'Nombre', type: 'text', required: true, value: this.#formData.name },
          { id: 'email', label: 'Correo electrónico', type: 'email', required: true, value: this.#formData.email },
          { id: 'message', label: 'Mensaje', type: 'textarea', required: true, value: this.#formData.message }
        ],
        submit: {
          label: 'Enviar mensaje',
          action: 'submit'
        },
        submitted: this.#formSubmitted,
        successMessage: 'Mensaje enviado correctamente',
        errorMessage: 'Error al enviar el mensaje'
      },
      map: {
        enabled: true,
        center: this.viewModel.maps?.defaultCenter || [-39.8197, -73.2459],
        zoom: this.viewModel.maps?.defaultZoom || 13,
        provider: this.viewModel.maps?.provider || 'mapbox'
      },
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
        label: `Contact information for ${destination.name}`,
        formLabel: 'Contact form'
      },
      events: {
        onFieldChange: { event: COMPONENT_EVENTS.CHANGE },
        onFormSubmit: { event: COMPONENT_EVENTS.FORM_SUBMIT },
        onContactRequest: { event: COMPONENT_EVENTS.CONTACT_REQUESTED }
      }
    }

    this.emit(COMPONENT_EVENTS.RENDER, { component: 'contact', data: contactData })
    return contactData
  }

  #getContact() {
    const destination = this.viewModel.destination
    const company = this.viewModel.company
    const contact = company?.contact || destination?.contact || {}
    
    return {
      email: contact.email || 'contacto@valdi.app',
      phone: contact.phone || '+56 9 1234 5678',
      address: contact.address ? 
        `${contact.address.city || ''}, ${contact.address.region || ''}, ${contact.address.country || 'Chile'}` :
        (destination ? `${destination.name}, ${destination.region || 'Region'}, Chile` : 'Valdivia, Los Ríos, Chile'),
      social: contact.social || {}
    }
  }

  updateField(fieldId, value) {
    this.#formData[fieldId] = value
    this.setState({ [fieldId]: value })
    this.emit(COMPONENT_EVENTS.CHANGE, {
      field: fieldId,
      value
    })
  }

  submitForm() {
    this.#formSubmitted = true
    this.setState({ formSubmitted: true })
    this.emit(COMPONENT_EVENTS.FORM_SUBMIT, {
      name: this.#formData.name,
      email: this.#formData.email,
      message: this.#formData.message
    })
  }

  handleFieldChange(fieldId, value) {
    this.updateField(fieldId, value)
  }

  handleFormSubmit() {
    if (this.#validateForm()) {
      this.submitForm()
    }
  }

  #validateForm() {
    if (!this.#formData.name.trim()) return false
    if (!this.#formData.email.trim() || !this.#formData.email.includes('@')) return false
    if (!this.#formData.message.trim()) return false
    return true
  }

  resetForm() {
    this.#formData = { name: '', email: '', message: '' }
    this.#formSubmitted = false
    this.setState({ ...this.#formData, formSubmitted: false })
  }

  toJSON() {
    return {
      ...super.toJSON(),
      formData: { ...this.#formData },
      formSubmitted: this.#formSubmitted
    }
  }
}

export default ContactComponent
