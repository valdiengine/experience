/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification template model and rendering.
 */

import { sanitizeNotificationPayload } from './notification.schema.js'

export class NotificationTemplate {
  #id
  #name
  #channel
  #subject
  #title
  #body
  #variables
  #locale
  #metadata

  constructor(data = {}) {
    this.#id = data.id || `tpl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
    this.#name = data.name || 'default'
    this.#channel = data.channel || 'email'
    this.#subject = data.subject || ''
    this.#title = data.title || ''
    this.#body = data.body || ''
    this.#variables = data.variables || []
    this.#locale = data.locale || 'es-CL'
    this.#metadata = data.metadata || {}
  }

  get id() {
    return this.#id
  }

  get name() {
    return this.#name
  }

  get channel() {
    return this.#channel
  }

  get subject() {
    return this.#subject
  }

  get title() {
    return this.#title
  }

  get body() {
    return this.#body
  }

  get variables() {
    return [...this.#variables]
  }

  get locale() {
    return this.#locale
  }

  get metadata() {
    return { ...this.#metadata }
  }

  render(payload) {
    const sanitized = sanitizeNotificationPayload(payload)

    const variables = this.#extractVariables(sanitized)

    return {
      subject: this.#renderString(this.#subject, variables),
      title: this.#renderString(this.#title, variables),
      body: this.#renderString(this.#body, variables),
      renderedAt: new Date().toISOString()
    }
  }

  #extractVariables(payload) {
    const variables = new Map()

    for (const [key, value] of Object.entries(payload)) {
      variables.set(key, value)
      variables.set(key.toLowerCase(), value)
      variables.set(key.toUpperCase(), value)
    }

    return variables
  }

  #renderString(template, variables) {
    if (!template) return ''

    let result = template

    for (const [name, value] of variables.entries()) {
      const patterns = [
        new RegExp(`\\{\\{${name}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${name.toLowerCase()}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${name.toUpperCase()}\\}\\}`, 'g')
      ]

      const stringValue = this.#toString(value)

      for (const pattern of patterns) {
        result = result.replace(pattern, stringValue)
      }
    }

    result = result.replace(/\{\{[^}]+\}\}/g, ' ')

    result = result.replace(/\s+/g, ' ')

    return result.trim()
  }

  #toString(value) {
    if (value === null || value === undefined) {
      return ''
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  validate() {
    const errors = []

    if (!this.#channel) {
      errors.push('Channel is required')
    }

    if (!this.#body) {
      errors.push('Body is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      channel: this.#channel,
      subject: this.#subject,
      title: this.#title,
      body: this.#body,
      variables: [...this.#variables],
      locale: this.#locale,
      metadata: { ...this.#metadata }
    }
  }

  static fromJSON(json) {
    return new NotificationTemplate(json)
  }
}

export function createNotificationTemplate(data = {}) {
  return new NotificationTemplate(data)
}

export function getDefaultTemplates() {
  return {
    quote_created: new NotificationTemplate({
      name: 'quote_created',
      channel: 'email',
      subject: 'Nueva cotización solicitada - {{applicationName}}',
      title: 'Nueva Cotización',
      body: `
Estimado equipo,

Se ha recibido una nueva solicitud de cotización.

Cliente: {{customerName}}
Email: {{customerEmail}}
Teléfono: {{customerPhone}}

Detalles de la cotización:
{{quoteDetails}}

ID de solicitud: {{interactionId}}
Fecha: {{createdAt}}

Por favor revise esta solicitud en el panel de administración.
      `.trim(),
      variables: ['customerName', 'customerEmail', 'customerPhone', 'quoteDetails', 'interactionId', 'createdAt', 'applicationName'],
      locale: 'es-CL'
    }),

    quote_created_whatsapp: new NotificationTemplate({
      name: 'quote_created_whatsapp',
      channel: 'whatsapp',
      title: 'Nueva Cotización',
      body: `¡Nueva cotización recibida!

Cliente: {{customerName}}
Total: {{quoteTotal}} {{currency}}

Revisa el panel de administración.`,
      variables: ['customerName', 'quoteTotal', 'currency'],
      locale: 'es-CL'
    })
  }
}

export default {
  NotificationTemplate,
  createNotificationTemplate,
  getDefaultTemplates
}
