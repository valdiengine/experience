/**
 * Media CDN Layer
 *
 * P12.3.2.3 — Media Processing Engine
 *
 * Abstraction layer for CDN providers.
 * BusinessService never knows which CDN is active.
 *
 * Supported providers:
 * - Cloudflare Images
 * - Cloudflare Stream
 * - Cloudflare CDN
 * - AWS CloudFront
 * - R2 Public
 * - Future providers
 */

import { MediaCDNError } from '../media.errors.js'

export class MediaCDNLayer {
  constructor(config = {}) {
    this.config = config
    this.provider = null
    this.providers = {
      cloudflare: () => this.initCloudflare(),
      cloudfront: () => this.initCloudFront(),
      r2public: () => this.initR2Public(),
      none: () => ({ available: true }),
    }
  }

  async initCloudflare() {
    try {
      const { default: cloudflare } = await import('cloudflare')

      this.cf = new cloudflare({
        apiToken: this.config.cloudflare?.apiToken,
      })

      this.provider = 'cloudflare'
      return { available: true, provider: 'cloudflare' }
    } catch (error) {
      console.warn('[CDNLayer] Cloudflare not available:', error.message)
      return { available: false, error: error.message }
    }
  }

  async initCloudFront() {
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-cloudfront')

      this.cloudfront = new S3Client({
        region: this.config.cloudfront?.region || 'us-east-1',
      })

      this.cfSigner = await import('@aws-sdk/cloudfront-signer')
      this.provider = 'cloudfront'
      return { available: true, provider: 'cloudfront' }
    } catch (error) {
      console.warn('[CDNLayer] CloudFront not available:', error.message)
      return { available: false, error: error.message }
    }
  }

  async initR2Public() {
    this.provider = 'r2public'
    return { available: true, provider: 'r2public' }
  }

  isConfigured() {
    return this.config.enabled && this.provider !== null
  }

  async getUrl(originalUrl, options = {}) {
    if (!this.isConfigured()) {
      return originalUrl
    }

    switch (this.provider) {
      case 'cloudflare':
        return this.getCloudflareUrl(originalUrl, options)
      case 'cloudfront':
        return this.getCloudFrontUrl(originalUrl, options)
      case 'r2public':
        return this.getR2PublicUrl(originalUrl, options)
      default:
        return originalUrl
    }
  }

  getCloudflareUrl(originalUrl, options = {}) {
    const { accountId, distribution } = this.config.cloudflare || {}

    if (!accountId) {
      return originalUrl
    }

    const baseUrl = `https://${distribution || 'media'}.cdn.cloudflare.net`

    if (originalUrl.startsWith('http')) {
      const url = new URL(originalUrl)
      return `${baseUrl}${url.pathname}`
    }

    return `${baseUrl}/${originalUrl}`
  }

  getCloudFrontUrl(originalUrl, options = {}) {
    const { distributionDomain, keyPairId, privateKey } = this.config.cloudfront || {}

    if (!distributionDomain) {
      return originalUrl
    }

    let cdnUrl = `https://${distributionDomain}`

    if (originalUrl.startsWith('http')) {
      const url = new URL(originalUrl)
      cdnUrl += url.pathname
    } else {
      cdnUrl += `/${originalUrl}`
    }

    if (options.signed && privateKey && keyPairId) {
      const signedUrl = this.cfSigner.getSignedUrl({
        url: cdnUrl,
        keyPairId,
        privateKey,
        dateLessThan: options.expires || new Date(Date.now() + 3600000).toISOString(),
      })
      return signedUrl
    }

    return cdnUrl
  }

  getR2PublicUrl(originalUrl, options = {}) {
    const { accountId, bucket } = this.config.r2 || {}

    if (!accountId) {
      return originalUrl
    }

    const baseUrl = `https://${bucket}.${accountId}.r2.cloudflarestorage.com`

    if (originalUrl.startsWith('http')) {
      const url = new URL(originalUrl)
      return `${baseUrl}${url.pathname}`
    }

    return `${baseUrl}/${originalUrl}`
  }

  async uploadImage(imageBuffer, options = {}) {
    if (!this.isConfigured()) {
      throw new MediaCDNError('CDN not configured')
    }

    if (this.provider === 'cloudflare') {
      return this.uploadToCloudflare(imageBuffer, options)
    }

    throw new MediaCDNError(`Upload not supported for provider: ${this.provider}`)
  }

  async uploadToCloudflare(imageBuffer, options = {}) {
    const { accountId, imagesPrefix = '' } = this.config.cloudflare || {}

    if (!this.cf || !accountId) {
      throw new MediaCDNError('Cloudflare not properly configured')
    }

    const imageId = options.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
      const result = await this.cf.images.upload({
        accountId,
        file: imageBuffer,
        metadata: options.metadata || {},
        id: imageId,
      })

      return {
        cdnUrl: result.result.variants?.[0] || result.result.url,
        id: imageId,
      }
    } catch (error) {
      throw new MediaCDNError(`Cloudflare upload failed: ${error.message}`, 'cloudflare')
    }
  }

  async purgeCache(urls = []) {
    if (!this.isConfigured()) {
      return { purged: false, message: 'CDN not configured' }
    }

    if (this.provider === 'cloudflare') {
      return this.purgeCloudflareCache(urls)
    }

    return { purged: false, message: `Purge not supported for: ${this.provider}` }
  }

  async purgeCloudflareCache(urls) {
    const { zoneId } = this.config.cloudflare || {}

    if (!this.cf || !zoneId) {
      throw new MediaCDNError('Cloudflare not properly configured for purging')
    }

    try {
      await this.cf.cache.purgeCache({
        zone_id: zoneId,
        files: urls,
      })

      return { purged: true, count: urls.length }
    } catch (error) {
      throw new MediaCDNError(`Cache purge failed: ${error.message}`, 'cloudflare')
    }
  }

  async healthCheck() {
    return {
      cdn: 'configured',
      provider: this.provider || 'none',
      enabled: this.config.enabled || false,
    }
  }

  static getSupportedProviders() {
    return ['cloudflare', 'cloudfront', 'r2public', 'none']
  }
}

export default MediaCDNLayer
