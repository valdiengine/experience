/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * WhatsApp message templates with safe interpolation.
 */

import { NotificationTemplate } from '../../notification.template.js'

export class WhatsAppTemplates {
  #templates

  constructor(templates = {}) {
    this.#templates = new Map(Object.entries(templates))
  }

  getTemplate(notificationType) {
    return this.#templates.get(notificationType) || this.#getDefaultTemplate()
  }

  addTemplate(notificationType, template) {
    this.#templates.set(notificationType, template)
  }

  #getDefaultTemplate() {
    return new WhatsAppTemplate({
      text: 'Nueva notificación de {{applicationName}}. ID: {{interactionId}}'
    })
  }

  static getDefault() {
    return new WhatsAppTemplates({
      'QUOTE_CREATED': new WhatsAppTemplate({
        text: `Nueva solicitud de cotización

Empresa: {{applicationName}}

Cliente: {{customerName}}

Producto: {{quoteSummary}}

Total estimado: {{quoteTotal}}

Solicitud: {{interactionId}}`
      }),
      'QUOTE_STATUS_CHANGED': new WhatsAppTemplate({
        text: `Estado de cotización actualizado

Empresa: {{applicationName}}

Cliente: {{customerName}}

Estado anterior: {{previousStatus}}

Estado nuevo: {{newStatus}}

Solicitud: {{interactionId}}`
      }),
      'CONTACT_REQUEST_CREATED': new WhatsAppTemplate({
        text: `Nueva solicitud de contacto

Empresa: {{applicationName}}

Nombre: {{customerName}}

Mensaje: {{message}}

Solicitud: {{interactionId}}`
      }),
      'BUSINESS_INTERACTION_CREATED': new WhatsAppTemplate({
        text: `Nueva interacción de negocio

Empresa: {{applicationName}}

Tipo: {{interactionType}}

Cliente: {{customerName}}

Estado: {{status}}

ID: {{interactionId}}`
      }),
      'default': new WhatsAppTemplate({
        text: `Notificación de {{applicationName}}

{{message}}

ID: {{interactionId}}`
      })
    })
  }
}

export class WhatsAppTemplate {
  #text

  constructor(data = {}) {
    this.#text = data.text || ''
  }

  render(data) {
    const sanitizedData = this.#sanitizeData(data)
    const text = this.#renderString(this.#text, sanitizedData)

    return {
      text,
      raw: this.#text
    }
  }

  #sanitizeData(data) {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = this.#escapeForTemplate(value)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = String(value)
      } else if (value === null || value === undefined) {
        sanitized[key] = ''
      } else {
        sanitized[key] = String(value)
      }
    }
    return sanitized
  }

  #renderString(template, data) {
    if (!template) return ''

    let result = template

    for (const [key, value] of Object.entries(data)) {
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${key.toLowerCase()}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${key.toUpperCase()}\\}\\}`, 'g')
      ]

      const stringValue = this.#toString(value)

      for (const pattern of patterns) {
        result = result.replace(pattern, stringValue)
      }
    }

    result = result.replace(/\{\{[^}]+\}\}/g, ' ')
    result = result.replace(/\s+/g, ' ')
    result = result.replace(/^\s+|\s+$/g, '')

    return result
  }

  #toString(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  #escapeForTemplate(text) {
    if (!text) return ''
    return String(text)
      .replace(/[<>]/g, ' ')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
  }
}

export default WhatsAppTemplates
