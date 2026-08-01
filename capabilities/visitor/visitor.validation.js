import { VisitorValidationError } from './visitor.errors.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/
const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/
const ISO_LANGUAGE_REGEX = /^[a-z]{2,3}$/
const ISO_CURRENCY_REGEX = /^[A-Z]{3}$/

export function validateEmail(email) {
  if (email && !EMAIL_REGEX.test(email)) {
    throw new VisitorValidationError(`Invalid email: ${email}`)
  }
  return true
}

export function validatePhone(phone) {
  if (phone && !PHONE_REGEX.test(phone)) {
    throw new VisitorValidationError(`Invalid phone number: ${phone}`)
  }
  return true
}

export function validateCountry(country) {
  if (country && !ISO_COUNTRY_REGEX.test(country)) {
    throw new VisitorValidationError(`Invalid country code: ${country}`)
  }
  return true
}

export function validateLanguage(language) {
  if (language && !ISO_LANGUAGE_REGEX.test(language)) {
    throw new VisitorValidationError(`Invalid language code: ${language}`)
  }
  return true
}

export function validateCurrency(currency) {
  if (currency && !ISO_CURRENCY_REGEX.test(currency)) {
    throw new VisitorValidationError(`Invalid currency code: ${currency}`)
  }
  return true
}

export async function validateDuplicateVisitor(data, repo, excludeId) {
  if (!repo) return

  if (data.profile?.email) {
    const filter = { 'profile.email': data.profile.email }
    if (excludeId) filter.id = { ne: excludeId }
    const existing = await repo.findOne(filter)
    if (existing) {
      throw new VisitorValidationError(`Visitor with email '${data.profile.email}' already exists`)
    }
  }

  if (data.profile?.phone) {
    const filter = { 'profile.phone': data.profile.phone }
    if (excludeId) filter.id = { ne: excludeId }
    const existing = await repo.findOne(filter)
    if (existing) {
      throw new VisitorValidationError(`Visitor with phone '${data.profile.phone}' already exists`)
    }
  }
}

export function validateIdentityConsistency(data, identity) {
  if (!identity) return true
  if (data.identityId && data.identityId !== identity.id) {
    throw new VisitorValidationError('Identity id mismatch')
  }
  if (data.identityProvider && data.identityProvider !== identity.provider) {
    throw new VisitorValidationError('Identity provider mismatch')
  }
  return true
}

export function validateTenantAndDestination(data) {
  if (!data.tenantId) {
    throw new VisitorValidationError('tenantId is required')
  }
  return true
}

export function validateMarketingConsent(marketing) {
  if (!marketing) return true
  if (marketing.consent && (!marketing.channels || marketing.channels.length === 0)) {
    throw new VisitorValidationError('Marketing consent requires at least one channel')
  }
  const validChannels = ['email', 'sms', 'push', 'whatsapp', 'messenger']
  if (marketing.channels) {
    for (const channel of marketing.channels) {
      if (!validChannels.includes(channel)) {
        throw new VisitorValidationError(`Invalid marketing channel: ${channel}`)
      }
    }
  }
  return true
}

export function validateCreateData(data) {
  const errors = []

  if (!data.tenantId) {
    errors.push('tenantId is required')
  }

  if (data.profile?.email) {
    try { validateEmail(data.profile.email) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.phone) {
    try { validatePhone(data.profile.phone) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.country) {
    try { validateCountry(data.profile.country) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.language) {
    try { validateLanguage(data.profile.language) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.currency) {
    try { validateCurrency(data.profile.currency) } catch (e) { errors.push(e.message) }
  }

  if (data.preferences?.language) {
    try { validateLanguage(data.preferences.language) } catch (e) { errors.push(e.message) }
  }

  if (data.preferences?.currency) {
    try { validateCurrency(data.preferences.currency) } catch (e) { errors.push(e.message) }
  }

  try { validateMarketingConsent(data.marketing) } catch (e) { errors.push(e.message) }

  if (errors.length > 0) {
    throw new VisitorValidationError('Validation failed', { errors })
  }

  return true
}

export function validateUpdateData(data) {
  const errors = []

  if (data.profile?.email) {
    try { validateEmail(data.profile.email) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.phone) {
    try { validatePhone(data.profile.phone) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.country) {
    try { validateCountry(data.profile.country) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.language) {
    try { validateLanguage(data.profile.language) } catch (e) { errors.push(e.message) }
  }

  if (data.profile?.currency) {
    try { validateCurrency(data.profile.currency) } catch (e) { errors.push(e.message) }
  }

  if (data.preferences?.language) {
    try { validateLanguage(data.preferences.language) } catch (e) { errors.push(e.message) }
  }

  if (data.preferences?.currency) {
    try { validateCurrency(data.preferences.currency) } catch (e) { errors.push(e.message) }
  }

  try { validateMarketingConsent(data.marketing) } catch (e) { errors.push(e.message) }

  if (errors.length > 0) {
    throw new VisitorValidationError('Validation failed', { errors })
  }

  return true
}
