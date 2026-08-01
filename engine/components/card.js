/**
 * Card Premium — Componente reutilizable cinematográfico
 * Refactored: uses shared utils, removed verbose comments, reduced duplication
 */

import { el, elAttr, clear, $, sanitize, getIcon, trapFocus } from '../../src/utils.js'

export const PremiumCard = (() => {
  let cardCounter = 0

  const defaultConfig = {
    variant: 'glass',
    expandible: false,
    animate: true,
    animationType: 'fadeUp',
    animationDelay: 0,
    loading: false,
    selected: false,
    clickable: true,
    onExpand: null,
    onCollapse: null,
    onSelect: null,
    onClick: null,
  }

  const buildClassName = (config, state) => {
    const classes = ['card', 'card--premium']
    if (config.variant !== 'default') classes.push(`card--${config.variant}`)
    if (config.expandible) classes.push('card--expandible')
    if (state.loading) classes.push('card--loading')
    if (state.selected) classes.push('card--selected')
    if (config.animate && config.animationType) classes.push(`card--animate-${config.animationType}`)
    if (config.animationDelay > 0) classes.push(`card--delay-${Math.min(Math.ceil(config.animationDelay / 60), 5)}`)
    if (config.className) classes.push(config.className)
    return classes.join(' ')
  }

  const appendContent = (parent, content) => {
    if (!content) return
    if (typeof content === 'string') parent.innerHTML += content
    else if (content instanceof HTMLElement) parent.appendChild(content)
  }

  function create(options = {}) {
    const id = `card-${++cardCounter}`
    const config = { ...defaultConfig, ...options }
    const state = { expanded: false, selected: config.selected, loading: config.loading }
    let element, expandableContent, expandIcon

    function render() {
      element = elAttr('article', { id, class: buildClassName(config, state), role: 'article', tabindex: '0' })
      if (config.ariaLabel) element.setAttribute('aria-label', config.ariaLabel)

      if (config.title || config.header) {
        const header = el('div', 'card__header')
        if (config.title) { const t = el('h3', 'card__title'); t.textContent = config.title; header.appendChild(t) }
        if (config.subtitle) { const s = el('p', 'card__subtitle'); s.textContent = config.subtitle; header.appendChild(s) }
        if (config.header) appendContent(header, config.header)
        if (config.expandible) {
          expandIcon = el('span', 'card__expand-icon')
          expandIcon.innerHTML = getIcon('chevron-down')
          header.appendChild(expandIcon)
        }
        element.appendChild(header)
      }

      if (config.content || config.body) {
        const body = el('div', 'card__body')
        appendContent(body, config.content)
        appendContent(body, config.body)
        element.appendChild(body)
      }

      if (config.expandible) {
        element.appendChild(el('div', 'card__expand-separator'))
        expandableContent = el('div', 'card__expandable')
        const inner = el('div', 'card__expandable-inner')
        const content = el('div', 'card__expandable-content')
        appendContent(content, config.expandContent)
        inner.appendChild(content)
        expandableContent.appendChild(inner)
        element.appendChild(expandableContent)
      }

      if (config.footer || config.actions) {
        const footer = el('div', 'card__footer')
        appendContent(footer, config.footer)
        if (config.actions) {
          const actionsEl = el('div', 'card__actions')
          config.actions.forEach(action => {
            const btn = elAttr('button', { type: 'button', class: `btn btn--${action.variant || 'ghost'} btn--sm` })
            btn.textContent = action.label
            btn.addEventListener('click', (e) => { e.stopPropagation(); action.onClick?.(getPublicAPI()) })
            actionsEl.appendChild(btn)
          })
          footer.appendChild(actionsEl)
        }
        element.appendChild(footer)
      }

      setupEventListeners()
      return element
    }

    function setupEventListeners() {
      if (!element) return
      if (config.expandible) {
        element.addEventListener('click', (e) => { if (!e.target.closest('button, a, input, select, textarea')) toggle() })
        element.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } })
      }
      if (config.clickable && config.onClick) {
        element.addEventListener('click', (e) => { if (!e.target.closest('button, a')) config.onClick(getPublicAPI()) })
      }
      if (config.variant !== 'default') {
        element.addEventListener('mousemove', (e) => {
          const rect = element.getBoundingClientRect()
          element.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
          element.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
        })
      }
    }

    function toggle() { state.expanded ? collapse() : expand() }
    function expand() { if (!config.expandible || state.expanded) return; state.expanded = true; element.classList.add('card--expanded'); config.onExpand?.(getPublicAPI()) }
    function collapse() { if (!config.expandible || !state.expanded) return; state.expanded = false; element.classList.remove('card--expanded'); config.onCollapse?.(getPublicAPI()) }

    function select(selected = true) {
      state.selected = selected
      element.classList.toggle('card--selected', selected)
      if (selected) config.onSelect?.(getPublicAPI())
    }

    function setLoading(loading = true) { state.loading = loading; element.classList.toggle('card--loading', loading) }

    function updateContent(content) {
      const body = element.querySelector('.card__body')
      if (!body) return
      if (typeof content === 'string') body.innerHTML = content
      else if (content instanceof HTMLElement) { body.innerHTML = ''; body.appendChild(content) }
    }

    function updateTitle(title) { element.querySelector('.card__title').textContent = title }
    function updateSubtitle(subtitle) { element.querySelector('.card__subtitle').textContent = subtitle }
    function animateIn() { element.classList.add('card--animate-in') }
    function animateOut(cb) { element.classList.add('card--animate-out'); element.addEventListener('animationend', () => cb?.(), { once: true }) }
    function destroy() { element?.remove(); element = null; expandableContent = null; expandIcon = null }

    function getPublicAPI() {
      return {
        id, element, state: { ...state }, config: { ...config },
        render, toggle, expand, collapse, select, setLoading, updateContent, updateTitle, updateSubtitle, animateIn, animateOut, destroy,
      }
    }

    return getPublicAPI()
  }

  function createGrid(container, items, template = {}) {
    if (!container || !items?.length) return []
    clear(container)
    const grid = el('div', `card-grid ${template.gridClassName || ''}`)
    const cards = items.map((item, index) => {
      const cardConfig = {
        ...template,
        title: template.titleField ? item[template.titleField] : item.title || item.name,
        subtitle: template.subtitleField ? item[template.subtitleField] : item.subtitle,
        content: template.contentBuilder ? template.contentBuilder(item) : undefined,
        expandContent: template.expandBuilder ? template.expandBuilder(item) : undefined,
        expandible: !!template.expandBuilder,
        animationDelay: template.stagger ? index * 60 : 0,
        onClick: template.onItemClick ? () => template.onItemClick(item, index) : undefined,
        onExpand: template.onItemExpand ? () => template.onItemExpand(item, index) : undefined,
        className: template.itemClassName || '',
        ariaLabel: template.ariaLabelBuilder ? template.ariaLabelBuilder(item) : item.title || item.name,
      }
      const card = create(cardConfig)
      grid.appendChild(card.render())
      return card
    })
    container.appendChild(grid)
    return cards
  }

  function createSkeleton(options = {}) {
    return create({ variant: 'default', animate: false, loading: false, clickable: false, className: 'card--skeleton', ...options })
  }

  return { create, createGrid, createSkeleton }
})()
