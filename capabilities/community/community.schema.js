/**
 * Community Schema — Entity schemas for community system
 *
 * Business-agnostic: defines visitor profiles, memories, reviews,
 * interactions, and reputation scoring.
 * No business logic — only structural validation.
 */
import { createSchema } from '../core/schema.js'

export const ENTITY_TYPE = {
  DESTINATION: 'destination',
  LOCALITY: 'locality',
  PLACE: 'place',
  EXPERIENCE: 'experience',
  BUSINESS: 'business',
}

export const MEMORY_TYPE = {
  TRAVEL_STORY: 'travel_story',
  PHOTO_MEMORY: 'photo_memory',
  FAMILY_TRIP: 'family_trip',
  ADVENTURE: 'adventure',
  CULTURAL_EXPERIENCE: 'cultural_experience',
  NATURE_OBSERVATION: 'nature_observation',
}

export const INTERACTION_TYPE = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  HELPFUL: 'helpful',
}

export const VISIT_INTERACTION = {
  VIEWED: 'viewed',
  VISITED: 'visited',
  PHOTOGRAPHED: 'photographed',
  REVIEWED: 'reviewed',
  SHARED: 'shared',
}

export const MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
}

export const VISIBILITY = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  PRIVATE: 'private',
}

export const VISITOR_SCHEMA = createSchema({
  id: 'visitor_profile',
  name: 'Visitor Profile',
  description: 'Visitor participating in the destination ecosystem',
  fields: {
    id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    displayName: { type: 'string', required: true },
    avatar: { type: 'string' },
    country: { type: 'string' },
    interests: { type: 'array' },
    visitedDestinations: { type: 'array' },
    visitedLocalities: { type: 'array' },
    discoveredPlaces: { type: 'array' },
    memoriesCount: { type: 'number', min: 0 },
    reviewsCount: { type: 'number', min: 0 },
    reputationScore: { type: 'number', min: 0 },
    badges: { type: 'array' },
    createdAt: { type: 'string' },
  },
})

export const MEMORY_SCHEMA = createSchema({
  id: 'memory',
  name: 'Visitor Memory',
  description: 'A visitor story connected to a territory',
  fields: {
    id: { type: 'string', required: true },
    visitorId: { type: 'string', required: true },
    entityType: { type: 'string', required: true, values: Object.values(ENTITY_TYPE) },
    entityId: { type: 'string', required: true },
    memoryType: { type: 'string', required: true, values: Object.values(MEMORY_TYPE) },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    images: { type: 'array' },
    location: { type: 'object' },
    visitDate: { type: 'string' },
    likes: { type: 'number', min: 0 },
    comments: { type: 'number', min: 0 },
    visibility: { type: 'string', values: Object.values(VISIBILITY) },
    moderationStatus: { type: 'string', values: Object.values(MODERATION_STATUS) },
    createdAt: { type: 'string' },
  },
})

export const REVIEW_SCHEMA = createSchema({
  id: 'review',
  name: 'Review',
  description: 'A structured review of a destination, locality, place, experience, or business',
  fields: {
    id: { type: 'string', required: true },
    visitorId: { type: 'string', required: true },
    entityType: { type: 'string', required: true, values: Object.values(ENTITY_TYPE) },
    entityId: { type: 'string', required: true },
    rating: { type: 'number', required: true, min: 1, max: 5 },
    title: { type: 'string', required: true },
    comment: { type: 'string', required: true },
    images: { type: 'array' },
    verifiedVisit: { type: 'boolean' },
    helpfulVotes: { type: 'number', min: 0 },
    moderationStatus: { type: 'string', values: Object.values(MODERATION_STATUS) },
    createdAt: { type: 'string' },
  },
})

export const INTERACTION_SCHEMA = createSchema({
  id: 'interaction',
  name: 'Community Interaction',
  description: 'A visitor interaction (like, comment, follow, helpful)',
  fields: {
    id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    targetType: { type: 'string', required: true, values: Object.values(ENTITY_TYPE) },
    targetId: { type: 'string', required: true },
    interactionType: { type: 'string', required: true, values: Object.values(INTERACTION_TYPE) },
    createdAt: { type: 'string' },
  },
})

export const VISIT_EVENT_SCHEMA = createSchema({
  id: 'visit_event',
  name: 'Visit Event',
  description: 'Tracks a visitor exploration event',
  fields: {
    visitorId: { type: 'string', required: true },
    entityType: { type: 'string', required: true, values: Object.values(ENTITY_TYPE) },
    entityId: { type: 'string', required: true },
    timestamp: { type: 'string', required: true },
    location: { type: 'object' },
    interactionType: { type: 'string', required: true, values: Object.values(VISIT_INTERACTION) },
  },
})

export const REPUTATION_SCHEMA = createSchema({
  id: 'reputation_score',
  name: 'Reputation Score',
  description: 'Visitor reputation based on community contributions',
  fields: {
    visitorId: { type: 'string', required: true },
    score: { type: 'number', required: true, min: 0 },
    level: { type: 'number', required: true, min: 1 },
    contributions: { type: 'number', required: true, min: 0 },
    lastUpdated: { type: 'string' },
  },
})

export const REPUTATION_RULES = {
  MEMORY_CREATED: { points: 10, label: 'Create memory' },
  REVIEW_CREATED: { points: 5, label: 'Write review' },
  HELPFUL_VOTE_RECEIVED: { points: 2, label: 'Helpful vote received' },
  VISIT_VERIFIED: { points: 3, label: 'Visit verified place' },
  PHOTO_UPLOADED: { points: 1, label: 'Upload photo' },
  COMMENT_POSTED: { points: 1, label: 'Post comment' },
}

export const REPUTATION_LEVELS = [
  { level: 1, name: 'Explorador', minScore: 0 },
  { level: 2, name: 'Viajero', minScore: 50 },
  { level: 3, name: 'Aventurero', minScore: 150 },
  { level: 4, name: 'Guardián', minScore: 350 },
  { level: 5, name: 'Embajador', minScore: 700 },
]
