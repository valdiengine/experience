/**
 * SEO Admin — SEO dashboard through SEO Intelligence Capability
 *
 * Business-agnostic: displays SEO score, issues, opportunities, recommendations
 */
import { ADMIN_EVENTS } from '../admin.events.js'

export class SEOAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get SEO dashboard data
   * @param {string} tenantId
   * @returns {object}
   */
  async getDashboard(tenantId) {
    const seoIntel = this.#context?.capabilities?.get?.('seo-intelligence')
    if (!seoIntel?.analyzeTenant) {
      return { score: 0, issues: [], opportunities: [], recommendations: [] }
    }

    const analysis = await seoIntel.analyzeTenant(tenantId)

    return {
      score: analysis.score,
      scoreLabel: seoIntel.getScoreLabel(analysis.score),
      pages: analysis.pages,
      issues: analysis.issues,
      opportunities: analysis.opportunities,
      recommendations: analysis.recommendations,
      analyzedAt: analysis.analyzedAt,
    }
  }

  /**
   * Get SEO score
   * @param {string} tenantId
   * @returns {number}
   */
  async getScore(tenantId) {
    const dashboard = await this.getDashboard(tenantId)
    return dashboard.score
  }

  /**
   * Get SEO issues
   * @param {string} tenantId
   * @param {string} severity - 'critical', 'warning', 'info'
   * @returns {object[]}
   */
  async getIssues(tenantId, severity) {
    const dashboard = await this.getDashboard(tenantId)
    if (severity) {
      return dashboard.issues.filter(i => i.severity === severity)
    }
    return dashboard.issues
  }

  /**
   * Get SEO opportunities
   * @param {string} tenantId
   * @returns {object[]}
   */
  async getOpportunities(tenantId) {
    const dashboard = await this.getDashboard(tenantId)
    return dashboard.opportunities
  }

  /**
   * Get SEO recommendations
   * @param {string} tenantId
   * @returns {object[]}
   */
  async getRecommendations(tenantId) {
    const dashboard = await this.getDashboard(tenantId)
    return dashboard.recommendations
  }

  /**
   * Analyze single page
   * @param {string} pageId
   * @param {string} tenantId
   * @returns {object}
   */
  async analyzePage(pageId, tenantId) {
    const seoIntel = this.#context?.capabilities?.get?.('seo-intelligence')
    if (!seoIntel?.analyzePage) return null
    return seoIntel.analyzePage(pageId, tenantId)
  }

  /**
   * Get cached analysis
   * @param {string} tenantId
   * @returns {object|null}
   */
  getCachedAnalysis(tenantId) {
    const seoIntel = this.#context?.capabilities?.get?.('seo-intelligence')
    if (!seoIntel?.getCachedAnalysis) return null
    return seoIntel.getCachedAnalysis(tenantId)
  }

  /**
   * Update page metadata
   * @param {string} pageId
   * @param {object} metadata - { title, description, ogTitle, ogDescription }
   * @returns {object}
   */
  async updateMetadata(pageId, metadata) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.update) {
      return { success: false, error: 'CMS capability not available' }
    }

    return cms.update(pageId, { seo: metadata })
  }

  /**
   * Get content quality report
   * @param {string} tenantId
   * @returns {object}
   */
  async getContentQualityReport(tenantId) {
    const dashboard = await this.getDashboard(tenantId)

    const issuesByType = {}
    dashboard.issues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = 0
      issuesByType[issue.type]++
    })

    return {
      score: dashboard.score,
      totalIssues: dashboard.issues.length,
      criticalIssues: dashboard.issues.filter(i => i.severity === 'critical').length,
      warnings: dashboard.issues.filter(i => i.severity === 'warning').length,
      info: dashboard.issues.filter(i => i.severity === 'info').length,
      issuesByType,
      opportunities: dashboard.opportunities.length,
      highImpactOpportunities: dashboard.opportunities.filter(o => o.impact === 'high').length,
    }
  }
}
