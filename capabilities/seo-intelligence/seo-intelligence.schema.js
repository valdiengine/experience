/**
 * SEO Intelligence Schema — Business-agnostic SEO analysis data definitions
 *
 * Defines schemas for SEO health, issues, opportunities, and recommendations
 */
import { createSchema } from '../core/schema.js'

export const SEO_ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
}

export const SEO_ISSUE_TYPE = {
  MISSING_TITLE: 'missing_title',
  MISSING_DESCRIPTION: 'missing_description',
  MISSING_CANONICAL: 'missing_canonical',
  MISSING_OG: 'missing_og',
  MISSING_TWITTER: 'missing_twitter',
  MISSING_SCHEMA: 'missing_schema',
  THIN_CONTENT: 'thin_content',
  DUPLICATE_CONTENT: 'duplicate_content',
  MISSING_SECTIONS: 'missing_sections',
  MISSING_ALT: 'missing_alt',
  SHORT_TITLE: 'short_title',
  LONG_TITLE: 'long_title',
  SHORT_DESCRIPTION: 'short_description',
  LONG_DESCRIPTION: 'long_description',
  MISSING_H1: 'missing_h1',
  CONTENT_STALE: 'content_stale',
}

export const SEO_OPPORTUNITY_TYPE = {
  KEYWORD_EXPANSION: 'keyword_expansion',
  INTERNAL_LINKING: 'internal_linking',
  CONTENT_GAP: 'content_gap',
  SCHEMA_ENHANCEMENT: 'schema_enhancement',
  METADATA_OPTIMIZATION: 'metadata_optimization',
  NEW_PAGE: 'new_page',
}

export const SEO_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  NEEDS_WORK: 50,
  POOR: 25,
}

export const SEO_ANALYSIS_SCHEMA = createSchema({
  id: 'seo_analysis',
  name: 'SEO Analysis',
  description: 'Complete SEO analysis result for a tenant',
  fields: {
    tenantId: { type: 'string', required: true },
    score: { type: 'number', required: true, min: 0, max: 100 },
    pages: { type: 'number', required: true, min: 0 },
    issues: { type: 'array', required: true },
    opportunities: { type: 'array', required: true },
    recommendations: { type: 'array', required: true },
    analyzedAt: { type: 'string', required: true },
  },
})

export const SEO_ISSUE_SCHEMA = createSchema({
  id: 'seo_issue',
  name: 'SEO Issue',
  description: 'An SEO issue detected on a page',
  fields: {
    pageId: { type: 'string', required: true },
    type: { type: 'string', required: true },
    severity: { type: 'string', required: true, values: Object.values(SEO_ISSUE_SEVERITY) },
    message: { type: 'string', required: true },
    field: { type: 'string', required: false },
    value: { type: 'string', required: false },
  },
})

export const SEO_OPPORTUNITY_SCHEMA = createSchema({
  id: 'seo_opportunity',
  name: 'SEO Opportunity',
  description: 'An SEO improvement opportunity',
  fields: {
    pageId: { type: 'string', required: false },
    type: { type: 'string', required: true, values: Object.values(SEO_OPPORTUNITY_TYPE) },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    impact: { type: 'string', required: true, values: ['high', 'medium', 'low'] },
    action: { type: 'string', required: false },
  },
})

export const SEO_RECOMMENDATION_SCHEMA = createSchema({
  id: 'seo_recommendation',
  name: 'SEO Recommendation',
  description: 'An SEO recommendation for improvement',
  fields: {
    category: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    priority: { type: 'string', required: true, values: ['high', 'medium', 'low'] },
    pages: { type: 'array', required: false },
  },
})

export function validateSEOAnalysis(data) {
  return SEO_ANALYSIS_SCHEMA.validate(data)
}

export function validateSEOSssue(data) {
  return SEO_ISSUE_SCHEMA.validate(data)
}

export function validateSEOOpportunity(data) {
  return SEO_OPPORTUNITY_SCHEMA.validate(data)
}

export function validateSEORecommendation(data) {
  return SEO_RECOMMENDATION_SCHEMA.validate(data)
}
