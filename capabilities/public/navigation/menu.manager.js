/**
 * Menu Manager — Dynamic tenant menus
 *
 * Business-agnostic: renders navigation menus from tenant config
 */
export class MenuManager {
  #context = null
  #menuItems = []
  #footerItems = []

  constructor(context) {
    this.#context = context
  }

  /**
   * Load menu from tenant config
   * @param {object} tenant
   */
  loadFromTenant(tenant) {
    const navigation = tenant.navigation || {}
    this.#menuItems = navigation.menuItems || this.#defaultMenuItems(tenant)
    this.#footerItems = navigation.footerItems || []
  }

  /**
   * Render main navigation
   * @param {HTMLElement} container
   * @param {object} options - { activeRoute }
   * @returns {HTMLElement}
   */
  renderNavigation(container, options = {}) {
    const nav = document.createElement('nav')
    nav.className = 'public-nav'
    nav.setAttribute('aria-label', 'Navegación principal')

    const list = document.createElement('ul')
    list.className = 'public-nav__list'

    this.#menuItems.forEach(item => {
      const li = document.createElement('li')
      li.className = 'public-nav__item'

      const a = document.createElement('a')
      a.className = `public-nav__link ${item.route === options.activeRoute ? 'public-nav__link--active' : ''}`
      a.href = item.route || '#'
      a.textContent = item.label || item.name

      if (item.icon) {
        a.insertAdjacentHTML('afterbegin', `<span class="public-nav__icon">${item.icon}</span> `)
      }

      if (item.children?.length) {
        const subList = document.createElement('ul')
        subList.className = 'public-nav__submenu'
        item.children.forEach(child => {
          const subLi = document.createElement('li')
          const subA = document.createElement('a')
          subA.className = 'public-nav__link'
          subA.href = child.route || '#'
          subA.textContent = child.label || child.name
          subLi.appendChild(subA)
          subList.appendChild(subLi)
        })
        li.appendChild(a)
        li.appendChild(subList)
      } else {
        li.appendChild(a)
      }

      list.appendChild(li)
    })

    nav.appendChild(list)

    if (container) container.appendChild(nav)
    return nav
  }

  /**
   * Render footer navigation
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  renderFooter(container) {
    if (!this.#footerItems.length) return null

    const footer = document.createElement('footer')
    footer.className = 'public-footer'

    const list = document.createElement('ul')
    list.className = 'public-footer__list'

    this.#footerItems.forEach(item => {
      const li = document.createElement('li')
      li.className = 'public-footer__item'
      const a = document.createElement('a')
      a.className = 'public-footer__link'
      a.href = item.route || '#'
      a.textContent = item.label || item.name
      li.appendChild(a)
      list.appendChild(li)
    })

    footer.appendChild(list)

    if (container) container.appendChild(footer)
    return footer
  }

  /**
   * Get menu items
   * @returns {object[]}
   */
  getMenuItems() {
    return [...this.#menuItems]
  }

  /**
   * Get footer items
   * @returns {object[]}
   */
  getFooterItems() {
    return [...this.#footerItems]
  }

  /**
   * Add menu item
   * @param {object} item
   */
  addMenuItem(item) {
    this.#menuItems.push(item)
  }

  /**
   * Remove menu item by route
   * @param {string} route
   */
  removeMenuItem(route) {
    this.#menuItems = this.#menuItems.filter(i => i.route !== route)
  }

  #defaultMenuItems(tenant) {
    return [
      { name: 'Inicio', label: 'Inicio', route: '#home', icon: '🏠' },
      { name: 'Servicios', label: 'Servicios', route: '#services', icon: '⭐' },
      { name: 'Galería', label: 'Galería', route: '#gallery', icon: '📸' },
      { name: 'Reservar', label: 'Reservar', route: '#booking', icon: '📅' },
      { name: 'Contacto', label: 'Contacto', route: '#contact', icon: '📞' },
    ]
  }
}
