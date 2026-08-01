/**
 * Link Recommendation — Suggests internal linking opportunities
 *
 * Business-agnostic: recommends links based on content similarity, not business rules
 * Works for any tenant type: accommodation, tourism, restaurant, service
 */
import { SEO_OPPORTUNITY_TYPE } from '../../seo-intelligence.schema.js'

export class LinkRecommendation {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Generate link recommendations for a tenant
   * @param {object[]} pages - Normalized pages
   * @param {object} linkAnalysis - From LinkAnalyzer.analyze()
   * @returns {object[]}
   */
  generate(pages, linkAnalysis) {
    const recommendations = []

    recommendations.push(...this.#recommendForOrphanPages(pages, linkAnalysis.orphanPages))
    recommendations.push(...this.#recommendForLowLinkPages(pages, linkAnalysis))
    recommendations.push(...this.#recommendByTopic(pages))

    return recommendations
  }

  /**
   * Generate link recommendations for a specific page
   * @param {string} pageId
   * @param {object[]} pages
   * @returns {object[]}
   */
  generateForPage(pageId, pages) {
    const page = pages.find(p => p.id === pageId)
    if (!page) return []

    const recommendations = []
    const relatedPages = this.#findRelatedPages(page, pages)

    relatedPages.forEach(related => {
      recommendations.push({
        pageId: page.id,
        type: SEO_OPPORTUNITY_TYPE.INTERNAL_LINKING,
        title: `Link to "${related.title}"`,
        description: `This page is relevant to your content. Consider adding a link.`,
        impact: related.relevance > 0.7 ? 'high' : 'medium',
        targetPageId: related.id,
        targetSlug: related.slug,
      })
    })

    return recommendations
  }

  /**
   * Get contextual link suggestions based on content
   * @param {object} page
   * @param {object[]} pages
   * @returns {object[]}
   */
  getContextualSuggestions(page, pages) {
    const suggestions = []
    const pageKeywords = this.#extractKeywords(page)

    pages.forEach(candidate => {
      if (candidate.id === page.id) return

      const candidateKeywords = this.#extractKeywords(candidate)
      const overlap = this.#calculateKeywordOverlap(pageKeywords, candidateKeywords)

      if (overlap > 0.3) {
        suggestions.push({
          targetPageId: candidate.id,
          targetSlug: candidate.slug,
          targetTitle: candidate.title,
          relevance: overlap,
          suggestedContext: this.#findOverlapContext(page, candidate),
        })
      }
    })

    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
  }

  // ── Private ──

  #recommendForOrphanPages(pages, orphanPages) {
    return orphanPages.map(orphan => {
      const page = pages.find(p => p.id === orphan.pageId)
      const bestTarget = this.#findBestLinkTarget(page, pages)

      return {
        pageId: orphan.pageId,
        type: SEO_OPPORTUNITY_TYPE.INTERNAL_LINKING,
        title: `Add links to orphan page "${orphan.title}"`,
        description: 'This page has no incoming internal links. Add links from related pages.',
        impact: 'high',
        targetPageId: bestTarget?.id,
        targetSlug: bestTarget?.slug,
      }
    })
  }

  #recommendForLowLinkPages(pages, linkAnalysis) {
    const recommendations = []
    pages.forEach(page => {
      const analysis = linkAnalysis.links.get(page.id)
      if (analysis && analysis.outgoing.length === 0 && page.type !== 'home') {
        const related = this.#findRelatedPages(page, pages).slice(0, 3)
        related.forEach(rel => {
          recommendations.push({
            pageId: page.id,
            type: SEO_OPPORTUNITY_TYPE.INTERNAL_LINKING,
            title: `Add link to "${rel.title}"`,
            description: 'This page has no outgoing internal links.',
            impact: 'medium',
            targetPageId: rel.id,
            targetSlug: rel.slug,
          })
        })
      }
    })
    return recommendations
  }

  #recommendByTopic(pages) {
    const recommendations = []
    const topicGroups = this.#groupByTopic(pages)

    Object.entries(topicGroups).forEach(([, group]) => {
      if (group.length >= 2) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            recommendations.push({
              pageId: group[i].id,
              type: SEO_OPPORTUNITY_TYPE.INTERNAL_LINKING,
              title: `Cross-link "${group[i].title}" with "${group[j].title}"`,
              description: 'These pages share similar topics and should link to each other.',
              impact: 'medium',
              targetPageId: group[j].id,
              targetSlug: group[j].slug,
            })
          }
        }
      }
    })

    return recommendations
  }

  #findRelatedPages(page, pages) {
    const keywords = this.#extractKeywords(page)
    return pages
      .filter(p => p.id !== page.id)
      .map(p => ({
        ...p,
        relevance: this.#calculateKeywordOverlap(keywords, this.#extractKeywords(p)),
      }))
      .filter(p => p.relevance > 0.2)
      .sort((a, b) => b.relevance - a.relevance)
  }

  #findBestLinkTarget(page, pages) {
    if (!page) return null
    const related = this.#findRelatedPages(page, pages)
    return related[0] || null
  }

  #extractKeywords(page) {
    const text = `${page.title || ''} ${page.description || ''} ${page.content || ''}`.toLowerCase()
    return text
      .replace(/[^a-záéíóúñü0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  }

  #calculateKeywordOverlap(kw1, kw2) {
    const set1 = new Set(kw1)
    const set2 = new Set(kw2)
    const intersection = [...set1].filter(k => set2.has(k))
    const union = new Set([...set1, ...set2])
    return union.size > 0 ? intersection.length / union.size : 0
  }

  #findOverlapContext(page1, page2) {
    const words1 = this.#extractKeywords(page1)
    const words2 = this.#extractKeywords(page2)
    const overlap = words1.filter(w => words2.has(w) || words2.includes(w))
    return overlap.slice(0, 3).join(', ')
  }

  #groupByTopic(pages) {
    const groups = {}
    pages.forEach(page => {
      const keywords = this.#extractKeywords(page)
      const topKeyword = keywords[0] || 'general'
      if (!groups[topKeyword]) groups[topKeyword] = []
      groups[topKeyword].push(page)
    })
    return groups
  }
}
