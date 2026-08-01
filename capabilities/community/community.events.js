/**
 * Community Events — Event definitions for community system
 */
export const COMMUNITY_EVENTS = {
  // Visitor
  VISITOR_REGISTERED: 'community:visitor_registered',
  VISITOR_UPDATED: 'community:visitor_updated',

  // Memories
  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_APPROVED: 'memory:approved',
  MEMORY_FEATURED: 'memory:featured',
  MEMORY_LIKED: 'memory:liked',
  MEMORY_COMMENTED: 'memory:commented',

  // Reviews
  REVIEW_CREATED: 'review:created',
  REVIEW_UPDATED: 'review:updated',
  REVIEW_APPROVED: 'review:approved',
  REVIEW_REPORTED: 'review:reported',

  // Interactions
  INTERACTION_CREATED: 'interaction:created',

  // Visits
  VISIT_DESTINATION: 'visitor:visited_destination',
  VISIT_PLACE: 'visitor:visited_place',
  VISIT_LOCALITY: 'visitor:visited_locality',
  VISIT_EXPERIENCE: 'visitor:visited_experience',

  // Reputation
  REPUTATION_UPDATED: 'reputation:updated',

  // Moderation
  CONTENT_FLAGGED: 'community:content_flagged',
  CONTENT_APPROVED: 'community:content_approved',
  CONTENT_REJECTED: 'community:content_rejected',

  // Stories
  STORY_CREATED: 'community:story.created',

  // Analytics
  METRIC_RECORDED: 'community:metric_recorded',
}
