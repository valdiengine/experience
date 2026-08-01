export const isRequired = (val) => val != null && val !== ''

export const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))

export const isURL = (val) => { try { new URL(val); return true } catch { return false } }

export const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val))

export const isNumeric = (val) => !isNaN(Number(val)) && isFinite(val)

export const minLength = (min) => (val) => String(val ?? '').length >= min

export const maxLength = (max) => (val) => String(val ?? '').length <= max

export const isOneOf = (allowed) => (val) => allowed.includes(val)

export const validate = (value, rules) => {
  for (const rule of rules) {
    const result = rule(value)
    if (result !== true) return result
  }
  return true
}
