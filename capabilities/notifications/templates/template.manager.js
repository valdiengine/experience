/**
 * Notifications Capability — Template Manager
 *
 * Manages notification templates with variable interpolation
 * Business-agnostic: templates are generic notification containers
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'
import { NOTIFICATION_CHANNELS } from '../notification.schema.js'

const DEFAULT_TEMPLATES = [
  {
    id: 'reservation_confirmation',
    name: 'Reservation Confirmation',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'reservation',
    subject: 'Reserva confirmada — {{business_name}}',
    body: 'Hola {{customer_name}}, tu reserva #{{reservation_id}} para {{reservation_date}} ha sido confirmada.',
    htmlBody: '<h1>Reserva Confirmada</h1><p>Hola {{customer_name}},</p><p>Tu reserva <strong>#{{reservation_id}}</strong> para <strong>{{reservation_date}}</strong> ha sido confirmada.</p><p>{{business_name}}</p>',
    variables: ['customer_name', 'reservation_id', 'reservation_date', 'business_name'],
    defaults: { business_name: '' },
    enabled: true,
  },
  {
    id: 'reservation_reminder',
    name: 'Reservation Reminder',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'reservation',
    subject: 'Recordatorio — tu reserva es mañana',
    body: 'Hola {{customer_name}}, te recordamos que tu reserva #{{reservation_id}} es mañana {{reservation_date}}.',
    htmlBody: '<h1>Recordatorio de Reserva</h1><p>Hola {{customer_name}},</p><p>Tu reserva <strong>#{{reservation_id}}</strong> es mañana <strong>{{reservation_date}}</strong>.</p>',
    variables: ['customer_name', 'reservation_id', 'reservation_date'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'reservation_cancellation',
    name: 'Reservation Cancellation',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'reservation',
    subject: 'Reserva cancelada — {{business_name}}',
    body: 'Hola {{customer_name}}, tu reserva #{{reservation_id}} ha sido cancelada.',
    htmlBody: '<h1>Reserva Cancelada</h1><p>Hola {{customer_name}},</p><p>Tu reserva <strong>#{{reservation_id}}</strong> ha sido cancelada.</p>',
    variables: ['customer_name', 'reservation_id', 'business_name'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'welcome_customer',
    name: 'Welcome Customer',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'onboarding',
    subject: 'Bienvenido a {{business_name}}',
    body: 'Hola {{customer_name}}, bienvenido a {{business_name}}. Estamos aquí para ayudarte.',
    htmlBody: '<h1>Bienvenido</h1><p>Hola {{customer_name}},</p><p>Bienvenido a <strong>{{business_name}}</strong>. Estamos aquí para ayudarte.</p>',
    variables: ['customer_name', 'business_name'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'payment_received',
    name: 'Payment Received',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'billing',
    subject: 'Pago recibido — {{amount}}',
    body: 'Hola {{customer_name}}, hemos recibido tu pago de {{amount}}.',
    htmlBody: '<h1>Pago Recibido</h1><p>Hola {{customer_name}},</p><p>Hemos recibido tu pago de <strong>{{amount}}</strong>.</p>',
    variables: ['customer_name', 'amount'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'subscription_expiring',
    name: 'Subscription Expiring',
    channel: NOTIFICATION_CHANNELS.EMAIL,
    category: 'billing',
    subject: 'Tu suscripción {{plan_name}} expira pronto',
    body: 'Hola {{customer_name}}, tu suscripción {{plan_name}} expira el {{date}}.',
    htmlBody: '<h1>Suscripción por Expirar</h1><p>Hola {{customer_name}},</p><p>Tu suscripción <strong>{{plan_name}}</strong> expira el <strong>{{date}}</strong>.</p>',
    variables: ['customer_name', 'plan_name', 'date'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'push_reservation_update',
    name: 'Push Reservation Update',
    channel: NOTIFICATION_CHANNELS.PUSH,
    category: 'reservation',
    subject: 'Actualización de reserva',
    body: 'Tu reserva #{{reservation_id}} ha sido actualizada: {{reservation_status}}',
    variables: ['reservation_id', 'reservation_status'],
    defaults: {},
    enabled: true,
  },
  {
    id: 'sms_verification',
    name: 'SMS Verification',
    channel: NOTIFICATION_CHANNELS.SMS,
    category: 'auth',
    subject: '',
    body: 'Tu código de verificación es: {{code}}. Válido por 10 minutos.',
    variables: ['code'],
    defaults: {},
    enabled: true,
  },
]

export class TemplateManager {
  #templates = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.#loadDefaults()
  }

  #loadDefaults() {
    for (const template of DEFAULT_TEMPLATES) {
      this.#templates.set(template.id, { ...template })
    }
  }

  /**
   * Create a new template
   * @param {object} template - Template data
   * @returns {{ success: boolean, template?: object, error?: string }}
   */
  create(template) {
    if (!template.id || !template.name || !template.channel || !template.body) {
      return { success: false, error: 'Missing required fields: id, name, channel, body' }
    }

    if (this.#templates.has(template.id)) {
      return { success: false, error: `Template ${template.id} already exists` }
    }

    const entry = {
      ...template,
      enabled: template.enabled !== false,
      variables: template.variables || [],
      defaults: template.defaults || {},
      createdAt: new Date().toISOString(),
    }

    this.#templates.set(template.id, entry)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.TEMPLATE_CREATED, { template: entry })
    return { success: true, template: entry }
  }

  /**
   * Get template by ID
   * @param {string} templateId
   * @returns {object|null}
   */
  get(templateId) {
    return this.#templates.get(templateId) || null
  }

  /**
   * Get all templates, optionally filtered
   * @param {object} [filter] - { channel, category, enabled }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let templates = [...this.#templates.values()]

    if (filter.channel) {
      templates = templates.filter(t => t.channel === filter.channel)
    }
    if (filter.category) {
      templates = templates.filter(t => t.category === filter.category)
    }
    if (filter.enabled !== undefined) {
      templates = templates.filter(t => t.enabled === filter.enabled)
    }

    return templates
  }

  /**
   * Update a template
   * @param {string} templateId
   * @param {object} updates
   * @returns {{ success: boolean, template?: object, error?: string }}
   */
  update(templateId, updates) {
    const existing = this.#templates.get(templateId)
    if (!existing) {
      return { success: false, error: `Template ${templateId} not found` }
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    }

    this.#templates.set(templateId, updated)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.TEMPLATE_UPDATED, { template: updated })
    return { success: true, template: updated }
  }

  /**
   * Delete a template
   * @param {string} templateId
   * @returns {{ success: boolean, error?: string }}
   */
  delete(templateId) {
    const existing = this.#templates.get(templateId)
    if (!existing) {
      return { success: false, error: `Template ${templateId} not found` }
    }

    this.#templates.delete(templateId)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.TEMPLATE_DELETED, { templateId })
    return { success: true }
  }

  /**
   * Render a template with variables
   * @param {string} templateId
   * @param {object} variables - Variable values
   * @returns {{ success: boolean, rendered?: object, error?: string }}
   */
  render(templateId, variables = {}) {
    const template = this.#templates.get(templateId)
    if (!template) {
      return { success: false, error: `Template ${templateId} not found` }
    }

    if (!template.enabled) {
      return { success: false, error: `Template ${templateId} is disabled` }
    }

    const mergedVars = { ...template.defaults, ...variables }

    const rendered = {
      channel: template.channel,
      category: template.category,
      subject: template.subject ? this.#interpolate(template.subject, mergedVars) : undefined,
      body: this.#interpolate(template.body, mergedVars),
      htmlBody: template.htmlBody ? this.#interpolate(template.htmlBody, mergedVars) : undefined,
    }

    this.#eventBus?.emit(NOTIFICATION_EVENTS.TEMPLATE_RENDERED, {
      templateId,
      channel: template.channel,
    })

    return { success: true, rendered }
  }

  /**
   * Interpolate variables in a template string
   * @param {string} text - Template string with {{variable}} placeholders
   * @param {object} variables - Variable values
   * @returns {string}
   */
  #interpolate(text, variables) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match
    })
  }

  /**
   * Get categories
   * @returns {string[]}
   */
  getCategories() {
    const categories = new Set()
    for (const template of this.#templates.values()) {
      categories.add(template.category)
    }
    return [...categories]
  }

  /**
   * Clear all data
   */
  clear() {
    this.#templates.clear()
  }
}
