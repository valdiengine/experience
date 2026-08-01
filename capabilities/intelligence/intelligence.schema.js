export const INTEREST_DOMAINS = Object.freeze({
  NATURE: 'nature',
  ADVENTURE: 'adventure',
  CULTURE: 'culture',
  GASTRONOMY: 'gastronomy',
  WELLNESS: 'wellness',
  ECOLOGY: 'ecology',
  SPORTS: 'sports',
  PHOTOGRAPHY: 'photography'
});

export const TRAVEL_STYLE = Object.freeze({
  SOLO: 'solo',
  COUPLE: 'couple',
  FAMILY: 'family',
  GROUP: 'group',
  ORGANIZED: 'organized'
});

export const EXPERIENCE_LEVEL = Object.freeze({
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
  AMBASSADOR: 'ambassador'
});

export const RECOMMENDATION_TYPE = Object.freeze({
  EXPERIENCE: 'experience',
  PLACE: 'place',
  BUSINESS: 'business',
  ROUTE: 'route',
  CHALLENGE: 'challenge',
  SPECIES: 'species',
  ECOLOGICAL: 'ecological',
  SPORTS: 'sports',
  COMMUNITY: 'community',
  SEASONAL: 'seasonal'
});

export const INSIGHT_TYPE = Object.freeze({
  TOURISM_FLOW: 'tourism_flow',
  ECOLOGICAL_HEALTH: 'ecological_health',
  ECONOMIC_HEALTH: 'economic_health',
  COMMUNITY_HEALTH: 'community_health',
  DEMAND_FORECAST: 'demand_forecast',
  SEASONAL_PATTERN: 'seasonal_pattern'
});

export const PREDICTION_HORIZON = Object.freeze({
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_SEASON: 'this_season',
  THIS_YEAR: 'this_year'
});

export const ASSISTANT_MODE = Object.freeze({
  VISITOR: 'visitor',
  BUSINESS: 'business',
  DESTINATION_MANAGER: 'destination_manager',
  ECOLOGICAL_ADVISORY: 'ecological_advisory'
});

export const GRAPH_ENTITY = Object.freeze({
  VISITOR: 'visitor',
  EXPERIENCE: 'experience',
  PLACE: 'place',
  SPECIES: 'species',
  BUSINESS: 'business',
  COMMUNITY: 'community',
  STORY: 'story',
  CONSERVATION: 'conservation',
  ROUTE: 'route',
  CHALLENGE: 'challenge'
});

export const VISITOR_INTELLIGENCE_PROFILE = Object.freeze({
  id: 'string',
  interests: 'array',
  travelStyle: 'string',
  experienceLevel: 'string',
  sportsProfile: 'object',
  ecologicalProfile: 'object',
  preferredActivities: 'array',
  visitedDestinations: 'array',
  discoveredSpecies: 'array',
  completedChallenges: 'array',
  favoriteBusinesses: 'array',
  budgetRange: 'object',
  travelSeason: 'string',
  accessibilityNeeds: 'array',
  personalityProfile: 'object',
  lastUpdated: 'date'
});

export const RECOMMENDATION = Object.freeze({
  id: 'string',
  visitorId: 'string',
  type: 'string',
  entityId: 'string',
  entityType: 'string',
  score: 'number',
  reasons: 'array',
  context: 'object',
  generatedAt: 'date',
  expiresAt: 'date',
  viewed: 'boolean',
  accepted: 'boolean'
});

export const DESTINATION_INSIGHT = Object.freeze({
  id: 'string',
  destinationId: 'string',
  type: 'string',
  period: 'string',
  metrics: 'object',
  trends: 'array',
  recommendations: 'array',
  generatedAt: 'date',
  confidence: 'number'
});

export const PREDICTION = Object.freeze({
  id: 'string',
  destinationId: 'string',
  type: 'string',
  horizon: 'string',
  forecast: 'object',
  confidence: 'number',
  basedOn: 'array',
  generatedAt: 'date',
  validUntil: 'date'
});

export const GRAPH_CONNECTION = Object.freeze({
  sourceId: 'string',
  sourceType: 'string',
  targetId: 'string',
  targetType: 'string',
  relation: 'string',
  weight: 'number',
  metadata: 'object',
  createdAt: 'date'
});

export const ASSISTANT_CONVERSATION = Object.freeze({
  id: 'string',
  visitorId: 'string',
  mode: 'string',
  messages: 'array',
  context: 'object',
  startedAt: 'date',
  lastMessageAt: 'date'
});
