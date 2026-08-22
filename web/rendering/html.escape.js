/**
 * HTML Escape Utilities
 *
 * Safe HTML escaping for template rendering.
 * Protects against XSS when inserting dynamic data.
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

const HTML_ESCAPE_REGEX = /[&<>"'`=]/g

export function escapeHtml(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char)
}

export function escapeHtmlAttr(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char)
}

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'vbs:']

export function escapeUrl(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  const lower = str.toLowerCase().trim()
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return ''
    }
  }
  return str
}

export function escapeAttr(str) {
  return escapeHtmlAttr(str)
}

export function escapeScript(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str.replace(/<\/script/gi, '<\\/script')
}

export default {
  escapeHtml,
  escapeHtmlAttr,
  escapeUrl,
  escapeAttr,
  escapeScript
}
