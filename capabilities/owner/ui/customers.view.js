/**
 * Customers View — Customer management for owner
 *
 * Business-agnostic: view customers, view history, add notes
 * Uses DataManager through reservation capability
 */
export class CustomersView {
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

    const customers = this.#owner.getCustomers()
    container.innerHTML = this.#buildHTML(customers)
    this.#bindEvents()
  }

  #buildHTML(customers) {
    return `
      <div class="owner-customers">
        <header class="owner-view-header">
          <h1 class="owner-view-title">Customers</h1>
          <span class="owner-view-count">${customers.length} total</span>
        </header>

        <div class="owner-customers__search">
          <input type="text" class="owner-input owner-input--search" data-field="search"
            placeholder="Search by name, email, or country...">
        </div>

        <div class="owner-customer-list">
          ${customers.map(c => this.#buildCustomerCard(c)).join('')}
          ${customers.length === 0 ? '<div class="owner-empty">No customers yet</div>' : ''}
        </div>
      </div>
    `
  }

  #buildCustomerCard(c) {
    return `
      <div class="owner-customer-card" data-customer-name="${c.name}">
        <div class="owner-customer-card__header">
          <span class="owner-customer-card__name">${c.name}</span>
          <span class="owner-customer-card__count">${c.reservationCount} reservations</span>
        </div>
        <div class="owner-customer-card__details">
          ${c.email ? `<div class="owner-customer-card__email">${c.email}</div>` : ''}
          ${c.phone ? `<div class="owner-customer-card__phone">${c.phone}</div>` : ''}
          ${c.country ? `<div class="owner-customer-card__country">${c.country}</div>` : ''}
          ${c.notes ? `<div class="owner-customer-card__notes">${c.notes}</div>` : ''}
        </div>
        <div class="owner-customer-card__actions">
          <button class="owner-btn owner-btn--small" data-action="add-note" data-name="${c.name}">Add Note</button>
          ${c.email ? `<button class="owner-btn owner-btn--small" data-action="send-email" data-email="${c.email}">Email</button>` : ''}
        </div>
      </div>
    `
  }

  #bindEvents() {
    if (!this.#container) return

    this.#container.querySelector('[data-field="search"]')?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase()
      this.#container.querySelectorAll('.owner-customer-card').forEach(card => {
        const text = card.textContent.toLowerCase()
        card.style.display = text.includes(query) ? '' : 'none'
      })
    })

    this.#container.querySelectorAll('[data-action="add-note"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name
        const note = prompt(`Add note for ${name}:`)
        if (note) {
          this.#owner.addCustomerNote(name, note)
          alert('Note saved')
        }
      })
    })

    this.#container.querySelectorAll('[data-action="send-email"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.currentTarget.dataset.email
        this.#context?.eventBus?.emit('owner:navigate', { section: 'messages', channel: 'email', recipient: email })
      })
    })
  }

  destroy() {
    this.#container = null
    this.#owner = null
  }
}
