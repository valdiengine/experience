/**
 * Company Seed — Company Settings
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates default company settings for seeded companies.
 */

export const COMPANY_SETTINGS_SEED = [
  {
    companySlug: 'hospedaje-demo',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    currency: 'CLP',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    weekStartDay: 1,
    businessRules: {
      workingHours: {
        start: '08:00',
        end: '20:00',
      },
      workingDays: [1, 2, 3, 4, 5, 6, 7],
    },
    bookingRules: {
      minAdvanceHours: 24,
      maxAdvanceDays: 365,
      confirmationRequired: true,
      prepaymentRequired: false,
    },
    cancellationPolicy: {
      type: 'flexible',
      hoursBefore: 48,
      refundPercentage: 100,
    },
    paymentSettings: {
      acceptedMethods: ['cash', 'transfer', 'webpay'],
      currency: 'CLP',
    },
    notificationSettings: {
      emailConfirmation: true,
      emailReminder: true,
      smsConfirmation: false,
    },
  },
  {
    companySlug: 'hostal-patagonia-demo',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    currency: 'CLP',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    weekStartDay: 1,
    businessRules: {
      workingHours: {
        start: '07:00',
        end: '22:00',
      },
      workingDays: [1, 2, 3, 4, 5, 6, 7],
    },
    bookingRules: {
      minAdvanceHours: 12,
      maxAdvanceDays: 180,
      confirmationRequired: true,
      prepaymentRequired: true,
    },
    cancellationPolicy: {
      type: 'moderate',
      hoursBefore: 72,
      refundPercentage: 50,
    },
    paymentSettings: {
      acceptedMethods: ['cash', 'transfer', 'webpay'],
      currency: 'CLP',
    },
    notificationSettings: {
      emailConfirmation: true,
      emailReminder: true,
      smsConfirmation: false,
    },
  },
  {
    companySlug: 'cafe-cultural-demo',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    currency: 'CLP',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    weekStartDay: 1,
    businessRules: {
      workingHours: {
        start: '09:00',
        end: '21:00',
      },
      workingDays: [2, 3, 4, 5, 6, 7],
    },
    bookingRules: {
      minAdvanceHours: 2,
      maxAdvanceDays: 30,
      confirmationRequired: true,
      prepaymentRequired: false,
    },
    cancellationPolicy: {
      type: 'flexible',
      hoursBefore: 2,
      refundPercentage: 100,
    },
    paymentSettings: {
      acceptedMethods: ['cash', 'transfer'],
      currency: 'CLP',
    },
    notificationSettings: {
      emailConfirmation: true,
      emailReminder: false,
      smsConfirmation: false,
    },
  },
]

export default COMPANY_SETTINGS_SEED
