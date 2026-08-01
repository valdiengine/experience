// Reserved: SEO sub-module events — not yet wired to producers. Future extension point.
/**
 * SEO Events — Global SEO events for the linking module
 *
 * Used by LinkAnalyzer and LinkRecommendation
 */
export const SEO_EVENTS = {
  // Analysis
  ANALYSIS_STARTED: 'seo:analysis_started',
  ANALYSIS_COMPLETED: 'seo:analysis_completed',
  ANALYSIS_FAILED: 'seo:analysis_failed',

  // Issues
  ISSUE_DETECTED: 'seo:issue_detected',
  ISSUE_RESOLVED: 'seo:issue_resolved',

  // Opportunities
  OPPORTUNITY_FOUND: 'seo:opportunity_found',
  OPPORTUNITY_APPLIED: 'seo:opportunity_applied',

  // Content
  CONTENT_UPDATED: 'seo:content_updated',
  CONTENT_PUBLISHED: 'seo:content_published',

  // Linking
  LINKS_ANALYZED: 'seo:links_analyzed',
  LINK_RECOMMENDATION: 'seo:link_recommendation',

  // Score
  SCORE_CHANGED: 'seo:score_changed',
}
