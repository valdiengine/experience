/**
 * Badge Engine — Permanent achievement badge system
 */
import { BADGE_CATEGORY } from './engagement.schema.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

const DEFAULT_BADGES = [
  { id: 'first_species', name: 'First Species Found', description: 'Discover your first species', category: BADGE_CATEGORY.DISCOVERY, requirements: [{ type: 'species_count', value: 1 }], points: 10 },
  { id: 'species_10', name: 'Species Explorer', description: 'Discover 10 species', category: BADGE_CATEGORY.DISCOVERY, requirements: [{ type: 'species_count', value: 10 }], points: 50 },
  { id: 'species_50', name: '50 Places Explorer', description: 'Discover 50 places', category: BADGE_CATEGORY.DISCOVERY, requirements: [{ type: 'places_count', value: 50 }], points: 100 },
  { id: 'ocean_guardian', name: 'Ocean Guardian', description: 'Contribute 10 marine observations', category: BADGE_CATEGORY.ECOLOGY, requirements: [{ type: 'marine_observations', value: 10 }], points: 75 },
  { id: 'forest_protector', name: 'Forest Protector', description: 'Discover 20 native flora species', category: BADGE_CATEGORY.ECOLOGY, requirements: [{ type: 'flora_count', value: 20 }], points: 75 },
  { id: 'biodiversity_observer', name: 'Biodiversity Observer', description: 'Record 25 validated observations', category: BADGE_CATEGORY.ECOLOGY, requirements: [{ type: 'validated_observations', value: 25 }], points: 100 },
  { id: 'kayak_guardian', name: 'Kayak Guardian', description: 'Complete 5 kayaking activities', category: BADGE_CATEGORY.SPORTS, requirements: [{ type: 'kayak_count', value: 5 }], points: 60 },
  { id: 'trail_explorer', name: 'Trail Explorer', description: 'Complete 10 hiking routes', category: BADGE_CATEGORY.SPORTS, requirements: [{ type: 'hiking_count', value: 10 }], points: 60 },
  { id: 'cycling_explorer', name: 'Cycling Explorer', description: 'Complete 10 cycling routes', category: BADGE_CATEGORY.SPORTS, requirements: [{ type: 'cycling_count', value: 10 }], points: 60 },
  { id: 'local_hero', name: 'Local Hero', description: 'Help 10 other visitors', category: BADGE_CATEGORY.COMMUNITY, requirements: [{ type: 'helped_visitors', value: 10 }], points: 50 },
  { id: 'mentor', name: 'Mentor', description: 'Guide 5 new visitors', category: BADGE_CATEGORY.COMMUNITY, requirements: [{ type: 'mentored_visitors', value: 5 }], points: 75 },
  { id: 'bird_observer', name: 'Bird Observer', description: 'Observe 15 different bird species', category: BADGE_CATEGORY.KNOWLEDGE, requirements: [{ type: 'bird_species', value: 15 }], points: 60 },
  { id: 'flora_expert', name: 'Native Flora Expert', description: 'Identify 25 native flora species', category: BADGE_CATEGORY.KNOWLEDGE, requirements: [{ type: 'flora_count', value: 25 }], points: 75 },
  { id: 'marine_specialist', name: 'Marine Specialist', description: 'Observe 15 marine species', category: BADGE_CATEGORY.KNOWLEDGE, requirements: [{ type: 'marine_species', value: 15 }], points: 75 },
]

export class BadgeEngine {
  #context = null
  #definitions = new Map()
  #awarded = new Map()

  constructor(context) {
    this.#context = context
    DEFAULT_BADGES.forEach(b => this.#definitions.set(b.id, b))
  }

  addBadgeDefinition(badge) {
    this.#definitions.set(badge.id, badge)
    return { success: true }
  }

  checkAndAward(visitorId, stats) {
    const awarded = []
    for (const [badgeId, badge] of this.#definitions) {
      if (this.#isAlreadyAwarded(visitorId, badgeId)) continue
      if (this.#meetsRequirements(badge, stats)) {
        this.#award(visitorId, badgeId)
        awarded.push(badge)
      }
    }
    return awarded
  }

  getAwarded(visitorId) {
    return this.#awarded.get(visitorId) || []
  }

  getByCategory(visitorId, category) {
    return this.getAwarded(visitorId).filter(b => b.category === category)
  }

  getBadgeDefinitions() {
    return Array.from(this.#definitions.values())
  }

  getProgress(visitorId, badgeId, stats) {
    const badge = this.#definitions.get(badgeId)
    if (!badge) return null
    const progress = badge.requirements.map(req => {
      const current = this.#getStatValue(stats, req.type)
      return {
        type: req.type,
        current: Math.min(current, req.value),
        target: req.value,
        complete: current >= req.value,
      }
    })
    const allComplete = progress.every(p => p.complete)
    return { badgeId, progress, allComplete }
  }

  #meetsRequirements(badge, stats) {
    return badge.requirements.every(req => {
      const value = this.#getStatValue(stats, req.type)
      return value >= req.value
    })
  }

  #getStatValue(stats, type) {
    if (!stats) return 0
    const mapping = {
      species_count: 'speciesDiscovered',
      places_count: 'placesVisited',
      marine_observations: 'marineObservations',
      flora_count: 'floraDiscovered',
      validated_observations: 'validatedObservations',
      kayak_count: 'kayakActivities',
      hiking_count: 'hikingActivities',
      cycling_count: 'cyclingActivities',
      helped_visitors: 'helpedVisitors',
      mentored_visitors: 'mentoredVisitors',
      bird_species: 'birdSpecies',
      marine_species: 'marineSpecies',
    }
    return stats[mapping[type]] || 0
  }

  #isAlreadyAwarded(visitorId, badgeId) {
    const list = this.#awarded.get(visitorId) || []
    return list.some(b => b.id === badgeId)
  }

  #award(visitorId, badgeId) {
    const badge = this.#definitions.get(badgeId)
    if (!this.#awarded.has(visitorId)) this.#awarded.set(visitorId, [])
    this.#awarded.get(visitorId).push({ ...badge, awardedAt: new Date().toISOString() })
    this.#emitEvent(ENGAGEMENT_EVENTS.BADGE_AWARDED, { visitorId, badgeId, badge })
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
