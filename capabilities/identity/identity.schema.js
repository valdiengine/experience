export const STORY_TYPE = Object.freeze({
  HISTORICAL: 'historical',
  HUMAN: 'human',
  NATURE: 'nature',
  EXPERIENCE: 'experience',
  LEGEND: 'legend',
  TRADITION: 'tradition'
});

export const MEMORY_CATEGORY = Object.freeze({
  PERSONAL: 'personal',
  FAMILY: 'family',
  COMMUNITY: 'community',
  HISTORICAL: 'historical',
  CULTURAL: 'cultural',
  TRADITIONAL: 'traditional',
  NATURAL: 'natural'
});

export const HERITAGE_CATEGORY = Object.freeze({
  TANGIBLE: 'tangible',
  INTANGIBLE: 'intangible'
});

export const TANGIBLE_TYPE = Object.freeze({
  BUILDING: 'building',
  MONUMENT: 'monument',
  HISTORICAL_PLACE: 'historical_place',
  INFRASTRUCTURE: 'infrastructure',
  LANDSCAPE: 'landscape'
});

export const INTANGIBLE_TYPE = Object.freeze({
  TRADITION: 'tradition',
  FOOD: 'food',
  MUSIC: 'music',
  STORY: 'story',
  CRAFT: 'craft',
  KNOWLEDGE: 'knowledge'
});

export const HERO_TYPE = Object.freeze({
  FISHERMAN: 'fisherman',
  ARTISAN: 'artisan',
  SCIENTIST: 'scientist',
  EXPLORER: 'explorer',
  CONSERVATIONIST: 'conservationist',
  ENTREPRENEUR: 'entrepreneur',
  COMMUNITY_LEADER: 'community_leader',
  EDUCATOR: 'educator'
});

export const VALIDATION_STATUS = Object.freeze({
  PENDING: 'pending',
  COMMUNITY_APPROVED: 'community_approved',
  MANAGER_APPROVED: 'manager_approved',
  CULTURALLY_VALIDATED: 'culturally_validated',
  REJECTED: 'rejected'
});

export const RECOGNITION_LEVEL = Object.freeze({
  LOCAL: 'local',
  REGIONAL: 'regional',
  NATIONAL: 'national',
  INTERNATIONAL: 'international'
});

export const CULTURAL_POKEDEX_CATEGORY = Object.freeze({
  NATURE: 'nature',
  CULTURE: 'culture',
  PLACES: 'places',
  PEOPLE: 'people',
  EXPERIENCES: 'experiences'
});

export const DESTINATION_IDENTITY = Object.freeze({
  id: 'string',
  destinationId: 'string',
  name: 'string',
  shortDescription: 'string',
  originStory: 'string',
  identityKeywords: 'array',
  mainValues: 'array',
  symbolism: 'object',
  visualIdentity: 'object',
  audioIdentity: 'object',
  culturalProfile: 'object',
  createdAt: 'date',
  updatedAt: 'date'
});

export const STORY = Object.freeze({
  id: 'string',
  destinationId: 'string',
  type: 'string',
  title: 'string',
  summary: 'string',
  chapters: 'array',
  author: 'object',
  media: 'array',
  location: 'object',
  timePeriod: 'string',
  characters: 'array',
  themes: 'array',
  validationStatus: 'string',
  publishedAt: 'date',
  createdAt: 'date'
});

export const HERITAGE_ITEM = Object.freeze({
  id: 'string',
  destinationId: 'string',
  category: 'string',
  subcategory: 'string',
  name: 'string',
  description: 'string',
  history: 'string',
  media: 'array',
  importance: 'string',
  validationStatus: 'string',
  location: 'object',
  associatedPeople: 'array',
  conservationStatus: 'string',
  createdAt: 'date'
});

export const LOCAL_HERO = Object.freeze({
  id: 'string',
  destinationId: 'string',
  name: 'string',
  role: 'string',
  type: 'string',
  story: 'string',
  contribution: 'string',
  location: 'object',
  media: 'array',
  recognitionLevel: 'string',
  verified: 'boolean',
  createdAt: 'date'
});

export const CULTURAL_DISCOVERY = Object.freeze({
  id: 'string',
  visitorId: 'string',
  destinationId: 'string',
  category: 'string',
  entityId: 'string',
  entityType: 'string',
  discoveredAt: 'date',
  notes: 'string'
});
