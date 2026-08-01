/**
 * Dashboard View — Main owner dashboard
 *
 * Business-agnostic: displays overview of reservations, availability, customers
 * Mobile-first: large buttons, simple navigation
 */
export class DashboardView {
  #context = null
  #container = null
  #owner = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Render dashboard into container
   * @param {HTMLElement} container
   */
  async render(container) {
    this.#container = container
    this.#owner = this.#context?.capabilities?.get?.('owner')
    if (!this.#owner) {
      container.innerHTML = '<div class="owner-error">Owner capability not available</div>'
      return
    }

    const data = await this.#owner.getDashboardData()
    container.innerHTML = this.#buildHTML(data)
    this.#bindEvents()
  }

  #buildHTML(data) {
    return `
      <div class="owner-dashboard">
        <header class="owner-dashboard__header">
          <h1 class="owner-dashboard__title">Dashboard</h1>
          <span class="owner-dashboard__date">${new Date().toLocaleDateString()}</span>
        </header>

        <div class="owner-dashboard__stats">
          <div class="owner-stat-card" data-section="reservations">
            <div class="owner-stat-card__value">${data.reservations?.pending || 0}</div>
            <div class="owner-stat-card__label">Pending</div>
          </div>
          <div class="owner-stat-card" data-section="reservations">
            <div class="owner-stat-card__value">${data.reservations?.confirmed || 0}</div>
            <div class="owner-stat-card__label">Confirmed</div>
          </div>
          <div class="owner-stat-card" data-section="availability">
            <div class="owner-stat-card__value">${data.availability?.available || 0}</div>
            <div class="owner-stat-card__label">Available</div>
          </div>
          <div class="owner-stat-card" data-section="customers">
            <div class="owner-stat-card__value">${data.customers?.total || 0}</div>
            <div class="owner-stat-card__label">Customers</div>
          </div>
        </div>

        <div class="owner-dashboard__quick-actions">
          <h2 class="owner-dashboard__section-title">Quick Actions</h2>
          <div class="owner-actions-grid">
            <button class="owner-action-btn" data-action="reservations">
              <span class="owner-action-btn__icon">&#128197;</span>
              <span class="owner-action-btn__label">Reservations</span>
            </button>
            <button class="owner-action-btn" data-action="availability">
              <span class="owner-action-btn__icon">&#128198;</span>
              <span class="owner-action-btn__label">Availability</span>
            </button>
            <button class="owner-action-btn" data-action="customers">
              <span class="owner-action-btn__icon">&#128101;</span>
              <span class="owner-action-btn__label">Customers</span>
            </button>
            <button class="owner-action-btn" data-action="messages">
              <span class="owner-action-btn__icon">&#9993;</span>
              <span class="owner-action-btn__label">Messages</span>
            </button>
          </div>
        </div>

        <div class="owner-dashboard__recent">
          <h2 class="owner-dashboard__section-title">Recent Reservations</h2>
          <div class="owner-recent-list">
            ${(data.reservations?.recent || []).map(r => `
              <div class="owner-recent-item" data-reservation-id="${r.id}">
                <div class="owner-recent-item__info">
                  <span class="owner-recent-item__name">${r.customer?.name || 'Unknown'}</span>
                  <span class="owner-recent-item__dates">${r.dates?.checkIn || ''} → ${r.dates?.checkOut || ''}</span>
                </div>
                <span class="owner-recent-item__status owner-status--${r.status}">${r.status}</span>
              </div>
            `).join('')}
            ${(!data.reservations?.recent || data.reservations.recent.length === 0) ? '<div class="owner-empty">No recent reservations</div>' : ''}
          </div>
        </div>

        ${data.metrics && Object.keys(data.metrics).length > 0 ? `
        <div class="owner-dashboard__metrics">
          <h2 class="owner-dashboard__section-title">System Health</h2>
          <div class="owner-metrics-grid">
            ${data.metrics.reservation ? `
              <div class="owner-metric">
                <span class="owner-metric__label">Reservations</span>
                <span class="owner-metric__value">${data.metrics.reservation.created || 0} created</span>
              </div>
            ` : ''}
            ${data.metrics.communication ? `
              <div class="owner-metric">
                <span class="owner-metric__label">Messages</span>
                <span class="owner-metric__value">${data.metrics.communication.sent || 0} sent</span>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    `
  }

  #bindEvents() {
    if (!this.#container) return

    this.#container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action
        this.#onNavigate(action)
      })
    })

    this.#container.querySelectorAll('[data-reservation-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.reservationId
        this.#onReservationClick(id)
      })
    })
  }

  #onNavigate(section) {
    this.#context?.eventBus?.emit('owner:navigate', { section })
  }

  #onReservationClick(reservationId) {
    this.#context?.eventBus?.emit('owner:navigate', { section: 'reservations', reservationId })
  }

  destroy() {
    if (this.#container) {
      this.#container.querySelectorAll('[data-action]').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true))
      })
      this.#container.querySelectorAll('[data-reservation-id]').forEach(item => {
        item.replaceWith(item.cloneNode(true))
      })
    }
    this.#container = null
    this.#owner = null
  }
}
