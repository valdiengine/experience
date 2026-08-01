/**
 * Availability View — Availability management for owner
 *
 * Business-agnostic: block dates, open dates, write natural language
 * Uses AvailabilityCapability — no duplication
 */
export class AvailabilityView {
  #context = null
  #container = null
  #owner = null

  constructor(context) {
    this.#context = context
  }

  async render(container) {
    this.#container = container
    this.#owner = this.#context?.capabilities?.get?.('owner')
    if (!this.#owner) {
      container.innerHTML = '<div class="owner-error">Owner capability not available</div>'
      return
    }

    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + 1)
    const startDate = today.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const availability = await this.#owner.getAvailability(startDate, endDate)
    container.innerHTML = this.#buildHTML(availability, startDate, endDate)
    this.#bindEvents()
  }

  #buildHTML(dates, startDate, endDate) {
    return `
      <div class="owner-availability">
        <header class="owner-view-header">
          <h1 class="owner-view-title">Availability</h1>
        </header>

        <div class="owner-availability__actions">
          <div class="owner-availability__section">
            <h3 class="owner-availability__section-title">Quick Block</h3>
            <div class="owner-availability__form">
              <label class="owner-label">Date</label>
              <input type="date" class="owner-input" data-field="block-date" min="${startDate}" max="${endDate}">
              <label class="owner-label">Notes</label>
              <input type="text" class="owner-input" data-field="block-notes" placeholder="Optional reason">
              <button class="owner-btn owner-btn--block" data-action="block-single">Block Date</button>
            </div>
          </div>

          <div class="owner-availability__section">
            <h3 class="owner-availability__section-title">Quick Open</h3>
            <div class="owner-availability__form">
              <label class="owner-label">Date</label>
              <input type="date" class="owner-input" data-field="open-date" min="${startDate}" max="${endDate}">
              <button class="owner-btn owner-btn--open" data-action="open-single">Open Date</button>
            </div>
          </div>
        </div>

        <div class="owner-availability__section">
          <h3 class="owner-availability__section-title">Write Availability (Natural Language)</h3>
          <div class="owner-availability__form">
            <textarea class="owner-textarea" data-field="nl-input" rows="3"
              placeholder="Example: Free from January 10 to 15. All February except carnival."></textarea>
            <button class="owner-btn owner-btn--primary" data-action="parse-nl">Parse & Save</button>
          </div>
        </div>

        <div class="owner-availability__section">
          <h3 class="owner-availability__section-title">Calendar (${startDate} → ${endDate})</h3>
          <div class="owner-calendar-grid">
            ${this.#buildCalendarGrid(dates, startDate, endDate)}
          </div>
        </div>
      </div>
    `
  }

  #buildCalendarGrid(dates, startDate, endDate) {
    const dateMap = new Map()
    for (const d of dates) {
      dateMap.set(d.date, d)
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const cells = []

    while (start <= end) {
      const dateStr = start.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      const status = entry?.status || 'unknown'
      cells.push(`
        <div class="owner-calendar-cell owner-calendar-cell--${status}" data-date="${dateStr}">
          <span class="owner-calendar-cell__date">${start.getDate()}</span>
          <span class="owner-calendar-cell__status">${status}</span>
        </div>
      `)
      start.setDate(start.getDate() + 1)
    }

    return cells.join('')
  }

  #bindEvents() {
    if (!this.#container) return

    this.#container.querySelector('[data-action="block-single"]')?.addEventListener('click', async () => {
      const date = this.#container.querySelector('[data-field="block-date"]')?.value
      const notes = this.#container.querySelector('[data-field="block-notes"]')?.value || ''
      if (!date) return alert('Please select a date')
      const result = await this.#owner.blockDates([date], notes)
      if (result.success) this.render(this.#container)
    })

    this.#container.querySelector('[data-action="open-single"]')?.addEventListener('click', async () => {
      const date = this.#container.querySelector('[data-field="open-date"]')?.value
      if (!date) return alert('Please select a date')
      const result = await this.#owner.openDates([date])
      if (result.success) this.render(this.#container)
    })

    this.#container.querySelector('[data-action="parse-nl"]')?.addEventListener('click', async () => {
      const text = this.#container.querySelector('[data-field="nl-input"]')?.value
      if (!text) return alert('Please enter availability text')
      const result = await this.#owner.writeAvailabilityNaturalLanguage(text)
      if (result.success) {
        alert(`Parsed ${result.dates?.length || 0} dates`)
        this.render(this.#container)
      } else {
        alert('Could not parse availability text')
      }
    })
  }

  destroy() {
    this.#container = null
    this.#owner = null
  }
}
