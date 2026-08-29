/**
 * Document Template
 *
 * Base HTML document template.
 * Framework-free SSR template following P15.4.0 validated architecture.
 * Includes JSON-LD structured data support.
 */

import { escapeHtml, escapeAttr, escapeScript, escapeUrl } from '../rendering/html.escape.js'

export function renderDocument(options = {}) {
  const {
    title = '',
    description = '',
    language = 'es-CL',
    canonical = '',
    robots = 'index, follow',
    og = {},
    twitter = {},
    jsonLd = [],
    head = '',
    body = '',
    styles = '',
    scripts = '',
    favicon = null,
    manifest = '/manifest.json',
    appleTouchIcon = null,
    themeColor = null,
    appleWebApp = null
  } = options

  const escapedTitle = escapeHtml(title)
  const escapedDescription = escapeHtml(description)
  const escapedCanonical = escapeUrl(canonical) || canonical
  const escapedThemeColor = escapeHtml(themeColor) || themeColor

  const ogTags = renderOgTags(og)
  const twitterTags = renderTwitterTags(twitter)
  const metaTags = renderMetaTags(escapedTitle, escapedDescription, robots)
  const jsonLdScripts = renderJsonLd(jsonLd)
  const visualIdentityTags = renderVisualIdentityTags(favicon, appleTouchIcon, themeColor, appleWebApp)

  return `<!DOCTYPE html>
<html lang="${escapeAttr(language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${metaTags}
  ${ogTags}
  ${twitterTags}
  ${jsonLdScripts}
  <link rel="canonical" href="${escapedCanonical}">
  ${visualIdentityTags}
  <link rel="manifest" href="${escapeAttr(manifest)}">
  ${styles}
  ${head}
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ${body}
  ${scripts}
</body>
</html>`
}

function renderMetaTags(title, description, robots) {
  let tags = ''
  if (title) {
    tags += `  <title>${title}</title>\n`
  }
  if (description) {
    tags += `  <meta name="description" content="${description}">\n`
  }
  if (robots) {
    tags += `  <meta name="robots" content="${escapeAttr(robots)}">\n`
  }
  return tags.trim()
}

function renderOgTags(og = {}) {
  if (!og.title && !og.description && !og.image) {
    return ''
  }

  let tags = ''
  tags += `  <meta property="og:type" content="${escapeAttr(og.type || 'website')}">\n`
  if (og.title) {
    tags += `  <meta property="og:title" content="${escapeHtml(og.title)}">\n`
  }
  if (og.description) {
    tags += `  <meta property="og:description" content="${escapeHtml(og.description)}">\n`
  }
  if (og.image) {
    tags += `  <meta property="og:image" content="${escapeUrl(og.image) || og.image}">\n`
  }
  if (og.url) {
    tags += `  <meta property="og:url" content="${escapeUrl(og.url) || og.url}">\n`
  }
  if (og.siteName) {
    tags += `  <meta property="og:site_name" content="${escapeHtml(og.siteName)}">\n`
  }
  if (og.locale) {
    tags += `  <meta property="og:locale" content="${escapeAttr(og.locale)}">\n`
  }

  return tags.trim()
}

function renderTwitterTags(twitter = {}) {
  if (!twitter.card && !twitter.title && !twitter.description && !twitter.image) {
    return ''
  }

  let tags = ''
  if (twitter.card) {
    tags += `  <meta name="twitter:card" content="${escapeAttr(twitter.card)}">\n`
  }
  if (twitter.title) {
    tags += `  <meta name="twitter:title" content="${escapeHtml(twitter.title)}">\n`
  }
  if (twitter.description) {
    tags += `  <meta name="twitter:description" content="${escapeHtml(twitter.description)}">\n`
  }
  if (twitter.image) {
    tags += `  <meta name="twitter:image" content="${escapeUrl(twitter.image) || twitter.image}">\n`
  }
  if (twitter.site) {
    tags += `  <meta name="twitter:site" content="${escapeAttr(twitter.site)}">\n`
  }

  return tags.trim()
}

function renderJsonLd(jsonLdArray = []) {
  if (jsonLdArray.length === 0) {
    return ''
  }

  let scripts = ''
  for (const schema of jsonLdArray) {
    const safeJson = escapeScript(JSON.stringify(schema))
    scripts += `  <script type="application/ld+json">${safeJson}</script>\n`
  }
  return scripts.trim()
}

export function createOrganizationSchema(name, url, logo, contactInfo = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: escapeHtml(name),
    url: escapeUrl(url) || url,
    ...(logo && { logo: escapeUrl(logo) || logo }),
    ...(contactInfo.email && { email: escapeHtml(contactInfo.email) }),
    ...(contactInfo.phone && { telephone: escapeHtml(contactInfo.phone) }),
    ...(contactInfo.address && {
      address: {
        '@type': 'PostalAddress',
        ...contactInfo.address
      }
    })
  }
}

export function createWebSiteSchema(name, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: escapeHtml(name),
    url: escapeUrl(url) || url
  }
}

export function createBreadcrumbList(items = []) {
  if (items.length === 0) return null

  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: escapeHtml(item.name),
    ...(item.url && { item: escapeUrl(item.url) || item.url })
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement
  }
}

function renderVisualIdentityTags(favicon, appleTouchIcon, themeColor, appleWebApp) {
  let tags = ''

  const safeFavicon = escapeUrl(favicon)
  if (safeFavicon) {
    tags += `  <link rel="icon" type="image/x-icon" href="${safeFavicon}">\n`
  }

  const safeAppleTouchIcon = escapeUrl(appleTouchIcon)
  if (safeAppleTouchIcon) {
    tags += `  <link rel="apple-touch-icon" href="${safeAppleTouchIcon}">\n`
  }

  if (themeColor) {
    tags += `  <meta name="theme-color" content="${escapeHtml(themeColor)}">\n`
  }

  if (appleWebApp && appleWebApp.capable) {
    tags += `  <meta name="apple-mobile-web-app-capable" content="yes">\n`
    if (appleWebApp.title) {
      tags += `  <meta name="apple-mobile-web-app-title" content="${escapeHtml(appleWebApp.title)}">\n`
    }
    if (appleWebApp.statusBarStyle) {
      tags += `  <meta name="apple-mobile-web-app-status-bar-style" content="${escapeHtml(appleWebApp.statusBarStyle)}">\n`
    }
  }

  return tags
}

export default { renderDocument, createOrganizationSchema, createWebSiteSchema, createBreadcrumbList }
