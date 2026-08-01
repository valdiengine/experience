/**
 * Engagement Events — Event definitions for engagement rules layer
 */
export const EXPLORATION_ENGAGEMENT_EVENTS = {
  // EcoTokens
  ECOTOKENS_EARNED: 'eco:tokens_earned',
  ECOTOKENS_SPENT: 'eco:tokens_spent',
  ECOTOKENS_BALANCE_CHANGED: 'eco:tokens_balance_changed',

  // EcoScore
  ECOSCORE_UPDATED: 'eco:score_updated',
  ECOSCORE_LEVEL_UP: 'eco:score_level_up',

  // EcoTrust
  TRUST_UPDATED: 'trust:updated',
  TRUST_VIOLATION: 'trust:violation',
  TRUST_RESTRICTION: 'trust:restriction',

  // Badges
  BADGE_AWARDED: 'badge:awarded',
  BADGE_PROGRESS: 'badge:progress',

  // Missions
  MISSION_STARTED: 'engagement:mission_started',
  MISSION_COMPLETED: 'engagement:mission_completed',
  MISSION_CLAIMED: 'engagement:mission_claimed',

  // Sports
  SPORTS_ACTIVITY_STARTED: 'sports:activity_started',
  SPORTS_ACTIVITY_COMPLETED: 'sports:activity_completed',
  SPORTS_DISCOVERY: 'sports:discovery',
  SPORTS_OBSERVATION: 'sports:observation',

  // Territory
  TERRITORY_PROGRESS_UPDATED: 'territory:progress_updated',
  TERRITORY_COMPLETED: 'territory:completed',

  // Validation
  VALIDATION_REQUESTED: 'validation:requested',
  VALIDATION_COMPLETED: 'validation:completed',

  // Engagement
  DOMAIN_ACTION: 'engagement:domain_action',
  ANTI_GAMING_FLAG: 'engagement:anti_gaming_flag',
}
