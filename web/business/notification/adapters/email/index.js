/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Email adapter module exports.
 */

export {
  EmailNotificationAdapter,
  MemoryEmailAdapter,
  createEmailAdapter,
  createMemoryEmailAdapter
} from './email.adapter.js'

export {
  EmailError,
  EmailValidationError,
  EmailProviderError,
  EmailRecipientError,
  EmailHeaderInjectionError,
  EmailRateLimitError,
  EmailAuthenticationError,
  EmailTimeoutError,
  EmailDeliveryError,
  EMAIL_ERROR_CODES
} from './email.errors.js'

export { EmailValidator } from './email.validator.js'

export { EmailTemplates, EmailTemplate } from './email.templates.js'

export {
  EmailProvider,
  MockEmailProvider,
  SMTPEmailProvider,
  ResendEmailProvider,
  SendGridEmailProvider,
  createEmailProvider
} from './email.provider.js'
