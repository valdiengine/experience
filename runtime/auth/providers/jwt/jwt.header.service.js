export class JwtHeaderService {
  #config = {}

  constructor(config = {}) {
    this.#config = {
      authorizationScheme: config.authorizationScheme || 'Bearer',
      apiKeyHeader: config.apiKeyHeader || 'X-Api-Key',
      tenantHeader: config.tenantHeader || 'X-Tenant-Id',
      destinationHeader: config.destinationHeader || 'X-Destination-Id',
      localeHeader: config.localeHeader || 'X-Locale',
      timezoneHeader: config.timezoneHeader || 'X-Timezone',
      correlationHeader: config.correlationHeader || 'X-Correlation-Id',
      ...config,
    }
  }

  extractToken(headers = {}) {
    const authHeader = headers.authorization || headers.Authorization || ''
    if (!authHeader) return null

    const parts = authHeader.split(' ')
    if (parts.length !== 2) return null
    if (parts[0] !== this.#config.authorizationScheme) return null

    return parts[1] || null
  }

  extractApiKey(headers = {}) {
    const headerName = this.#config.apiKeyHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractTenant(headers = {}) {
    const headerName = this.#config.tenantHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractDestination(headers = {}) {
    const headerName = this.#config.destinationHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractLocale(headers = {}) {
    const headerName = this.#config.localeHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractTimezone(headers = {}) {
    const headerName = this.#config.timezoneHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractCorrelationId(headers = {}) {
    const headerName = this.#config.correlationHeader
    return headers[headerName] || headers[headerName.toLowerCase()] || null
  }

  extractAll(headers = {}) {
    return {
      token: this.extractToken(headers),
      apiKey: this.extractApiKey(headers),
      tenant: this.extractTenant(headers),
      destination: this.extractDestination(headers),
      locale: this.extractLocale(headers),
      timezone: this.extractTimezone(headers),
      correlationId: this.extractCorrelationId(headers),
    }
  }

  createAuthorizationHeader(token) {
    return { Authorization: `${this.#config.authorizationScheme} ${token}` }
  }

  supports(feature) {
    const features = ['authorization', 'bearer', 'api-key', 'tenant', 'destination', 'locale', 'timezone', 'correlation-id', 'extract', 'create']
    return features.includes(feature)
  }
}

export default JwtHeaderService
