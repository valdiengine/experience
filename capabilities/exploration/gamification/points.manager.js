/**
 * Points Manager — Points tracking and calculation
 */
import { POINT_CATEGORY } from '../exploration.schema.js'

const POINT_VALUES = {
  // Exploration
  visit_place: { category: POINT_CATEGORY.EXPLORATION, points: 10 },
  discover_destination: { category: POINT_CATEGORY.EXPLORATION, points: 50 },
  complete_route: { category: POINT_CATEGORY.EXPLORATION, points: 25 },
  visit_locality: { category: POINT_CATEGORY.EXPLORATION, points: 20 },
  complete_locality: { category: POINT_CATEGORY.EXPLORATION, points: 100 },
  // Ecology
  record_observation: { category: POINT_CATEGORY.ECOLOGY, points: 10 },
  validated_observation: { category: POINT_CATEGORY.ECOLOGY, points: 25 },
  new_species_record: { category: POINT_CATEGORY.ECOLOGY, points: 50 },
  endangered_observation: { category: POINT_CATEGORY.ECOLOGY, points: 75 },
  conservation_activity: { category: POINT_CATEGORY.ECOLOGY, points: 100 },
  lead_eco_tour: { category: POINT_CATEGORY.ECOLOGY, points: 150 },
  // Community
  create_memory: { category: POINT_CATEGORY.COMMUNITY, points: 10 },
  write_review: { category: POINT_CATEGORY.COMMUNITY, points: 5 },
  confirm_observation: { category: POINT_CATEGORY.COMMUNITY, points: 5 },
  help_visitor: { category: POINT_CATEGORY.COMMUNITY, points: 15 },
  share_knowledge: { category: POINT_CATEGORY.COMMUNITY, points: 20 },
  // Local Support
  visit_business: { category: POINT_CATEGORY.LOCAL_SUPPORT, points: 10 },
  complete_experience: { category: POINT_CATEGORY.LOCAL_SUPPORT, points: 15 },
  review_business: { category: POINT_CATEGORY.LOCAL_SUPPORT, points: 5 },
  recommend_business: { category: POINT_CATEGORY.LOCAL_SUPPORT, points: 10 },
  support_conservation: { category: POINT_CATEGORY.LOCAL_SUPPORT, points: 25 },
}

export class PointsManager {
  #context = null

  constructor(context) {
    this.#context = context
  }

  calculatePoints(action) {
    const config = POINT_VALUES[action]
    if (!config) return { success: false, error: 'Unknown action: ' + action }
    return { success: true, category: config.category, points: config.points }
  }

  awardPoints(profile, action, multiplier = 1) {
    const result = this.calculatePoints(action)
    if (!result.success) return result
    const total = Math.floor(result.points * multiplier)
    return { success: true, points: total, category: result.category }
  }

  getPointsByCategory(profile) {
    return {
      exploration: profile.explorationPoints || 0,
      ecology: profile.ecologicalPoints || 0,
      community: profile.communityPoints || 0,
      localSupport: profile.localSupportPoints || 0,
    }
  }

  getAvailableActions() {
    return Object.entries(POINT_VALUES).map(([action, config]) => ({
      action,
      category: config.category,
      points: config.points,
    }))
  }
}
