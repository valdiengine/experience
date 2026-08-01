/**
 * Checklist Manager — Onboarding checklists per business type
 *
 * Business-agnostic: configurable checklists, not tied to specific industries
 */

export class ChecklistManager {
  #checklists = new Map()

  constructor() {
    this.#registerDefaults()
  }

  /**
   * Get checklist for a business type
   * @param {string} businessType
   * @returns {object[]}
   */
  getChecklist(businessType) {
    return this.#checklists.get(businessType) || this.#checklists.get('service') || []
  }

  /**
   * Register a checklist
   * @param {string} businessType
   * @param {object[]} items - [{ id, name, description, category, required }]
   * @returns {object}
   */
  register(businessType, items) {
    if (!businessType) return { success: false, error: 'Business type is required' }
    if (!items?.length) return { success: false, error: 'Checklist items required' }

    this.#checklists.set(businessType, items)
    return { success: true, businessType, itemCount: items.length }
  }

  /**
   * Get checklist progress
   * @param {string} businessType
   * @param {string[]} completedIds
   * @returns {object}
   */
  getProgress(businessType, completedIds = []) {
    const checklist = this.getChecklist(businessType)
    const total = checklist.length
    const completed = checklist.filter(item => completedIds.includes(item.id)).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    const remaining = checklist
      .filter(item => !completedIds.includes(item.id))
      .map(item => ({ id: item.id, name: item.name, category: item.category }))

    return {
      percentage,
      completed,
      total,
      remaining,
      isComplete: percentage === 100,
    }
  }

  /**
   * Get all checklists
   * @returns {object}
   */
  getAll() {
    const result = {}
    for (const [type, items] of this.#checklists) {
      result[type] = items
    }
    return result
  }

  #registerDefaults() {
    this.#checklists.set('accommodation', [
      { id: 'business_registered', name: 'Business registered', category: 'setup', required: true },
      { id: 'profile_completed', name: 'Profile completed', category: 'setup', required: true },
      { id: 'photos_uploaded', name: 'Photos uploaded', category: 'content', required: true },
      { id: 'rooms_defined', name: 'Rooms defined', category: 'inventory', required: true },
      { id: 'pricing_set', name: 'Pricing set', category: 'pricing', required: true },
      { id: 'availability_configured', name: 'Availability configured', category: 'operations', required: true },
      { id: 'reservation_activated', name: 'Reservation activated', category: 'operations', required: true },
      { id: 'pwa_installed', name: 'PWA installed', category: 'technology', required: false },
      { id: 'communication_enabled', name: 'Communication enabled', category: 'operations', required: true },
      { id: 'first_reservation', name: 'First reservation received', category: 'milestone', required: false },
    ])

    this.#checklists.set('tourism', [
      { id: 'business_registered', name: 'Business registered', category: 'setup', required: true },
      { id: 'profile_completed', name: 'Profile completed', category: 'setup', required: true },
      { id: 'services_added', name: 'Services added', category: 'content', required: true },
      { id: 'pricing_set', name: 'Pricing set', category: 'pricing', required: true },
      { id: 'availability_configured', name: 'Availability configured', category: 'operations', required: true },
      { id: 'contact_enabled', name: 'Contact channels enabled', category: 'operations', required: true },
      { id: 'pwa_installed', name: 'PWA installed', category: 'technology', required: false },
      { id: 'first_booking', name: 'First booking received', category: 'milestone', required: false },
    ])

    this.#checklists.set('restaurant', [
      { id: 'business_registered', name: 'Business registered', category: 'setup', required: true },
      { id: 'profile_completed', name: 'Profile completed', category: 'setup', required: true },
      { id: 'menu_uploaded', name: 'Menu uploaded', category: 'content', required: true },
      { id: 'hours_configured', name: 'Hours configured', category: 'operations', required: true },
      { id: 'contact_enabled', name: 'Contact channels enabled', category: 'operations', required: true },
      { id: 'pwa_installed', name: 'PWA installed', category: 'technology', required: false },
      { id: 'first_order', name: 'First order received', category: 'milestone', required: false },
    ])

    this.#checklists.set('service', [
      { id: 'business_registered', name: 'Business registered', category: 'setup', required: true },
      { id: 'profile_completed', name: 'Profile completed', category: 'setup', required: true },
      { id: 'services_defined', name: 'Services defined', category: 'content', required: true },
      { id: 'pricing_set', name: 'Pricing set', category: 'pricing', required: true },
      { id: 'contact_enabled', name: 'Contact channels enabled', category: 'operations', required: true },
      { id: 'pwa_installed', name: 'PWA installed', category: 'technology', required: false },
      { id: 'first_inquiry', name: 'First inquiry received', category: 'milestone', required: false },
    ])
  }
}
