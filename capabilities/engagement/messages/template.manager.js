/**
 * Template Manager — Reusable message template management
 *
 * Business-agnostic: templates with variable interpolation
 * Tenant isolated: each tenant has its own templates
 */
import { validateTemplate } from '../engagement.schema.js'

export class TemplateManager {
  #context = null
  #templates = new Map()

  constructor(context) {
    this.#context = context
    this.#registerDefaults()
  }

  /**
   * Create a template
   * @param {object} data - { name, channel, subject?, body, variables?, category? }
   * @returns {{ success: boolean, template?: object, errors?: string[] }}
   */
  create(data) {
    const template = {
      id: data.id || `template_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      name: data.name,
      channel: data.channel,
      subject: data.subject || null,
      body: data.body,
      variables: data.variables || this.#extractVariables(data.body),
      category: data.category || 'general',
      createdAt: new Date().toISOString(),
    }

    const validation = validateTemplate(template)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#templates.set(template.id, template)
    return { success: true, template }
  }

  /**
   * Get template by ID
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    return this.#templates.get(id) || null
  }

  /**
   * Get template by name
   * @param {string} name
   * @returns {object|null}
   */
  getByName(name) {
    return Array.from(this.#templates.values()).find(t => t.name === name) || null
  }

  /**
   * Get all templates
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#templates.values())
  }

  /**
   * Get templates by channel
   * @param {string} channel
   * @returns {object[]}
   */
  getByChannel(channel) {
    return Array.from(this.#templates.values()).filter(t => t.channel === channel)
  }

  /**
   * Get templates by category
   * @param {string} category
   * @returns {object[]}
   */
  getByCategory(category) {
    return Array.from(this.#templates.values()).filter(t => t.category === category)
  }

  /**
   * Update template
   * @param {string} id
   * @param {object} updates
   */
  update(id, updates) {
    const template = this.#templates.get(id)
    if (template) {
      Object.assign(template, updates)
      if (updates.body) {
        template.variables = this.#extractVariables(updates.body)
      }
    }
  }

  /**
   * Remove template
   * @param {string} id
   */
  remove(id) {
    this.#templates.delete(id)
  }

  /**
   * Render template with variables
   * @param {string} id - Template ID
   * @param {object} variables - Variable values
   * @returns {object|null} - { subject?, body }
   */
  render(id, variables = {}) {
    const template = this.#templates.get(id)
    if (!template) return null

    return {
      subject: template.subject ? this.#interpolate(template.subject, variables) : null,
      body: this.#interpolate(template.body, variables),
    }
  }

  /**
   * Render template by name
   * @param {string} name - Template name
   * @param {object} variables - Variable values
   * @returns {object|null}
   */
  renderByName(name, variables = {}) {
    const template = this.getByName(name)
    if (!template) return null

    return {
      subject: template.subject ? this.#interpolate(template.subject, variables) : null,
      body: this.#interpolate(template.body, variables),
    }
  }

  // ── Private Methods ──

  #interpolate(template, variables) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.')
      let value = variables
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key]
        } else {
          value = undefined
          break
        }
      }
      return value !== undefined ? String(value) : match
    })
  }

  #extractVariables(body) {
    const variables = []
    const regex = /\{\{([^}]+)\}\}/g
    let match
    while ((match = regex.exec(body)) !== null) {
      variables.push(match[1].trim())
    }
    return variables
  }

  #registerDefaults() {
    const defaults = [
      {
        name: 'reservation_confirmation',
        channel: 'email',
        subject: 'Reservation Confirmation',
        body: 'Hello {{customer.name}},\n\nYour reservation has been received.\nCheck-in: {{reservation.dates.checkIn}}\nCheck-out: {{reservation.dates.checkOut}}\n\nWe will confirm shortly.',
        category: 'reservation',
      },
      {
        name: 'reservation_confirmed',
        channel: 'email',
        subject: 'Reservation Confirmed',
        body: 'Hello {{customer.name}},\n\nYour reservation is confirmed!\nCheck-in: {{reservation.dates.checkIn}}\nCheck-out: {{reservation.dates.checkOut}}\n\nSee you soon!',
        category: 'reservation',
      },
      {
        name: 'reservation_cancelled',
        channel: 'email',
        subject: 'Reservation Cancelled',
        body: 'Hello {{customer.name}},\n\nYour reservation has been cancelled.\nIf you have questions, please contact us.',
        category: 'reservation',
      },
      {
        name: 'reservation_reminder',
        channel: 'email',
        subject: 'Reservation Reminder',
        body: 'Hello {{customer.name}},\n\nYour reservation starts in {{daysUntil}} days.\nCheck-in: {{reservation.dates.checkIn}}\n\nWe look forward to seeing you!',
        category: 'reservation',
      },
      {
        name: 'availability_request',
        channel: 'whatsapp',
        subject: null,
        body: 'Hello {{owner.name}}, do you have availability for the coming weeks? Please respond with your available dates.',
        category: 'availability',
      },
      {
        name: 'customer_recovery',
        channel: 'email',
        subject: 'We miss you!',
        body: 'Hello {{customer.name}},\n\nWe noticed you haven\'t visited in a while. We have new availability — come check it out!',
        category: 'marketing',
      },
      {
        name: 'seasonal_availability',
        channel: 'email',
        subject: 'New Season Availability',
        body: 'Hello {{customer.name}},\n\nThe new season is here! We have availability for the upcoming months.\nBook now to secure your dates.',
        category: 'marketing',
      },
      {
        name: 'feedback_request',
        channel: 'email',
        subject: 'How was your experience?',
        body: 'Hello {{customer.name}},\n\nWe hope you enjoyed your stay. Could you share your feedback?\nYour opinion helps us improve.',
        category: 'feedback',
      },
    ]

    for (const d of defaults) {
      this.create({ ...d, id: `default_${d.name}` })
    }
  }
}
