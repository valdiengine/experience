/**
 * Exploration Schema — Entity schemas and enums for exploration system
 */

export const DISCOVERY_TYPE = {
  PLACE: 'place',
  VIEWPOINT: 'viewpoint',
  BEACH: 'beach',
  TRAIL: 'trail',
  HISTORICAL_SITE: 'historical_site',
  SPECIES: 'species',
  EXPERIENCE: 'experience',
  BUSINESS: 'business',
  ECOLOGICAL_AREA: 'ecological_area',
}

export const DIFFICULTY = {
  EASY: 'easy',
  MODERATE: 'moderate',
  CHALLENGING: 'challenging',
  EXPERT: 'expert',
}

export const SPECIES_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
}

export const KNOWLEDGE_LEVEL = {
  BASIC: 1,
  HABITAT: 2,
  ECOLOGICAL: 3,
  CONSERVATION: 4,
  SCIENTIFIC: 5,
}

export const MISSION_TYPE = {
  DISCOVERY: 'discovery',
  ECOLOGY: 'ecology',
  COMMUNITY: 'community',
  EXPERIENCE: 'experience',
}

export const LEADERBOARD_TYPE = {
  GLOBAL: 'global',
  DESTINATION: 'destination',
  LOCALITY: 'locality',
  ECOLOGY: 'ecology',
}

export const LEADERBOARD_PERIOD = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  SEASONAL: 'seasonal',
  ALL_TIME: 'all_time',
}

export const POINT_CATEGORY = {
  EXPLORATION: 'exploration',
  ECOLOGY: 'ecology',
  COMMUNITY: 'community',
  LOCAL_SUPPORT: 'local_support',
}

export const EXPLORER_LEVEL = {
  EXPLORER: { level: 1, name: 'Explorer', minPoints: 0 },
  OBSERVER: { level: 2, name: 'Observer', minPoints: 200 },
  CONTRIBUTOR: { level: 3, name: 'Contributor', minPoints: 600 },
  GUARDIAN: { level: 4, name: 'Guardian', minPoints: 1500 },
  AMBASSADOR: { level: 5, name: 'Ambassador', minPoints: 3500 },
}

export const VALIDATION_STATUS = {
  PENDING: 'pending',
  COMMUNITY_CONFIRMED: 'community_confirmed',
  EXPERT_VALIDATED: 'expert_validated',
  REJECTED: 'rejected',
}

/**
 * Explorer profile schema
 */
export const EXPLORER_PROFILE_SCHEMA = {
  id: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  discoveredDestinations: { type: 'array', default: [] },
  discoveredLocalities: { type: 'array', default: [] },
  visitedPlaces: { type: 'array', default: [] },
  discoveredSpecies: { type: 'array', default: [] },
  completedExperiences: { type: 'array', default: [] },
  explorationLevel: { type: 'number', default: 1 },
  explorationPoints: { type: 'number', default: 0 },
  badges: { type: 'array', default: [] },
  memoriesCount: { type: 'number', default: 0 },
  ecologicalPoints: { type: 'number', default: 0 },
  createdAt: { type: 'string', required: true },
}

/**
 * Discovery point schema
 */
export const DISCOVERY_POINT_SCHEMA = {
  id: { type: 'string', required: true },
  entityType: { type: 'string', required: true },
  entityId: { type: 'string', required: true },
  location: { type: 'object', required: true },
  difficulty: { type: 'string', default: DIFFICULTY.EASY },
  discoveryReward: { type: 'number', default: 10 },
  requiredLevel: { type: 'number', default: 1 },
  status: { type: 'string', default: 'hidden' },
}

/**
 * Pokedex entry schema
 */
export const POKEDEX_ENTRY_SCHEMA = {
  speciesId: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  destinationId: { type: 'string', required: true },
  discoveredAt: { type: 'string', required: true },
  location: { type: 'object' },
  observationId: { type: 'string' },
  image: { type: 'string' },
  validationStatus: { type: 'string', default: VALIDATION_STATUS.PENDING },
  rarity: { type: 'string', default: SPECIES_RARITY.COMMON },
  firstDiscovery: { type: 'boolean', default: false },
  knowledgeUnlocked: { type: 'number', default: KNOWLEDGE_LEVEL.BASIC },
}

/**
 * Mission schema
 */
export const MISSION_SCHEMA = {
  id: { type: 'string', required: true },
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  type: { type: 'string', required: true },
  destinationId: { type: 'string' },
  requirements: { type: 'array', default: [] },
  rewards: { type: 'object', default: {} },
  timeLimit: { type: 'string' },
  difficulty: { type: 'string', default: DIFFICULTY.EASY },
  isActive: { type: 'boolean', default: true },
  participantCount: { type: 'number', default: 0 },
}

/**
 * Mission progress schema
 */
export const MISSION_PROGRESS_SCHEMA = {
  missionId: { type: 'string', required: true },
  visitorId: { type: 'string', required: true },
  completedRequirements: { type: 'array', default: [] },
  progress: { type: 'number', default: 0 },
  completedAt: { type: 'string' },
  claimed: { type: 'boolean', default: false },
}