/**
 * Metrics View — System metrics and health for owner
 *
 * Business-agnostic: uses ObservabilityCapability for metrics
 * Displays reservation counts, conversion, occupancy, alerts
 */
export class MetricsView {
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

    const metrics = this.#owner.getMetrics()
    const alerts = this.#owner.getActiveAlerts()
    const reservations = await this.#owner.getReservations()

    container.innerHTML = this.#buildHTML(metrics, alerts, reservations)
    this.#bindEvents()
  }

  #buildHTML(metrics, alerts, reservations) {
    const total = reservations.length
    const confirmed = reservations.filter(r => r.status === 'confirmed').length
    const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0
    const pending = reservations.filter(r => r.status === 'requested' || r.status === 'owner_pending').length
    const cancelled = reservations.filter(r => r.status === 'cancelled').length

    return `
      <div class="owner-metrics">
        <header class="owner-view-header">
          <h1 class="owner-view-title">Metrics & Health</h1>
        </header>

        <div class="owner-metrics__cards">
          <div class="owner-metric-card">
            <div class="owner-metric-card__value">${total}</div>
            <div class="owner-metric-card__label">Total Reservations</div>
          </div>
          <div class="owner-metric-card">
            <div class="owner-metric-card__value">${conversionRate}%</div>
            <div class="owner-metric-card__label">Conversion Rate</div>
          </div>
          <div class="owner-metric-card">
            <div class="owner-metric-card__value">${confirmed}</div>
            <div class="owner-metric-card__label">Confirmed</div>
          </div>
          <div class="owner-metric-card">
            <div class="owner-metric-card__value">${pending}</div>
            <div class="owner-metric-card__label">Pending</div>
          </div>
          <div class="owner-metric-card">
            <div class="owner-metric-card__value">${cancelled}</div>
            <div class="owner-metric-card__label">Cancelled</div>
          </div>
        </div>

        ${metrics && Object.keys(metrics).length > 0 ? `
        <div class="owner-metrics__section">
          <h3 class="owner-metrics__section-title">System Metrics</h3>
          <div class="owner-metrics-grid">
            ${metrics.reservation ? `
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Reservations Created</span>
                <span class="owner-metric-row__value">${metrics.reservation.created || 0}</span>
              </div>
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Reservations Expired</span>
                <span class="owner-metric-row__value">${metrics.reservation.expired || 0}</span>
              </div>
            ` : ''}
            ${metrics.communication ? `
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Messages Sent</span>
                <span class="owner-metric-row__value">${metrics.communication.sent || 0}</span>
              </div>
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Messages Failed</span>
                <span class="owner-metric-row__value">${metrics.communication.failed || 0}</span>
              </div>
            ` : ''}
            ${metrics.notification ? `
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Notifications Sent</span>
                <span class="owner-metric-row__value">${metrics.notification.sent || 0}</span>
              </div>
              <div class="owner-metric-row">
                <span class="owner-metric-row__label">Notifications Failed</span>
                <span class="owner-metric-row__value">${metrics.notification.failed || 0}</span>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${alerts.length > 0 ? `
        <div class="owner-metrics__section">
          <h3 class="owner-metrics__section-title">Active Alerts (${alerts.length})</h3>
          <div class="owner-alert-list">
            ${alerts.map(a => `
              <div class="owner-alert owner-alert--${a.severity}">
                <span class="owner-alert__severity">${a.severity}</span>
                <span class="owner-alert__message">${a.message}</span>
                <span class="owner-alert__category">${a.category}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `
        <div class="owner-metrics__section">
          <h3 class="owner-metrics__section-title">System Status</h3>
          <div class="owner-status-ok">All systems operational</div>
        </div>
        `}
      </div>
    `
  }

  #bindEvents() {
    if (!this.#container) return

    this.#container.querySelectorAll('.owner-alert').forEach(alert => {
      alert.addEventListener('click', () => {
        alert.classList.toggle('owner-alert--expanded')
      })
    })
  }

  destroy() {
    this.#container = null
    this.#owner = null
  }
}
