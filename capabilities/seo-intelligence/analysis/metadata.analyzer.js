/**
 * Metadata Analyzer — Checks SEO metadata completeness
 *
 * Business-agnostic: validates title, description, canonical, OG, Twitter cards
 */
import { SEO_ISSUE_SEVERITY, SEO_ISSUE_TYPE } from '../seo-intelligence.schema.js'

const TITLE_MIN = 30
const TITLE_MAX = 60
const DESC_MIN = 70
const DESC_MAX = 160

export class MetadataAnalyzer {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Analyze metadata for all pages
   * @param {object[]} pages - Normalized pages
   * @returns {object[]}
   */
  analyze(pages) {
    const issues = []
    pages.forEach(page => {
      issues.push(...this.#analyzePage(page))
    })
    return issues
  }

  /**
   * Analyze metadata for a single page
   * @param {object} page
   * @returns {object[]}
   */
  #analyzePage(page) {
    const issues = []
    const seo = page.seo || {}

    if (!seo.title && !page.title) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_TITLE,
        severity: SEO_ISSUE_SEVERITY.CRITICAL,
        message: 'Page has no title',
        field: 'seo.title',
      })
    } else {
      const title = seo.title || page.title
      if (title.length < TITLE_MIN) {
        issues.push({
          pageId: page.id,
          type: SEO_ISSUE_TYPE.SHORT_TITLE,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Title is too short (${title.length} chars, min ${TITLE_MIN})`,
          field: 'seo.title',
          value: title,
        })
      }
      if (title.length > TITLE_MAX) {
        issues.push({
          pageId: page.id,
          type: SEO_ISSUE_TYPE.LONG_TITLE,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Title is too long (${title.length} chars, max ${TITLE_MAX})`,
          field: 'seo.title',
          value: title,
        })
      }
    }

    if (!seo.description && !page.description) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_DESCRIPTION,
        severity: SEO_ISSUE_SEVERITY.CRITICAL,
        message: 'Page has no meta description',
        field: 'seo.description',
      })
    } else {
      const desc = seo.description || page.description
      if (desc.length < DESC_MIN) {
        issues.push({
          pageId: page.id,
          type: SEO_ISSUE_TYPE.SHORT_DESCRIPTION,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Description is too short (${desc.length} chars, min ${DESC_MIN})`,
          field: 'seo.description',
          value: desc,
        })
      }
      if (desc.length > DESC_MAX) {
        issues.push({
          pageId: page.id,
          type: SEO_ISSUE_TYPE.LONG_DESCRIPTION,
          severity: SEO_ISSUE_SEVERITY.WARNING,
          message: `Description is too long (${desc.length} chars, max ${DESC_MAX})`,
          field: 'seo.description',
          value: desc,
        })
      }
    }

    if (!seo.canonical) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_CANONICAL,
        severity: SEO_ISSUE_SEVERITY.WARNING,
        message: 'No canonical URL set',
        field: 'seo.canonical',
      })
    }

    if (!seo.ogTitle && !seo.ogDescription) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_OG,
        severity: SEO_ISSUE_SEVERITY.INFO,
        message: 'Open Graph metadata not configured',
        field: 'seo.ogTitle',
      })
    }

    if (!seo.twitterCard) {
      issues.push({
        pageId: page.id,
        type: SEO_ISSUE_TYPE.MISSING_TWITTER,
        severity: SEO_ISSUE_SEVERITY.INFO,
        message: 'Twitter Card metadata not configured',
        field: 'seo.twitterCard',
      })
    }

    return issues
  }
}
