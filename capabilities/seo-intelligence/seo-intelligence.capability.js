/**
 * SEO Intelligence Capability — v1.0.0
 *
 * Business-agnostic SEO intelligence and content management layer
 * Analyzes tenant content, detects issues, finds opportunities
 *
 * Dependencies: cms, public, observability, intelligence
 */
import { BaseCapability } from '../core/base.capability.js'
import { SEOIntelligenceManager } from './seo-intelligence.manager.js'
import { SEO_INTELLIGENCE_EVENTS } from './seo-intelligence.events.js'

export class SEOIntelligenceCapability extends BaseCapability {
  static id = 'seo-intelligence'
  static name = 'SEO Intelligence'
  static version = '1.0.0'
  static dependencies = ['cms', 'public', 'observability', 'intelligence']

  #manager = null
  #initialized = false

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new SEOIntelligenceManager(context)
  }

  async activate() {
    this.#setupEventListeners()
    await super.activate()
  }

  async deactivate() {
    this.#removeEventListeners()
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  /**
   * Analyze tenant SEO health
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  async analyzeTenant(tenantId) {
    const result = await this.#manager.analyzeTenant(tenantId)
    this.#sendMetrics(tenantId, result)
    return result
  }

  /**
   * Analyze a single page
   * @param {string} pageId
   * @param {string} tenantId
   * @returns {Promise<object|null>}
   */
  async analyzePage(pageId, tenantId) {
    return this.#manager.analyzePage(pageId, tenantId)
  }

  /**
   * Get cached analysis
   * @param {string} tenantId
   * @returns {object|null}
   */
  getCachedAnalysis(tenantId) {
    return this.#manager.getCachedAnalysis(tenantId)
  }

  /**
   * Get score label
   * @param {number} score
   * @returns {string}
   */
  getScoreLabel(score) {
    return this.#manager.getScoreLabel(score)
  }

  /**
   * Get content analyzer
   * @returns {ContentAnalyzer}
   */
  getContentAnalyzer() {
    return this.#manager.getContentAnalyzer()
  }

  /**
   * Get metadata analyzer
   * @returns {MetadataAnalyzer}
   */
  getMetadataAnalyzer() {
    return this.#manager.getMetadataAnalyzer()
  }

  /**
   * Get schema analyzer
   * @returns {SchemaAnalyzer}
   */
  getSchemaAnalyzer() {
    return this.#manager.getSchemaAnalyzer()
  }

  /**
   * Get keyword analyzer
   * @returns {KeywordAnalyzer}
   */
  getKeywordAnalyzer() {
    return this.#manager.getKeywordAnalyzer()
  }

  // ── Private ──

  #setupEventListeners() {
    this.on('cms:content_updated', this.#onContentUpdated.bind(this))
    this.on('cms:content_published', this.#onContentPublished.bind(this))
  }

  #removeEventListeners() {
    this.off('cms:content_updated')
    this.off('cms:content_published')
  }

  async #onContentUpdated(data) {
    const tenantId = data?.tenantId || this.context?.tenant?.id
    if (tenantId) {
      await this.analyzeTenant(tenantId)
    }
  }

  async #onContentPublished(data) {
    const tenantId = data?.tenantId || this.context?.tenant?.id
    if (tenantId) {
      await this.analyzeTenant(tenantId)
    }
  }

  #sendMetrics(tenantId, result) {
    const obs = this.context?.capabilities?.get?.('observability')
    if (!obs?.recordMetric) return

    obs.recordMetric({
      tenantId,
      category: 'seo',
      type: 'gauge',
      name: 'seo_score',
      value: result.score,
    })

    obs.recordMetric({
      tenantId,
      category: 'seo',
      type: 'counter',
      name: 'indexed_pages',
      value: result.pages,
    })

    obs.recordMetric({
      tenantId,
      category: 'seo',
      type: 'counter',
      name: 'seo_issues',
      value: result.issues.length,
    })

    obs.recordMetric({
      tenantId,
      category: 'seo',
      type: 'counter',
      name: 'seo_opportunities',
      value: result.opportunities.length,
    })
  }
}
