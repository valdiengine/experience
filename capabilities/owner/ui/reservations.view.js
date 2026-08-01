/**
 * Reservations View — Reservation management for owner
 *
 * Business-agnostic: view, confirm, reject, cancel reservations
 * Mobile-first: large buttons, clear status indicators
 */
export class ReservationsView {
  #context = null
  #container = null
  #owner = null
  #currentFilter = 'all'

  constructor(context) {
    this.#context = context
  }

  async render(container, options = {}) {
    this.#container = container
    this.#owner = this.#context?.capabilities?.get?.('owner')
    if (!this.#owner) {
      container.innerHTML = '<div class="owner-error">Owner capability not available</div>'
      return
    }

    if (options.reservationId) {
      await this.#renderDetail(container, options.reservationId)
      return
    }

    const reservations = await this.#owner.getReservations()
    container.innerHTML = this.#buildListHTML(reservations)
    this.#bindListEvents()
  }

  #buildListHTML(reservations) {
    const pending = reservations.filter(r => r.status === 'requested' || r.status === 'owner_pending')
    const confirmed = reservations.filter(r => r.status === 'confirmed')
    const other = reservations.filter(r => !['requested', 'owner_pending', 'confirmed'].includes(r.status))

    return `
      <div class="owner-reservations">
        <header class="owner-view-header">
          <h1 class="owner-view-title">Reservations</h1>
        </header>

        <div class="owner-filter-bar">
          <button class="owner-filter-btn owner-filter-btn--active" data-filter="all">All (${reservations.length})</button>
          <button class="owner-filter-btn" data-filter="pending">Pending (${pending.length})</button>
          <button class="owner-filter-btn" data-filter="confirmed">Confirmed (${confirmed.length})</button>
          <button class="owner-filter-btn" data-filter="other">Other (${other.length})</button>
        </div>

        <div class="owner-reservation-list" data-filter="all">
          ${pending.length > 0 ? `
            <div class="owner-reservation-section">
              <h3 class="owner-reservation-section__title">Pending Confirmation</h3>
              ${pending.map(r => this.#buildReservationCard(r)).join('')}
            </div>
          ` : ''}

          ${confirmed.length > 0 ? `
            <div class="owner-reservation-section">
              <h3 class="owner-reservation-section__title">Confirmed</h3>
              ${confirmed.map(r => this.#buildReservationCard(r)).join('')}
            </div>
          ` : ''}

          ${other.length > 0 ? `
            <div class="owner-reservation-section">
              <h3 class="owner-reservation-section__title">Other</h3>
              ${other.map(r => this.#buildReservationCard(r)).join('')}
            </div>
          ` : ''}

          ${reservations.length === 0 ? '<div class="owner-empty">No reservations yet</div>' : ''}
        </div>
      </div>
    `
  }

  #buildReservationCard(r) {
    const isPending = r.status === 'requested' || r.status === 'owner_pending'
    return `
      <div class="owner-reservation-card" data-reservation-id="${r.id}">
        <div class="owner-reservation-card__header">
          <span class="owner-reservation-card__name">${r.customer?.name || 'Unknown'}</span>
          <span class="owner-status owner-status--${r.status}">${r.status}</span>
        </div>
        <div class="owner-reservation-card__details">
          <div class="owner-reservation-card__dates">
            ${r.dates?.checkIn || 'No date'} → ${r.dates?.checkOut || 'No date'}
          </div>
          ${r.customer?.email ? `<div class="owner-reservation-card__email">${r.customer.email}</div>` : ''}
          ${r.customer?.phone ? `<div class="owner-reservation-card__phone">${r.customer.phone}</div>` : ''}
        </div>
        ${isPending ? `
          <div class="owner-reservation-card__actions">
            <button class="owner-btn owner-btn--confirm" data-action="confirm" data-id="${r.id}">Confirm</button>
            <button class="owner-btn owner-btn--reject" data-action="reject" data-id="${r.id}">Reject</button>
          </div>
        ` : `
          <div class="owner-reservation-card__actions">
            ${r.status !== 'cancelled' ? `
              <button class="owner-btn owner-btn--cancel" data-action="cancel" data-id="${r.id}">Cancel</button>
            ` : ''}
          </div>
        `}
      </div>
    `
  }

  async #renderDetail(container, reservationId) {
    const reservation = await this.#owner.getReservationById(reservationId)
    if (!reservation) {
      container.innerHTML = '<div class="owner-empty">Reservation not found</div>'
      return
    }

    container.innerHTML = `
      <div class="owner-reservation-detail">
        <header class="owner-view-header">
          <button class="owner-back-btn" data-action="back">← Back</button>
          <h1 class="owner-view-title">Reservation Details</h1>
        </header>

        <div class="owner-detail-card">
          <div class="owner-detail-row">
            <span class="owner-detail-label">Status</span>
            <span class="owner-status owner-status--${reservation.status}">${reservation.status}</span>
          </div>
          <div class="owner-detail-row">
            <span class="owner-detail-label">Customer</span>
            <span class="owner-detail-value">${reservation.customer?.name || 'Unknown'}</span>
          </div>
          ${reservation.customer?.email ? `
          <div class="owner-detail-row">
            <span class="owner-detail-label">Email</span>
            <span class="owner-detail-value">${reservation.customer.email}</span>
          </div>
          ` : ''}
          ${reservation.customer?.phone ? `
          <div class="owner-detail-row">
            <span class="owner-detail-label">Phone</span>
            <span class="owner-detail-value">${reservation.customer.phone}</span>
          </div>
          ` : ''}
          <div class="owner-detail-row">
            <span class="owner-detail-label">Check-in</span>
            <span class="owner-detail-value">${reservation.dates?.checkIn || 'Not set'}</span>
          </div>
          <div class="owner-detail-row">
            <span class="owner-detail-label">Check-out</span>
            <span class="owner-detail-value">${reservation.dates?.checkOut || 'Not set'}</span>
          </div>
          ${reservation.guests ? `
          <div class="owner-detail-row">
            <span class="owner-detail-label">Guests</span>
            <span class="owner-detail-value">${reservation.guests}</span>
          </div>
          ` : ''}
          ${reservation.notes ? `
          <div class="owner-detail-row">
            <span class="owner-detail-label">Notes</span>
            <span class="owner-detail-value">${reservation.notes}</span>
          </div>
          ` : ''}
          <div class="owner-detail-row">
            <span class="owner-detail-label">Created</span>
            <span class="owner-detail-value">${new Date(reservation.createdAt).toLocaleString()}</span>
          </div>
        </div>

        ${(reservation.status === 'requested' || reservation.status === 'owner_pending') ? `
        <div class="owner-detail-actions">
          <button class="owner-btn owner-btn--confirm owner-btn--large" data-action="confirm" data-id="${reservation.id}">Confirm Reservation</button>
          <button class="owner-btn owner-btn--reject owner-btn--large" data-action="reject" data-id="${reservation.id}">Reject</button>
        </div>
        ` : ''}
      </div>
    `

    this.#bindDetailEvents()
  }

  #bindListEvents() {
    if (!this.#container) return

    this.#container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter
        this.#currentFilter = filter
        this.#container.querySelectorAll('.owner-filter-btn').forEach(b => b.classList.remove('owner-filter-btn--active'))
        e.currentTarget.classList.add('owner-filter-btn--active')
      })
    })

    this.#container.querySelectorAll('[data-reservation-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return
        const id = e.currentTarget.dataset.reservationId
        this.#renderDetail(this.#container, id)
      })
    })

    this.#container.querySelectorAll('[data-action="confirm"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        const result = await this.#owner.confirmReservation(id)
        if (result.success) {
          this.render(this.#container)
        }
      })
    })

    this.#container.querySelectorAll('[data-action="reject"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        const reason = prompt('Rejection reason (optional):')
        const result = await this.#owner.rejectReservation(id, reason || '')
        if (result.success) {
          this.render(this.#container)
        }
      })
    })

    this.#container.querySelectorAll('[data-action="cancel"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = e.currentTarget.dataset.id
        if (confirm('Are you sure you want to cancel this reservation?')) {
          const reason = prompt('Cancellation reason (optional):')
          const result = await this.#owner.cancelReservation(id, reason || '')
          if (result.success) {
            this.render(this.#container)
          }
        }
      })
    })
  }

  #bindDetailEvents() {
    if (!this.#container) return

    this.#container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.render(this.#container)
    })

    this.#container.querySelector('[data-action="confirm"]')?.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id
      const result = await this.#owner.confirmReservation(id)
      if (result.success) {
        this.render(this.#container)
      }
    })

    this.#container.querySelector('[data-action="reject"]')?.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id
      const reason = prompt('Rejection reason (optional):')
      const result = await this.#owner.rejectReservation(id, reason || '')
      if (result.success) {
        this.render(this.#container)
      }
    })
  }

  destroy() {
    this.#container = null
    this.#owner = null
  }
}
