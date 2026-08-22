/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * WhatsApp adapter module exports.
 */

export {
  WhatsAppNotificationAdapter,
  MemoryWhatsAppAdapter,
  createWhatsAppAdapter,
  createMemoryWhatsAppAdapter
} from './whatsapp.adapter.js'

export {
  WhatsAppError,
  WhatsAppValidationError,
  WhatsAppProviderError,
  WhatsAppRecipientError,
  WhatsAppRateLimitError,
  WhatsAppAuthenticationError,
  WhatsAppTimeoutError,
  WhatsAppMessageError,
  WHATSAPP_ERROR_CODES
} from './whatsapp.errors.js'

export { PhoneValidator } from './whatsapp.validator.js'

export { WhatsAppTemplates, WhatsAppTemplate } from './whatsapp.templates.js'

export {
  WhatsAppProvider,
  MockWhatsAppProvider,
  MetaGraphWhatsAppProvider,
  TwilioWhatsAppProvider,
  createWhatsAppProvider
} from './whatsapp.provider.js'
