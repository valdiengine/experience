/**
 * Engagement Schema — Dual economy, levels, trust, and engagement domains
 */

export const ENGAGEMENT_DOMAIN = {
  DISCOVERY: 'discovery',
  ECOLOGY: 'ecology',
  SPORTS: 'sports',
  COMMUNITY: 'community',
  EDUCATION: 'education',
}

export const ECO_LEVEL = {
  SEED: { level: 1, name: 'Seed', minScore: 0 },
  SPROUT: { level: 2, name: 'Sprout', minScore: 100 },
  GUARDIAN: { level: 3, name: 'Guardian', minScore: 500 },
  PROTECTOR: { level: 4, name: 'Protector', minScore: 2000 },
  AMBASSADOR: { level: 5, name: 'Ambassador', minScore: 10000 },
  ECOSYSTEM_GUARDIAN: { level: 6, name: 'Ecosystem Guardian', minScore: 50000 },
}

export const SPORTS_ACTIVITY = {
  HIKING: 'hiking',
  CYCLING: 'cycling',
  TRAIL_RUNNING: 'trail_running',
  KAYAKING: 'kayaking',
  SURF: 'surf',
  DIVING: 'diving',
  SUP: 'sup',
  CLIMBING: 'climbing',
  WILDLIFE_PHOTOGRAPHY: 'wildlife_photography',
}

export const BADGE_CATEGORY = {
  DISCOVERY: 'discovery',
  ECOLOGY: 'ecology',
  SPORTS: 'sports',
  COMMUNITY: 'community',
  KNOWLEDGE: 'knowledge',
  SECRET: 'secret',
}

export const VALIDATION_LEVEL = {
  AI_ASSISTANCE: 1,
  COMMUNITY: 2,
  SCIENTIFIC: 3,
}

export const TRUST_METRIC = {
  ACCURACY: 'accuracy',
  QUALITY: 'quality',
  COMMUNITY_HELP: 'community_help',
  SCIENTIFIC: 'scientific',
  POSITIVE_IMPACT: 'positive_impact',
}

export const MISSION_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  DESTINATION: 'destination',
  ECOLOGICAL: 'ecological',
  SPORTS: 'sports',
  COMMUNITY: 'community',
}

/**
 * EcoToken account schema
 */
export const ECO_TOKEN_SCHEMA = {
  id: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  balance: { type: 'number', default: 0 },
  totalEarned: { type: 'number', default: 0 },
  totalSpent: { type: 'number', default: 0 },
  history: { type: 'array', default: [] },
}

/**
 * EcoScore profile schema
 */
export const ECO_SCORE_SCHEMA = {
  id: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  score: { type: 'number', default: 0 },
  level: { type: 'number', default: 1 },
  levelName: { type: 'string', default: 'Seed' },
  domainScores: { type: 'object', default: {} },
  lastAction: { type: 'string' },
  createdAt: { type: 'string', required: true },
}

/**
 * EcoTrust profile schema
 */
export const ECO_TRUST_SCHEMA = {
  id: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  accuracy: { type: 'number', default: 100 },
  quality: { type: 'number', default: 100 },
  communityHelp: { type: 'number', default: 100 },
  scientific: { type: 'number', default: 100 },
  positiveImpact: { type: 'number', default: 100 },
  overallTrust: { type: 'number', default: 100 },
  violations: { type: 'array', default: [] },
  restrictions: { type: 'array', default: [] },
}

/**
 * Badge definition schema
 */
export const BADGE_SCHEMA = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', required: true },
  category: { type: 'string', required: true },
  icon: { type: 'string' },
  requirements: { type: 'array', default: [] },
  points: { type: 'number', default: 0 },
  isSecret: { type: 'boolean', default: false },
  destinationSpecific: { type: 'boolean', default: false },
}

/**
 * Sports activity schema
 */
export const SPORTS_ACTIVITY_SCHEMA = {
  id: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  activityType: { type: 'string', required: true },
  destinationId: { type: 'string' },
  route: { type: 'object' },
  distance: { type: 'number' },
  duration: { type: 'number' },
  discoveries: { type: 'array', default: [] },
  observations: { type: 'array', default: [] },
  memories: { type: 'array', default: [] },
  startedAt: { type: 'string', required: true },
  completedAt: { type: 'string' },
}

/**
 * Territory progress schema
 */
export const TERRITORY_PROGRESS_SCHEMA = {
  visitorId: { type: 'string', required: true },
  destinationId: { type: 'string', required: true },
  placesDiscovered: { type: 'number', default: 0 },
  placesTotal: { type: 'number', default: 0 },
  speciesDiscovered: { type: 'number', default: 0 },
  speciesTotal: { type: 'number', default: 0 },
  experiencesCompleted: { type: 'number', default: 0 },
  experiencesTotal: { type: 'number', default: 0 },
  businessesVisited: { type: 'number', default: 0 },
  businessesTotal: { type: 'number', default: 0 },
  completionPercent: { type: 'number', default: 0 },
}
