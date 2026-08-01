/**
 * Keyword Analyzer — Business-agnostic keyword and topic analysis
 *
 * Analyzes search intent, content topics, opportunities, related terms
 * No external SEO APIs — purely internal analysis
 */
import { SEO_OPPORTUNITY_TYPE } from '../seo-intelligence.schema.js'

export class KeywordAnalyzer {
  #context = null
  #stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'are', 'was',
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
    'en', 'de', 'del', 'al', 'con', 'por', 'para', 'sin', 'sobre', 'entre',
  ])

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze keywords across all pages
   * @param {object[]} pages - Normalized pages
   * @returns {object} - { topics, opportunities, relatedTerms }
   */
  analyze(pages) {
    const topics = this.#extractTopics(pages)
    const opportunities = this.#findOpportunities(pages, topics)
    const relatedTerms = this.#findRelatedTerms(pages, topics)

    return { topics, opportunities, relatedTerms }
  }

  /**
   * Analyze a single page for keyword opportunities
   * @param {object} page
   * @param {object[]} allPages
   * @returns {object[]}
   */
  analyzePage(page, allPages) {
    const opportunities = []
    const pageWords = this.#extractWords(page)
    const wordFreq = this.#getWordFrequency(pageWords)

    const topWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)

    if (topWords.length > 0) {
      const relatedPages = allPages.filter(p =>
        p.id !== page.id && this.#hasKeywordOverlap(p, topWords)
      )

      if (relatedPages.length > 0 && (!page.seo?.internalLinks || page.seo.internalLinks.length === 0)) {
        opportunities.push({
          pageId: page.id,
          type: SEO_OPPORTUNITY_TYPE.INTERNAL_LINKING,
          title: 'Add internal links',
          description: `Page could link to ${relatedPages.length} related pages`,
          impact: 'medium',
        })
      }
    }

    const title = page.seo?.title || page.title || ''
    const titleWords = this.#extractWords({ content: title })
    const contentWords = this.#extractWords(page)
    const titleSet = new Set(titleWords)
    const missingFromContent = titleWords.filter(w => !contentWords.includes(w))

    if (missingFromContent.length > 0) {
      opportunities.push({
        pageId: page.id,
        type: SEO_OPPORTUNITY_TYPE.KEYWORD_EXPANSION,
        title: 'Include title keywords in content',
        description: `Keywords in title not found in content: ${missingFromContent.join(', ')}`,
        impact: 'low',
      })
    }

    return opportunities
  }

  /**
   * Get search intent classification
   * @param {object} page
   * @returns {string} - informational, navigational, transactional, commercial
   */
  getSearchIntent(page) {
    const text = `${page.title || ''} ${page.description || ''} ${page.content || ''}`.toLowerCase()

    const transactional = ['book', 'reservar', 'buy', 'comprar', 'price', 'precio', 'cost', 'costo', 'offer', 'oferta']
    const navigational = ['contact', 'contacto', 'about', 'about us', 'location', 'ubicacion', 'login']
    const informational = ['what', 'que es', 'how', 'como', 'guide', 'guia', 'tips', 'consejos', 'info']

    const transactionalScore = transactional.filter(w => text.includes(w)).length
    const navigationalScore = navigational.filter(w => text.includes(w)).length
    const informationalScore = informational.filter(w => text.includes(w)).length

    const max = Math.max(transactionalScore, navigationalScore, informationalScore)
    if (max === 0) return 'informational'
    if (transactionalScore === max) return 'transactional'
    if (navigationalScore === max) return 'navigational'
    return 'informational'
  }

  // ── Private ──

  #extractTopics(pages) {
    const allWords = []
    pages.forEach(page => {
      allWords.push(...this.#extractWords(page))
    })

    const freq = this.#getWordFrequency(allWords)
    return Object.entries(freq)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ term: word, frequency: count }))
  }

  #extractWords(page) {
    const text = `${page.title || ''} ${page.description || ''} ${page.content || ''}`
    return text
      .toLowerCase()
      .replace(/[^a-záéíóúñü0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.#stopWords.has(w))
  }

  #getWordFrequency(words) {
    const freq = {}
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    return freq
  }

  #findOpportunities(pages, topics) {
    const opportunities = []

    const topicPages = {}
    topics.forEach(({ term }) => {
      topicPages[term] = pages.filter(p => {
        const text = `${p.title || ''} ${p.description || ''} ${p.content || ''}`.toLowerCase()
        return text.includes(term)
      })
    })

    Object.entries(topicPages).forEach(([term, termPages]) => {
      if (termPages.length === 1) {
        opportunities.push({
          type: SEO_OPPORTUNITY_TYPE.CONTENT_GAP,
          title: `Expand content for "${term}"`,
          description: `Only 1 page covers this topic. Consider creating more content.`,
          impact: 'medium',
        })
      }
    })

    return opportunities
  }

  #findRelatedTerms(pages, topics) {
    const related = {}
    topics.forEach(({ term }) => {
      const coOccurrences = {}
      pages.forEach(page => {
        const text = `${page.title || ''} ${page.description || ''} ${page.content || ''}`.toLowerCase()
        if (text.includes(term)) {
          const words = this.#extractWords(page)
          words.forEach(w => {
            if (w !== term) {
              coOccurrences[w] = (coOccurrences[w] || 0) + 1
            }
          })
        }
      })
      related[term] = Object.entries(coOccurrences)
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word)
    })

    return related
  }

  #hasKeywordOverlap(page, keywords) {
    const text = `${page.title || ''} ${page.description || ''} ${page.content || ''}`.toLowerCase()
    return keywords.some(kw => text.includes(kw))
  }
}
