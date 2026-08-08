/**
 * Product Resolver
 * 
 * Resolves incoming requests to product/destination context.
 * Supports multiple resolution strategies: hostname, subdomain, path, query, header.
 */

import { ProductResolutionError } from '../experience.errors.js'

export class ProductResolver {
  #config = null
  #registry = null
  #strategies = []

  constructor(config = {}) {
    this.#config = {
      defaultPlatform: 'valdi',
      defaultCountry: 'cl',
      strategies: ['subdomain', 'hostname', 'path', 'query', 'header'],
      ...config
    }
    this.#registry = new Map()
  }

  get name() {
    return 'product'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    await this.loadRegistry()
    this.#initializeStrategies()
    return true
  }

  async loadRegistry() {
    this.#registry.clear()
    
    this.#registry.set('valdi', {
      platform: 'valdi',
      country: 'cl',
      region: 'los-rios',
      destination: 'valdi',
      domain: 'valdi.app'
    })

    this.#registry.set('natales', {
      platform: 'valdi',
      country: 'cl',
      region: 'magallanes',
      destination: 'natales',
      domain: 'natales.app'
    })

    this.#registry.set('puntaarenas', {
      platform: 'valdi',
      country: 'cl',
      region: 'magallanes',
      destination: 'puntaarenas',
      domain: 'puntaarenas.app'
    })

    this.#registry.set('chiloe', {
      platform: 'valdi',
      country: 'cl',
      region: 'los-lagos',
      destination: 'chiloe',
      domain: 'chiloe.app'
    })

    this.#registry.set('coyhaique', {
      platform: 'valdi',
      country: 'cl',
      region: 'aysen',
      destination: 'coyhaique',
      domain: 'coyhaique.app'
    })
  }

  #initializeStrategies() {
    this.#strategies = []

    if (this.#config.strategies.includes('subdomain')) {
      this.#strategies.push({
        name: 'subdomain',
        priority: 1,
        resolve: (request) => this.#resolveBySubdomain(request)
      })
    }

    if (this.#config.strategies.includes('hostname')) {
      this.#strategies.push({
        name: 'hostname',
        priority: 2,
        resolve: (request) => this.#resolveByHostname(request)
      })
    }

    if (this.#config.strategies.includes('path')) {
      this.#strategies.push({
        name: 'path',
        priority: 3,
        resolve: (request) => this.#resolveByPath(request)
      })
    }

    if (this.#config.strategies.includes('query')) {
      this.#strategies.push({
        name: 'query',
        priority: 4,
        resolve: (request) => this.#resolveByQuery(request)
      })
    }

    if (this.#config.strategies.includes('header')) {
      this.#strategies.push({
        name: 'header',
        priority: 5,
        resolve: (request) => this.#resolveByHeader(request)
      })
    }

    this.#strategies.sort((a, b) => a.priority - b.priority)
  }

  async resolve(request) {
    if (!request || typeof request !== 'object') {
      throw new ProductResolutionError('Invalid request', { request })
    }

    for (const strategy of this.#strategies) {
      try {
        const context = await strategy.resolve(request)
        if (context && context.destination) {
          return {
            ...context,
            resolutionStrategy: strategy.name,
            resolvedAt: new Date().toISOString(),
            platform: context.platform || this.#config.defaultPlatform,
            request: {
              hostname: request.hostname || request.domain,
              path: request.path || request.url,
              query: request.query,
              headers: request.headers,
              subdomain: request.subdomain
            }
          }
        }
      } catch (error) {
        continue
      }
    }

    return this.#getDefaultContext()
  }

  #resolveBySubdomain(request) {
    const hostname = request.hostname || request.domain || ''
    const parts = hostname.split('.')

    if (parts.length >= 3) {
      const subdomain = parts[0]
      const domain = parts.slice(1).join('.')
      
      if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'admin') {
        const resolved = this.#registry.get(subdomain)
        if (resolved) {
          return {
            ...resolved,
            subdomain,
            domain: hostname
          }
        }

        return {
          platform: this.#config.defaultPlatform,
          country: this.#config.defaultCountry,
          subdomain,
          domain: hostname,
          destination: subdomain,
          company: subdomain
        }
      }
    }

    return null
  }

  #resolveByHostname(request) {
    const hostname = request.hostname || request.domain || ''
    
    for (const [key, context] of this.#registry) {
      if (hostname.includes(context.domain) || hostname.includes(key)) {
        return {
          ...context,
          domain: hostname
        }
      }
    }

    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return {
        platform: this.#config.defaultPlatform,
        country: this.#config.defaultCountry,
        destination: 'valdi',
        domain: hostname
      }
    }

    return null
  }

  #resolveByPath(request) {
    const path = request.path || request.url || ''
    
    const match = path.match(/^\/([a-z]{2})\/([\w-]+)\/([\w-]+)/)
    
    if (match) {
      const [, country, region, destination] = match
      return {
        platform: this.#config.defaultPlatform,
        country,
        region,
        destination,
        pathPrefix: path
      }
    }

    return null
  }

  #resolveByQuery(request) {
    const query = request.query || {}
    
    if (query.ecosystem) {
      const parts = query.ecosystem.split('-')
      if (parts.length >= 2) {
        return {
          platform: this.#config.defaultPlatform,
          country: parts[0] || this.#config.defaultCountry,
          region: parts[1],
          destination: parts[2],
          company: parts[3],
          ecosystem: query.ecosystem
        }
      }
    }

    if (query.destination) {
      return {
        platform: this.#config.defaultPlatform,
        destination: query.destination,
        country: query.country || this.#config.defaultCountry
      }
    }

    return null
  }

  #resolveByHeader(request) {
    const headers = request.headers || {}
    
    const ecosystemHeader = headers['x-ecosystem'] || headers['x-destination']
    if (ecosystemHeader) {
      const parts = ecosystemHeader.split('-')
      if (parts.length >= 2) {
        return {
          platform: this.#config.defaultPlatform,
          country: parts[0] || this.#config.defaultCountry,
          region: parts[1],
          destination: parts[2],
          company: parts[3]
        }
      }
    }

    return null
  }

  #getDefaultContext() {
    return {
      platform: this.#config.defaultPlatform,
      country: this.#config.defaultCountry,
      region: 'los-rios',
      destination: 'valdi',
      resolutionStrategy: 'default',
      resolvedAt: new Date().toISOString()
    }
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'ProductResolver',
      strategies: this.#strategies.map(s => s.name),
      registrySize: this.#registry.size
    }
  }

  async stop() {
    this.#registry.clear()
    return true
  }

  registerProduct(id, context) {
    this.#registry.set(id, context)
  }

  getRegistry() {
    return new Map(this.#registry)
  }
}

export default ProductResolver
