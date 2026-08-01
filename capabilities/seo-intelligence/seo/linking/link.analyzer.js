/**
 * Link Analyzer — Analyzes internal linking structure
 *
 * Business-agnostic: analyzes content relationships, not business logic
 * Detects missing links, orphan pages, broken internal references
 */
export class LinkAnalyzer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze internal linking for all pages
   * @param {object[]} pages - Normalized pages
   * @returns {object} - { links, orphanPages, brokenLinks, score }
   */
  analyze(pages) {
    const links = this.#buildLinkMap(pages)
    const orphanPages = this.#findOrphanPages(pages, links)
    const brokenLinks = this.#findBrokenLinks(pages, links)
    const score = this.#calculateLinkScore(pages, links, orphanPages)

    return { links, orphanPages, brokenLinks, score }
  }

  /**
   * Analyze linking for a single page
   * @param {string} pageId
   * @param {object[]} pages
   * @returns {object}
   */
  analyzePage(pageId, pages) {
    const page = pages.find(p => p.id === pageId)
    if (!page) return { incoming: [], outgoing: [], score: 0 }

    const outgoing = this.#getOutgoingLinks(page, pages)
    const incoming = this.#getIncomingLinks(page, pages)
    const score = this.#calculatePageLinkScore(outgoing, incoming)

    return { incoming, outgoing, score }
  }

  /**
   * Get link map for all pages
   * @param {object[]} pages
   * @returns {Map}
   */
  #buildLinkMap(pages) {
    const linkMap = new Map()

    pages.forEach(page => {
      const links = this.#extractLinks(page)
      linkMap.set(page.id, {
        outgoing: links,
        incoming: [],
      })
    })

    linkMap.forEach((data, sourceId) => {
      data.outgoing.forEach(targetId => {
        const target = linkMap.get(targetId)
        if (target) {
          target.incoming.push(sourceId)
        }
      })
    })

    return linkMap
  }

  #extractLinks(page) {
    const links = new Set()
    const content = `${page.content || ''} ${JSON.stringify(page.sections || [])}`

    const internalPattern = /href=["']#?\/?([a-z0-9-]+)["']/gi
    let match
    while ((match = internalPattern.exec(content)) !== null) {
      const slug = match[1]
      const targetPage = this.#findPageBySlug(slug)
      if (targetPage) links.add(targetPage.id)
    }

    if (page.seo?.internalLinks) {
      page.seo.internalLinks.forEach(link => {
        if (link.pageId) links.add(link.pageId)
        if (link.slug) {
          const target = this.#findPageBySlug(link.slug)
          if (target) links.add(target.id)
        }
      })
    }

    return Array.from(links)
  }

  #findPageBySlug(slug) {
    return this.#context?.capabilities?.get?.('cms')?.getBySlug?.(slug) || null
  }

  #getOutgoingLinks(page, pages) {
    const links = this.#extractLinks(page)
    return links.map(id => ({
      pageId: id,
      title: pages.find(p => p.id === id)?.title || id,
    }))
  }

  #getIncomingLinks(page, pages) {
    const incoming = []
    pages.forEach(p => {
      if (p.id === page.id) return
      const links = this.#extractLinks(p)
      if (links.includes(page.id)) {
        incoming.push({
          pageId: p.id,
          title: p.title,
        })
      }
    })
    return incoming
  }

  #findOrphanPages(pages, linkMap) {
    return pages.filter(page => {
      const data = linkMap.get(page.id)
      return data && data.incoming.length === 0 && page.type !== 'home'
    }).map(p => ({ pageId: p.id, title: p.title }))
  }

  #findBrokenLinks(pages, linkMap) {
    const broken = []
    linkMap.forEach((data, pageId) => {
      data.outgoing.forEach(targetId => {
        if (!linkMap.has(targetId)) {
          broken.push({ sourcePageId: pageId, targetId })
        }
      })
    })
    return broken
  }

  #calculateLinkScore(pages, linkMap, orphanPages) {
    if (pages.length === 0) return 0

    const orphanPenalty = (orphanPages.length / pages.length) * 30
    let avgLinks = 0
    linkMap.forEach(data => { avgLinks += data.outgoing.length })
    avgLinks = avgLinks / pages.length

    const linkBonus = Math.min(20, avgLinks * 5)
    const score = Math.max(0, Math.min(100, Math.round(100 - orphanPenalty + linkBonus)))

    return score
  }

  #calculatePageLinkScore(outgoing, incoming) {
    const outScore = Math.min(30, outgoing.length * 10)
    const inScore = Math.min(40, incoming.length * 15)
    return Math.min(100, outScore + inScore + 30)
  }
}
