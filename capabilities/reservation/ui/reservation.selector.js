/**
 * Reservation Selector — Resource and date selection logic
 *
 * Business-agnostic: selects resources and dates, no business logic
 * Communicates with AvailabilityCapability via context
 */
export class ReservationSelector {
  #context = null
  #config = null
  #resources = []
  #selectedResource = null

  constructor(context, config = {}) {
    this.#context = context
    this.#config = config
  }

  /**
   * Load available resources for a tenant
   * @returns {Promise<object[]>}
   */
  async loadResources() {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability && availability.getResources) {
      this.#resources = await availability.getResources()
    }
    return this.#resources
  }

  /**
   * Select a resource
   * @param {string} resourceId
   * @returns {{ valid: boolean, resource?: object, error?: string }}
   */
  selectResource(resourceId) {
    const resource = this.#resources.find(r => r.id === resourceId)
    if (!resource) {
      return { valid: false, error: 'Resource not found' }
    }

    this.#selectedResource = resource
    return { valid: true, resource }
  }

  /**
   * Get selected resource
   * @returns {object|null}
   */
  getSelectedResource() {
    return this.#selectedResource
  }

  /**
   * Clear resource selection
   */
  clearSelection() {
    this.#selectedResource = null
  }

  /**
   * Check availability for selected resource and date range
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<object>}
   */
  async checkAvailability(startDate, endDate) {
    if (!this.#selectedResource) {
      return { available: false, error: 'No resource selected' }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      return availability.checkAvailability({
        resourceId: this.#selectedResource.id,
        startDate,
        endDate,
      })
    }

    return { available: true, dates: [] }
  }

  /**
   * Reserve dates for selected resource
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<object>}
   */
  async reserveDates(startDate, endDate) {
    if (!this.#selectedResource) {
      return { success: false, error: 'No resource selected' }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      return availability.reserveDates({
        resourceId: this.#selectedResource.id,
        startDate,
        endDate,
      })
    }

    return { success: true }
  }

  /**
   * Release dates for selected resource
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<object>}
   */
  async releaseDates(startDate, endDate) {
    if (!this.#selectedResource) {
      return { success: false, error: 'No resource selected' }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      return availability.releaseDates({
        resourceId: this.#selectedResource.id,
        startDate,
        endDate,
      })
    }

    return { success: true }
  }

  /**
   * Get all resources
   * @returns {object[]}
   */
  getResources() {
    return this.#resources
  }

  /**
   * Get resource by ID
   * @param {string} resourceId
   * @returns {object|null}
   */
  getResource(resourceId) {
    return this.#resources.find(r => r.id === resourceId) || null
  }
}
