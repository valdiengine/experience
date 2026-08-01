/**
 * Exploration Events — Event definitions for exploration system
 */
export const EXPLORATION_EVENTS = {
  // Explorer
  EXPLORER_CREATED: 'explorer:created',
  EXPLORER_UPDATED: 'explorer:updated',
  EXPLORER_LEVELED_UP: 'explorer:leveled_up',

  // Discovery
  DISCOVERY_REGISTERED: 'explorer:discovery_registered',
  VISITED_PLACE: 'explorer:visited_place',
  DISCOVERED_SPECIES: 'explorer:discovered_species',
  COMPLETED_EXPERIENCE: 'explorer:completed_experience',
  CREATED_MEMORY: 'explorer:created_memory',

  // Badges
  EARNED_BADGE: 'explorer:earned_badge',

  // Points
  POINTS_EARNED: 'explorer:points_earned',

  // Missions
  MISSION_STARTED: 'mission:started',
  MISSION_PROGRESS: 'mission:progress',
  MISSION_COMPLETED: 'mission:completed',
  MISSION_CLAIMED: 'mission:claimed',

  // Pokedex
  POKEDEX_ENTRY_ADDED: 'pokedex:entry_added',
  POKEDEX_ENTRY_UPDATED: 'pokedex:entry_updated',
  POKEDEX_KNOWLEDGE_UNLOCKED: 'pokedex:knowledge_unlocked',

  // Leaderboard
  LEADERBOARD_UPDATED: 'leaderboard:updated',

  // Media
  MEDIA_OPTIMIZED: 'media:optimized',

  // Analytics
  EXPLORATION_METRIC: 'exploration:metric_recorded',
}