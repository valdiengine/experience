/**
 * SEO Intelligence Manager — Orchestrates all SEO analysis sub-modules
 *
 * Business-agnostic: coordinates content, metadata, schema, keyword analysis
 * Consumes normalized CMS data only — never touches WordPress directly
 */
import { ContentAnalyzer } from './analysis/content.analyzer.js'
import { MetadataAnalyzer } from './analysis/metadata.analyzer.js'
import { SchemaAnalyzer } from './analysis/schema.analyzer.js'
import { KeywordAnalyzer } from './analysis/keyword.analyzer.js'
import { SEO_INTELLIGENCE_EVENTS } from './seo-intelligence.events.js'
import { SEO_SCORE_THRESHOLDS } from './seo-intelligence.schema.js'

export class SEOIntelligenceManager {
  #context = null
  #contentAnalyzer = null
  #metadataAnalyzer = null
  #schemaAnalyzer = null
  #keywordAnalyzer = null
  #analysisCache = new Map()

  constructor(context) {
    this.#context = context
    this.#contentAnalyzer = new ContentAnalyzer(context)
    this.#metadataAnalyzer = new MetadataAnalyzer(context)
    this.#schemaAnalyzer = new SchemaAnalyzer(context)
    this.#keywordAnalyzer = new KeywordAnalyzer(context)
  }

  /**
   * Analyze tenant SEO health
   * @param {string} tenantId
   * @returns {object} - { score, issues, opportunities, recommendations }
   */
  async analyzeTenant(tenantId) {
    this.#context?.eventBus?.emit(SEO_INTELLIGENCE_EVENTS.ANALYSIS_STARTED, { tenantId })

    const pages = await this.#getNormalizedPages(tenantId)
    const tenant = this.#getTenant(tenantId)

    const issues = []
    const allOpportunities = []

    issues.push(...this.#contentAnalyzer.analyze(pages))
    issues.push(...this.#metadataAnalyzer.analyze(pages))
    issues.push(...this.#schemaAnalyzer.analyze(pages, tenant))

    const keywordAnalysis = this.#keywordAnalyzer.analyze(pages)
    allOpportunities.push(...keywordAnalysis.opportunities)

    pages.forEach(page => {
      const pageOpps = this.#keywordAnalyzer.analyzePage(page, pages)
      allOpportunities.push(...pageOpps)
    })

    const recommendations = this.#generateRecommendations(issues, allOpportunities)
    const score = this.#calculateScore(issues, pages.length)

    const result = {
      tenantId,
      score,
      pages: pages.length,
      issues,
      opportunities: allOpportunities,
      recommendations,
      analyzedAt: new Date().toISOString(),
    }

    this.#analysisCache.set(tenantId, result)
    this.#context?.eventBus?.emit(SEO_INTELLIGENCE_EVENTS.ANALYSIS_COMPLETED, {
      tenantId,
      score,
      issueCount: issues.length,
      opportunityCount: allOpportunities.length,
    })

    return result
  }

  /**
   * Analyze a single page
   * @param {string} pageId
   * @param {string} tenantId
   * @returns {object}
   */
  async analyzePage(pageId, tenantId) {
    const pages = await this.#getNormalizedPages(tenantId)
    const page = pages.find(p => p.id === pageId)
    if (!page) return null

    const issues = []
    issues.push(...this.#contentAnalyzer.analyze([page]))
    issues.push(...this.#metadataAnalyzer.analyze([page]))

    const opportunities = this.#keywordAnalyzer.analyzePage(page, pages)

    return { pageId, issues, opportunities }
  }

  /**
   * Get cached analysis for a tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  getCachedAnalysis(tenantId) {
    return this.#analysisCache.get(tenantId) || null
  }

  /**
   * Get score label
   * @param {number} score
   * @returns {string}
   */
  getScoreLabel(score) {
    if (score >= SEO_SCORE_THRESHOLDS.EXCELLENT) return 'Excellent'
    if (score >= SEO_SCORE_THRESHOLDS.GOOD) return 'Good'
    if (score >= SEO_SCORE_THRESHOLDS.NEEDS_WORK) return 'Needs Work'
    return 'Poor'
  }

  /**
   * Get content analyzer
   * @returns {ContentAnalyzer}
   */
  getContentAnalyzer() {
    return this.#contentAnalyzer
  }

  /**
   * Get metadata analyzer
   * @returns {MetadataAnalyzer}
   */
  getMetadataAnalyzer() {
    return this.#metadataAnalyzer
  }

  /**
   * Get schema analyzer
   * @returns {SchemaAnalyzer}
   */
  getSchemaAnalyzer() {
    return this.#schemaAnalyzer
  }

  /**
   * Get keyword analyzer
   * @returns {KeywordAnalyzer}
   */
  getKeywordAnalyzer() {
    return this.#keywordAnalyzer
  }

  // ── Private ──

  async #getNormalizedPages(tenantId) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (cms?.getNormalizedPages) {
      return cms.getNormalizedPages(tenantId)
    }
    if (cms?.getAll) {
      return cms.getAll().map(p => this.#normalizePage(p, tenantId))
    }
    return []
  }

  #normalizePage(page, tenantId) {
    return {
      id: page.id,
      tenantId,
      type: page.type || 'page',
      title: page.title || page.name || '',
      slug: page.slug || '',
      content: page.content || page.body || '',
      sections: page.sections || [],
      seo: page.seo || {},
      images: page.images || [],
      status: page.status || 'published',
    }
  }

  #getTenant(tenantId) {
    return this.#context?.tenant || {}
  }

  #calculateScore(issues, pageCount) {
    if (pageCount === 0) return 0

    let deductions = 0
    issues.forEach(issue => {
      if (issue.severity === 'critical') deductions += 15
      else if (issue.severity === 'warning') deductions += 5
      else deductions += 1
    })

    const avgDeductions = deductions / pageCount
    const score = Math.max(0, Math.min(100, Math.round(100 - avgDeductions * 2)))

    return score
  }

  #generateRecommendations(issues, opportunities) {
    const recommendations = []
    const issuesByType = {}

    issues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = []
      issuesByType[issue.type].push(issue)
    })

    Object.entries(issuesByType).forEach(([type, typeIssues]) => {
      if (typeIssues.length > 0) {
        recommendations.push({
          category: type,
          title: this.#getRecommendationTitle(type),
          description: this.#getRecommendationDescription(type, typeIssues.length),
          priority: typeIssues[0].severity === 'critical' ? 'high' : 'medium',
          pages: typeIssues.map(i => i.pageId),
        })
      }
    })

    const highImpactOpps = opportunities.filter(o => o.impact === 'high')
    if (highImpactOpps.length > 0) {
      recommendations.push({
        category: 'high_impact_opportunities',
        title: 'High-impact opportunities available',
        description: `${highImpactOpps.length} high-impact opportunities found`,
        priority: 'high',
      })
    }

    return recommendations
  }

  #getRecommendationTitle(type) {
    const titles = {
      missing_title: 'Add page titles',
      missing_description: 'Add meta descriptions',
      missing_canonical: 'Set canonical URLs',
      missing_og: 'Add Open Graph metadata',
      missing_twitter: 'Add Twitter Card metadata',
      missing_schema: 'Add structured data (JSON-LD)',
      thin_content: 'Expand page content',
      duplicate_content: 'Resolve duplicate content',
      missing_sections: 'Add page sections',
      missing_alt: 'Add image alt text',
      content_stale: 'Update stale content',
    }
    return titles[type] || `Fix ${type.replace(/_/g, ' ')} issues`
  }

  #getRecommendationDescription(type, count) {
    return `${count} page${count > 1 ? 's' : ''} affected by ${type.replace(/_/g, ' ')}`
  }
}
