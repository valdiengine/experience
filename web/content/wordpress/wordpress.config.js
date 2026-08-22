/**
 * WordPress Configuration
 *
 * Environment-driven WordPress endpoint configuration for the Valdi Platform.
 * Each canonical destination can have its own WordPress instance.
 *
 * Environment Variables:
 *   WORDPRESS_VALDI_URL         - WordPress REST API URL for valdi.app
 *   WORDPRESS_VALDI_KEY         - API key for valdi WordPress
 *   WORDPRESS_NATALES_URL       - WordPress REST API URL for natale.app
 *   WORDPRESS_NATALES_KEY        - API key for natales WordPress
 *   WORDPRESS_PUNTAARENAS_URL    - WordPress REST API URL for puntaarenas.app
 *   WORDPRESS_PUNTAARENAS_KEY    - API key for puntaarenas WordPress
 *   WORDPRESS_COYHAIQUE_URL     - WordPress REST API URL for coyhaique.app
 *   WORDPRESS_COYHAIQUE_KEY      - API key for coyhaique WordPress
 *   WORDPRESS_CHILOE_URL        - WordPress REST API URL for chiloe.app
 *   WORDPRESS_CHILOE_KEY         - API key for chiloe WordPress
 *   WORDPRESS_TIMEOUT           - Request timeout in ms (default: 5000)
 *   WORDPRESS_RETRIES           - Number of retries (default: 1)
 *   WORDPRESS_CACHE_TTL         - Cache TTL in ms (default: 300000)
 *
 * Usage:
 *   Import this module to get the WordPress configuration for the server.
 *
 *   const config = getWordPressConfig()
 *   const server = createPublicWebServer({ wordpress: config })
 */

const DESTINATIONS = ['valdi', 'natales', 'puntaarenas', 'coyhaique', 'chiloe']

function getDestinationConfig(destination) {
  const url = process.env[`WORDPRESS_${destination.toUpperCase()}_URL`]
  const apiKey = process.env[`WORDPRESS_${destination.toUpperCase()}_KEY`]

  if (!url) {
    return null
  }

  return {
    endpoint: url.replace(/\/$/, ''),
    apiKey: apiKey || null,
    enabled: true,
    timeout: parseInt(process.env.WORDPRESS_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.WORDPRESS_RETRIES || '1', 10),
    cacheSize: 500,
    cacheTtl: parseInt(process.env.WORDPRESS_CACHE_TTL || '300000', 10)
  }
}

export function getWordPressConfig() {
  const config = {
    destinations: {}
  }

  let hasAnyDestination = false

  for (const destination of DESTINATIONS) {
    const destConfig = getDestinationConfig(destination)
    if (destConfig) {
      config.destinations[destination] = destConfig
      hasAnyDestination = true
    }
  }

  if (!hasAnyDestination) {
    return null
  }

  return config
}

export function getWordPressHealthStatus() {
  const status = {}

  for (const destination of DESTINATIONS) {
    const url = process.env[`WORDPRESS_${destination.toUpperCase()}_URL`]
    status[destination] = {
      configured: !!url,
      endpoint: url || null
    }
  }

  return status
}

export default {
  getWordPressConfig,
  getWordPressHealthStatus,
  DESTINATIONS
}
