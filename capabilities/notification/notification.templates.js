export const NOTIFICATION_TEMPLATE_TYPES = Object.freeze({
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_COMPLETED: 'refund_completed',
  REMINDER_BEFORE_CHECKIN: 'reminder_before_checkin',
})

export const NOTIFICATION_TEMPLATE_VARIABLES = Object.freeze({
  RESERVATION: [
    'reservationId',
    'checkIn',
    'checkOut',
    'guestName',
    'propertyName',
    'propertyAddress',
    'totalPrice',
    'currency',
  ],
  PAYMENT: [
    'paymentId',
    'amount',
    'currency',
    'method',
    'transactionId',
  ],
  GUEST: [
    'firstName',
    'lastName',
    'email',
    'phone',
  ],
  BUSINESS: [
    'businessName',
    'businessEmail',
    'businessPhone',
  ],
  COMMON: [
    'timestamp',
    'confirmationCode',
    'supportUrl',
    'unsubscribeUrl',
  ],
})

export class NotificationTemplate {
  constructor({
    templateId,
    name,
    type,
    variables = [],
    language = 'en',
    subject,
    content,
    version = 1,
    metadata = {},
  }) {
    this.templateId = templateId
    this.name = name
    this.type = type
    this.variables = variables
    this.language = language
    this.subject = subject
    this.content = content
    this.version = version
    this.metadata = metadata
  }

  static fromJSON(json) {
    return new NotificationTemplate(json)
  }

  toJSON() {
    return {
      templateId: this.templateId,
      name: this.name,
      type: this.type,
      variables: this.variables,
      language: this.language,
      subject: this.subject,
      content: this.content,
      version: this.version,
      metadata: this.metadata,
    }
  }

  getRequiredVariables() {
    return this.variables.filter((v) => v.required !== false)
  }

  getOptionalVariables() {
    return this.variables.filter((v) => v.required === false)
  }
}

export const DEFAULT_TEMPLATES = Object.freeze([
  new NotificationTemplate({
    templateId: 'tpl_reservation_created',
    name: 'Reservation Created',
    type: NOTIFICATION_TEMPLATE_TYPES.RESERVATION_CREATED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.RESERVATION, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST, ...NOTIFICATION_TEMPLATE_VARIABLES.BUSINESS],
    language: 'en',
    subject: 'Reservation Confirmed - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nYour reservation has been created.\n\nProperty: {{propertyName}}\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\n\nConfirmation: {{confirmationCode}}',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_reservation_confirmed',
    name: 'Reservation Confirmed',
    type: NOTIFICATION_TEMPLATE_TYPES.RESERVATION_CONFIRMED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.RESERVATION, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST, ...NOTIFICATION_TEMPLATE_VARIABLES.BUSINESS],
    language: 'en',
    subject: 'Reservation Confirmed - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nYour reservation is confirmed!\n\nProperty: {{propertyName}}\nAddress: {{propertyAddress}}\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\n\nWe look forward to hosting you!',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_reservation_cancelled',
    name: 'Reservation Cancelled',
    type: NOTIFICATION_TEMPLATE_TYPES.RESERVATION_CANCELLED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.RESERVATION, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST],
    language: 'en',
    subject: 'Reservation Cancelled - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nYour reservation ({{confirmationCode}}) has been cancelled.\n\nIf you have questions, please contact support.',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_payment_received',
    name: 'Payment Received',
    type: NOTIFICATION_TEMPLATE_TYPES.PAYMENT_RECEIVED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.PAYMENT, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST],
    language: 'en',
    subject: 'Payment Received - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nWe have received your payment of {{amount}} {{currency}}.\n\nTransaction ID: {{transactionId}}\n\nThank you!',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_payment_failed',
    name: 'Payment Failed',
    type: NOTIFICATION_TEMPLATE_TYPES.PAYMENT_FAILED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.PAYMENT, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST],
    language: 'en',
    subject: 'Payment Failed - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nUnfortunately, your payment could not be processed.\n\nTransaction ID: {{transactionId}}\nAmount: {{amount}} {{currency}}\n\nPlease try again or contact support.',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_refund_completed',
    name: 'Refund Completed',
    type: NOTIFICATION_TEMPLATE_TYPES.REFUND_COMPLETED,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.PAYMENT, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST],
    language: 'en',
    subject: 'Refund Processed - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nYour refund of {{amount}} {{currency}} has been processed.\n\nTransaction ID: {{transactionId}}\n\nThe refund should appear in your account within 5-10 business days.',
    version: 1,
  }),
  new NotificationTemplate({
    templateId: 'tpl_reminder_before_checkin',
    name: 'Reminder Before Check-in',
    type: NOTIFICATION_TEMPLATE_TYPES.REMINDER_BEFORE_CHECKIN,
    variables: [...NOTIFICATION_TEMPLATE_VARIABLES.RESERVATION, ...NOTIFICATION_TEMPLATE_VARIABLES.GUEST, ...NOTIFICATION_TEMPLATE_VARIABLES.BUSINESS],
    language: 'en',
    subject: 'Check-in Reminder - {{confirmationCode}}',
    content: 'Dear {{firstName}},\n\nYour check-in is coming up!\n\nProperty: {{propertyName}}\nAddress: {{propertyAddress}}\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\n\nWe look forward to seeing you!',
    version: 1,
  }),
])

export function getTemplateById(templateId) {
  return DEFAULT_TEMPLATES.find((t) => t.templateId === templateId) || null
}

export function getTemplatesByType(type) {
  return DEFAULT_TEMPLATES.filter((t) => t.type === type)
}

export function getTemplatesByLanguage(language) {
  return DEFAULT_TEMPLATES.filter((t) => t.language === language)
}
