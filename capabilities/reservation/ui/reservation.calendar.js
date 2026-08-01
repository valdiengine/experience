/**
 * Reservation Calendar — Business-agnostic date selection
 *
 * Features:
 * - Display available dates
 * - Block unavailable dates
 * - Support date ranges
 * - Support minimum stay rules
 * - Tenant configurable behavior
 *
 * Does NOT contain business logic — only date rendering and selection
 */
export class ReservationCalendar {
  #context = null
  #config = null
  #selectedStart = null
  #selectedEnd = null
  #availability = new Map()
  #minStay = 1
  #maxStay = 365

  constructor(context, config = {}) {
    this.#context = context
    this.#config = config
    if (config.minStay) this.#minStay = config.minStay
    if (config.maxStay) this.#maxStay = config.maxStay
  }

  /**
   * Load availability for a month
   * @param {number} year
   * @param {number} month (0-11)
   * @returns {Promise<object[]>}
   */
  async loadMonth(year, month) {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    const dates = []

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      const startDate = this.#formatDate(start)
      const endDate = this.#formatDate(end)

      const availabilityData = await availability.checkAvailability({
        startDate,
        endDate,
        resourceId: this.#config.resourceId,
      })

      for (const item of (availabilityData?.dates || [])) {
        this.#availability.set(item.date, item)
      }
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.#formatDate(d)
      const avail = this.#availability.get(dateStr)

      dates.push({
        date: dateStr,
        day: d.getDate(),
        dayOfWeek: d.getDay(),
        available: avail?.status !== 'unavailable',
        isPast: d < new Date(new Date().toDateString()),
        isToday: d.toDateString() === new Date().toDateString(),
      })
    }

    return dates
  }

  /**
   * Select a date
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {{ valid: boolean, range?: object, error?: string }}
   */
  selectDate(dateStr) {
    const date = this.#availability.get(dateStr)
    if (date && date.status === 'unavailable') {
      return { valid: false, error: 'Date not available' }
    }

    const selected = new Date(dateStr)
    if (selected < new Date(new Date().toDateString())) {
      return { valid: false, error: 'Cannot select past dates' }
    }

    if (!this.#selectedStart) {
      this.#selectedStart = dateStr
      this.#selectedEnd = null
      return { valid: true, range: { start: dateStr, end: null } }
    }

    const start = new Date(this.#selectedStart)
    const end = new Date(dateStr)

    if (end <= start) {
      this.#selectedStart = dateStr
      this.#selectedEnd = null
      return { valid: true, range: { start: dateStr, end: null } }
    }

    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    if (nights < this.#minStay) {
      return { valid: false, error: `Minimum stay is ${this.#minStay} night(s)` }
    }
    if (nights > this.#maxStay) {
      return { valid: false, error: `Maximum stay is ${this.#maxStay} nights` }
    }

    if (!this.#isRangeAvailable(this.#selectedStart, dateStr)) {
      return { valid: false, error: 'Selected range contains unavailable dates' }
    }

    this.#selectedEnd = dateStr
    return {
      valid: true,
      range: {
        start: this.#selectedStart,
        end: this.#selectedEnd,
        nights,
      },
    }
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.#selectedStart = null
    this.#selectedEnd = null
  }

  /**
   * Get current selection
   * @returns {{ start: string|null, end: string|null }}
   */
  getSelection() {
    return {
      start: this.#selectedStart,
      end: this.#selectedEnd,
    }
  }

  /**
   * Check if a date is selected
   * @param {string} dateStr
   * @returns {boolean}
   */
  isSelected(dateStr) {
    if (!this.#selectedStart) return false
    if (dateStr === this.#selectedStart) return true
    if (!this.#selectedEnd) return false
    const d = new Date(dateStr)
    return d > new Date(this.#selectedStart) && d < new Date(this.#selectedEnd)
  }

  /**
   * Check if date is start of selection
   * @param {string} dateStr
   * @returns {boolean}
   */
  isStart(dateStr) {
    return dateStr === this.#selectedStart
  }

  /**
   * Check if date is end of selection
   * @param {string} dateStr
   * @returns {boolean}
   */
  isEnd(dateStr) {
    return dateStr === this.#selectedEnd
  }

  /**
   * Get month name
   * @param {number} month (0-11)
   * @returns {string}
   */
  getMonthName(month) {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return names[month]
  }

  /**
   * Get day names
   * @returns {string[]}
   */
  getDayNames() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  }

  // ── Private Methods ──

  #isRangeAvailable(startStr, endStr) {
    const start = new Date(startStr)
    const end = new Date(endStr)

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.#formatDate(d)
      const avail = this.#availability.get(dateStr)
      if (avail && avail.status === 'unavailable') {
        return false
      }
    }

    return true
  }

  #formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}
