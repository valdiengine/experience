/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Email templates with XSS protection and plain-text fallback.
 */

import { NotificationTemplate } from '../../notification.template.js'

export class EmailTemplates {
  #templates

  constructor(templates = {}) {
    this.#templates = new Map(Object.entries(templates))
  }

  getTemplate(notificationType, channel = 'email') {
    const key = `${notificationType}:${channel}`
    return this.#templates.get(key) || this.#templates.get('default:email') || this.#getDefaultTemplate()
  }

  addTemplate(notificationType, channel, template) {
    const key = `${notificationType}:${channel}`
    this.#templates.set(key, template)
  }

  #getDefaultTemplate() {
    return new EmailTemplate({
      subject: 'Notification from {{applicationName}}',
      title: 'New Notification',
      body: 'You have received a new notification.',
      textTemplate: 'You have received a new notification from {{applicationName}}.'
    })
  }

  static getDefault() {
    return new EmailTemplates({
      'QUOTE_CREATED:email': new EmailTemplate({
        subject: 'Nueva cotización — {{applicationName}}',
        title: 'Nueva solicitud de cotización',
        body: `
          <h2>Nueva solicitud de cotización</h2>
          <p><strong>Cliente:</strong> {{customerName}}</p>
          <p><strong>Producto:</strong> {{quoteSummary}}</p>
          <p><strong>Total estimado:</strong> {{quoteTotal}}</p>
          <p><strong>Solicitud:</strong> {{interactionId}}</p>
          <p><strong>Fecha:</strong> {{timestamp}}</p>
        `,
        textTemplate: `
          Nueva solicitud de cotización

          Cliente: {{customerName}}
          Producto: {{quoteSummary}}
          Total estimado: {{quoteTotal}}
          Solicitud: {{interactionId}}
          Fecha: {{timestamp}}
        `
      }),
      'QUOTE_STATUS_CHANGED:email': new EmailTemplate({
        subject: 'Estado de cotización actualizado — {{applicationName}}',
        title: 'Estado de cotización actualizado',
        body: `
          <h2>Estado de cotización actualizado</h2>
          <p><strong>Cliente:</strong> {{customerName}}</p>
          <p><strong>Estado anterior:</strong> {{previousStatus}}</p>
          <p><strong>Estado nuevo:</strong> {{newStatus}}</p>
          <p><strong>Solicitud:</strong> {{interactionId}}</p>
        `,
        textTemplate: `
          Estado de cotización actualizado

          Cliente: {{customerName}}
          Estado anterior: {{previousStatus}}
          Estado nuevo: {{newStatus}}
          Solicitud: {{interactionId}}
        `
      }),
      'CONTACT_REQUEST_CREATED:email': new EmailTemplate({
        subject: 'Nueva solicitud de contacto — {{applicationName}}',
        title: 'Nueva solicitud de contacto',
        body: `
          <h2>Nueva solicitud de contacto</h2>
          <p><strong>Nombre:</strong> {{customerName}}</p>
          <p><strong>Email:</strong> {{customerEmail}}</p>
          <p><strong>Mensaje:</strong> {{message}}</p>
          <p><strong>Solicitud:</strong> {{interactionId}}</p>
        `,
        textTemplate: `
          Nueva solicitud de contacto

          Nombre: {{customerName}}
          Email: {{customerEmail}}
          Mensaje: {{message}}
          Solicitud: {{interactionId}}
        `
      }),
      'BUSINESS_INTERACTION_CREATED:email': new EmailTemplate({
        subject: 'Nueva interacción — {{applicationName}}',
        title: 'Nueva interacción de negocio',
        body: `
          <h2>Nueva interacción de negocio</h2>
          <p><strong>Tipo:</strong> {{interactionType}}</p>
          <p><strong>Cliente:</strong> {{customerName}}</p>
          <p><strong>Estado:</strong> {{status}}</p>
          <p><strong>ID:</strong> {{interactionId}}</p>
        `,
        textTemplate: `
          Nueva interacción de negocio

          Tipo: {{interactionType}}
          Cliente: {{customerName}}
          Estado: {{status}}
          ID: {{interactionId}}
        `
      }),
      'default:email': new EmailTemplate({
        subject: 'Notificación — {{applicationName}}',
        title: 'Nueva notificación',
        body: `
          <h2>{{title}}</h2>
          <p>{{message}}</p>
          <p><strong>ID:</strong> {{interactionId}}</p>
          <p><strong>Fecha:</strong> {{timestamp}}</p>
        `,
        textTemplate: `
          {{title}}

          {{message}}

          ID: {{interactionId}}
          Fecha: {{timestamp}}
        `
      })
    })
  }
}

export class EmailTemplate {
  #subject
  #title
  #body
  #textTemplate

  constructor(data = {}) {
    this.#subject = data.subject || 'Notification'
    this.#title = data.title || 'Notification'
    this.#body = data.body || ''
    this.#textTemplate = data.textTemplate || data.body || ''
  }

  render(data) {
    const rawData = this.#prepareRawData(data)

    const subject = this.#renderAndEscape(this.#subject, rawData)
    const title = this.#renderAndEscape(this.#title, rawData)
    const html = this.#renderHtml(this.#body, rawData)
    const text = this.#stripHtml(this.#renderString(this.#textTemplate, rawData))

    return {
      subject,
      title,
      html,
      text
    }
  }

  #prepareRawData(data) {
    const prepared = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        prepared[key] = value
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        prepared[key] = String(value)
      } else if (value === null || value === undefined) {
        prepared[key] = ''
      } else {
        prepared[key] = String(value)
      }
    }
    return prepared
  }

  #renderAndEscape(template, data) {
    const rendered = this.#renderString(template, data)
    return this.#escapeHtml(rendered)
  }

  #sanitizeData(data) {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = this.#escapeHtml(value)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value
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

  #renderHtml(html, data) {
    if (!html) return ''

    let result = html

    for (const [key, value] of Object.entries(data)) {
      const escapedValue = this.#escapeHtml(this.#toString(value))
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${key.toLowerCase()}\\}\\}`, 'g'),
        new RegExp(`\\{\\{${key.toUpperCase()}\\}\\}`, 'g')
      ]

      for (const pattern of patterns) {
        result = result.replace(pattern, escapedValue)
      }
    }

    result = result.replace(/\{\{[^}]+\}\}/g, '')

    return result
  }

  #toString(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  #escapeHtml(text) {
    if (!text) return ''

    const htmlEscapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }

    return String(text).replace(/[&<>"'/]/g, char => htmlEscapeMap[char])
  }

  #stripHtml(html) {
    if (!html) return ''
    return String(html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
  }
}

export default EmailTemplates
