/**
 * Billing Configuration — defaults, periods, grace, retry
 *
 * Business-agnostic: no hardcoded provider logic
 */

export const BILLING_CONFIG = {
  defaultCurrency: 'CLP',
  billingPeriods: ['monthly', 'yearly'],
  gracePeriodDays: 3,
  retryPolicy: {
    maxAttempts: 3,
    delayMs: 5000,
    backoffMultiplier: 2,
  },
  invoiceDefaults: {
    draftTTL: 86400000,
    pendingTTL: 604800000,
  },
  paymentDefaults: {
    timeout: 300000,
    pollingInterval: 5000,
  },
}

export const CURRENCIES = {
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimals: 2 },
}

export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}
