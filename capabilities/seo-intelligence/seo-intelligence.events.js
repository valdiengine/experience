/**
 * SEO Intelligence Events — Event definitions for SEO analysis
 */
export const SEO_INTELLIGENCE_EVENTS = {
  // Analysis
  ANALYSIS_STARTED: 'seo-intelligence:analysis_started',
  ANALYSIS_COMPLETED: 'seo-intelligence:analysis_completed',
  ANALYSIS_FAILED: 'seo-intelligence:analysis_failed',

  // Issues
  ISSUE_DETECTED: 'seo-intelligence:issue_detected',
  ISSUE_RESOLVED: 'seo-intelligence:issue_resolved',

  // Opportunities
  OPPORTUNITY_FOUND: 'seo-intelligence:opportunity_found',
  OPPORTUNITY_APPLIED: 'seo-intelligence:opportunity_applied',

  // Content
  CONTENT_UPDATED: 'seo-intelligence:content_updated',
  CONTENT_PUBLISHED: 'seo-intelligence:content_published',

  // Score
  SCORE_CHANGED: 'seo-intelligence:score_changed',
}
