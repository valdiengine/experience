/**
 * Content Analyzer — Detects content quality issues
 *
 * Business-agnostic: analyzes content structure, not business logic
 * Detects: missing descriptions, thin content, missing sections, duplicates, freshness
 */
import { SEO_ISSUE_SEVERITY, SEO_ISSUE_TYPE } from '../seo-intelligence.schema.js'

export class ContentAnalyzer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze all pages for content issues
   * @param {object[]} pages - Normalized pages from ContentManager
   * @returns {object[]} - Array of issues
   */
  analyze(pages) {
    const issues = []

    pages.forEach(page => {
      issues.push(...this.#analyzePage(page))
    })

    issues.push(...this.#detectDuplicates(pages))

    return issues
  }

  /**
   * Analyze a single page
   * @param {object} page - Normalized page
   * @returns {object[]}
   */
  #analyzePage(page) {
    const issues = []

    if (!page.description || page.description.trim().length === 0) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_DESCRIPTION,
        severity: SEO_ISSUE_SEVERITY.CRITICAL,
        message: 'Page has no description',
        field: 'description',
      })
    }

    const contentLength = this.#getContentLength(page)
    if (contentLength < 100) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.THIN_CONTENT,
        severity: SEO_ISSUE_SEVERITY.WARNING,
        message: `Content is too thin (${contentLength} characters)`,
        field: 'content',
        value: String(contentLength),
      })
    }

    if (!page.sections || page.sections.length === 0) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_SECTIONS,
        severity: SEO_ISSUE_SEVERITY.WARNING,
        message: 'Page has no sections defined',
        field: 'sections',
      })
    }

    if (page.images) {
      page.images.forEach((img, idx) => {
        if (!img.alt || img.alt.trim().length === 0) {
          issues.push({
            pageId: page.id,
            type: SEO_ISSUE_TYPE.MISSING_ALT,
            severity: SEO_ISSUE_SEVERITY.INFO,
            message: `Image ${idx + 1} is missing alt text`,
            field: `images[${idx}].alt`,
          })
        }
      })
    }

    if (this.#isStale(page)) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.CONTENT_STALE,
        severity: SEO_ISSUE_SEVERITY.INFO,
        message: 'Content has not been updated in over 90 days',
        field: 'updatedAt',
      })
    }

    return issues
  }

  #getContentLength(page) {
    let length = 0
    if (page.content) length += page.content.length
    if (page.sections) {
      page.sections.forEach(section => {
        if (section.content?.html) length += section.content.html.length
        if (section.content?.text) length += section.content.text.length
      })
    }
    return length
  }

  #isStale(page) {
    if (!page.updatedAt) return true
    const updated = new Date(page.updatedAt)
    const now = new Date()
    const daysDiff = (now - updated) / (1000 * 60 * 60 * 24)
    return daysDiff > 90
  }

  #detectDuplicates(pages) {
    const issues = []
    const contentMap = new Map()

    pages.forEach(page => {
      const content = (page.content || '').trim().toLowerCase()
      if (content.length < 50) return

      if (contentMap.has(content)) {
        issues.push({
          pageId: page.id,
          type: SEO_ISSUE_TYPE.DUPLICATE_CONTENT,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Duplicate content detected with page "${contentMap.get(content)}"`,
          field: 'content',
          value: contentMap.get(content),
        })
      } else {
        contentMap.set(content, page.id)
      }
    })

    return issues
  }
}
