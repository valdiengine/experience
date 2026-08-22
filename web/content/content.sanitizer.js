/**
 * Content Sanitizer
 *
 * Sanitizes WordPress HTML content to prevent XSS.
 * WordPress content is treated as untrusted external content.
 * Framework-free implementation.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'img', 'picture',
  'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'sup', 'sub',
  'abbr', 'cite', 'data', 'time', 'mark'
]

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel', 'download'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'loading', 'srcset', 'sizes'],
  'picture': ['loading'],
  'source': ['src', 'srcset', 'sizes', 'type', 'media'],
  'div': ['id', 'class', 'role'],
  'section': ['id', 'class', 'role'],
  'article': ['id', 'class', 'role'],
  'aside': ['id', 'class', 'role'],
  'header': ['id', 'class', 'role'],
  'footer': ['id', 'class', 'role'],
  'nav': ['id', 'class', 'role', 'aria-label'],
  'main': ['id', 'class', 'role'],
  'figure': ['id', 'class'],
  'figcaption': ['id', 'class'],
  'table': ['id', 'class'],
  'thead': ['id', 'class'],
  'tbody': ['id', 'class'],
  'tfoot': ['id', 'class'],
  'tr': ['id', 'class'],
  'th': ['id', 'class', 'scope', 'colspan', 'rowspan'],
  'td': ['id', 'class', 'colspan', 'rowspan'],
  'ul': ['id', 'class', 'type'],
  'ol': ['id', 'class', 'type', 'start'],
  'li': ['id', 'class', 'value'],
  'blockquote': ['id', 'class'],
  'pre': ['id', 'class'],
  'code': ['id', 'class'],
  'abbr': ['id', 'class', 'title'],
  'data': ['id', 'class', 'value'],
  'time': ['id', 'class', 'datetime'],
  'mark': ['id', 'class'],
  'span': ['id', 'class'],
  'p': ['id', 'class'],
  'h1': ['id', 'class'],
  'h2': ['id', 'class'],
  'h3': ['id', 'class'],
  'h4': ['id', 'class'],
  'h5': ['id', 'class'],
  'h6': ['id', 'class']
}

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'vbs:']

export function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  const {
    allowedTags = ALLOWED_TAGS,
    allowedAttributes = ALLOWED_ATTRIBUTES,
    stripAllFormatting = false
  } = options

  let result = html

  result = stripComments(result)
  result = stripDangerousTags(result)
  result = sanitizeAttributes(result, allowedAttributes)
  result = sanitizeUrls(result)
  result = stripNonAllowedTags(result, allowedTags, stripAllFormatting)

  return result.trim()
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '')
}

function stripDangerousTags(html) {
  const dangerous = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea']
  let result = html

  for (const tag of dangerous) {
    const regex = new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi')
    result = result.replace(regex, '')
    const selfClosing = new RegExp(`<${tag}[\\s\\S]*/?>`, 'gi')
    result = result.replace(selfClosing, '')
  }

  return result
}

function sanitizeAttributes(html, allowedAttributes) {
  let result = html

  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')

  result = result.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '')

  return result
}

function sanitizeUrls(html) {
  let result = html

  for (const protocol of DANGEROUS_PROTOCOLS) {
    const hrefPattern = new RegExp(`href\\s*=\\s*["']?${protocol.replace(/:/g, '\\:')}`, 'gi')
    result = result.replace(hrefPattern, 'href="#"')
  }

  const srcPattern = /src\s*=\s*["']?(?!https?:\/\/|mailto:|tel:)([^"'\s>]+)/gi
  result = result.replace(srcPattern, 'src="#"')

  return result
}

function stripNonAllowedTags(html, allowedTags, stripAllFormatting) {
  if (stripAllFormatting) {
    return stripFormatting(html)
  }

  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
  let result = html
  const tagsToRemove = []

  let match
  while ((match = tagPattern.exec(html)) !== null) {
    const tagName = match[1].toLowerCase()
    if (!allowedTags.includes(tagName)) {
      tagsToRemove.push(match[0])
    }
  }

  for (const tag of tagsToRemove) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    result = result.replace(regex, '')
  }

  return result
}

function stripFormatting(html) {
  return html
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
}

export function validateMediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  try {
    const parsed = new URL(url)
    const validProtocols = ['https:']

    if (!validProtocols.includes(parsed.protocol)) {
      return null
    }

    const dangerousPatterns = ['javascript:', 'data:', 'vbscript:']
    for (const pattern of dangerousPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        return null
      }
    }

    return url
  } catch {
    return null
  }
}

export function validateCanonicalUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') {
    return null
  }

  try {
    if (url.startsWith('/')) {
      return url
    }

    const parsed = new URL(url)
    const base = new URL(baseUrl)

    if (parsed.origin !== base.origin) {
      return null
    }

    return parsed.pathname + parsed.search
  } catch {
    return null
  }
}

export function escapeHtmlEntities(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export default {
  sanitizeHtml,
  validateMediaUrl,
  validateCanonicalUrl,
  escapeHtmlEntities
}
