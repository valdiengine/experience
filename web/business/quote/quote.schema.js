/**
 * P15.11.2 — Quote Capability Core
 *
 * Schema definitions for Quote capability.
 */

export const QUOTE_CONFIGURATION_SCHEMA = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    currency: { type: 'string', enum: ['CLP', 'USD', 'EUR'] },
    defaultCurrency: { type: 'string', enum: ['CLP', 'USD', 'EUR'] },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['text', 'email', 'phone', 'select', 'checkbox', 'number', 'textarea'] },
          label: { type: 'string' },
          placeholder: { type: 'string' },
          required: { type: 'boolean' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                value: { type: 'number' }
              }
            }
          },
          validation: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              pattern: { type: 'string' },
              minLength: { type: 'number' },
              maxLength: { type: 'number' }
            }
          }
        },
        required: ['id', 'type', 'label']
      }
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          label: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          priceType: { type: 'string', enum: ['fixed', 'multiplier', 'surcharge'] },
          selectable: { type: 'boolean' },
          defaultSelected: { type: 'boolean' },
          metadata: { type: 'object' }
        },
        required: ['id', 'label']
      }
    },
    pricingRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['base', 'add', 'multiply', 'discount', 'tax', 'minimum', 'maximum'] },
          condition: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['equals', 'greater', 'less', 'contains'] },
              value: {}
            }
          },
          value: { type: 'number' },
          application: { type: 'string', enum: ['each', 'total', 'once'] },
          order: { type: 'number' }
        },
        required: ['id', 'type', 'value']
      }
    },
    customerFields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['text', 'email', 'phone', 'textarea'] },
          label: { type: 'string' },
          placeholder: { type: 'string' },
          required: { type: 'boolean' },
          validation: {
            type: 'object',
            properties: {
              minLength: { type: 'number' },
              maxLength: { type: 'number' },
              pattern: { type: 'string' }
            }
          }
        },
        required: ['id', 'type', 'label']
      }
    },
    metadata: {
      type: 'object'
    },
    rounding: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['none', 'nearest', 'up', 'down'] },
        precision: { type: 'number', minimum: 0, maximum: 2 }
      }
    },
    taxConfiguration: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        rate: { type: 'number', minimum: 0, maximum: 1 },
        included: { type: 'boolean' }
      }
    },
    displayConfiguration: {
      type: 'object',
      properties: {
        showBreakdown: { type: 'boolean' },
        showLineItems: { type: 'boolean' },
        collapseAfter: { type: 'number' },
        currencySymbol: { type: 'string' }
      }
    }
  },
  required: ['enabled']
}

export const QUOTE_SELECTION_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: { type: 'string' }
    },
    fields: {
      type: 'object',
      additionalProperties: true
    },
    quantity: {
      type: 'number',
      minimum: 1
    }
  }
}

export const QUOTE_CUSTOMER_DATA_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 200 },
    email: { type: 'string', maxLength: 200 },
    phone: { type: 'string', maxLength: 20 },
    company: { type: 'string', maxLength: 200 },
    message: { type: 'string', maxLength: 2000 }
  }
}

export function createQuoteConfiguration(config = {}) {
  return {
    enabled: config.enabled !== undefined ? config.enabled : true,
    title: config.title || 'Quote Request',
    description: config.description || '',
    currency: config.currency || 'CLP',
    defaultCurrency: config.defaultCurrency || 'CLP',
    fields: config.fields || [],
    options: config.options || [],
    pricingRules: config.pricingRules || [],
    customerFields: config.customerFields || [],
    metadata: config.metadata || {},
    rounding: config.rounding || { mode: 'nearest', precision: 0 },
    taxConfiguration: config.taxConfiguration || { enabled: false },
    displayConfiguration: config.displayConfiguration || { showBreakdown: true, showLineItems: true }
  }
}

export default {
  QUOTE_CONFIGURATION_SCHEMA,
  QUOTE_SELECTION_SCHEMA,
  QUOTE_CUSTOMER_DATA_SCHEMA,
  createQuoteConfiguration
}
