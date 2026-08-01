/**
 * StudioEngine — Pure orchestrator
 * Delegates to standalone components, manages data store and event bus
 */

import { el, elAttr, clear, $, $$, resolveContainer } from '../../shared/utils/dom.js'
import { sanitize, formatValue, getType, getLabel } from '../../shared/utils/format.js'
import { debounce } from '../../shared/utils/performance.js'
import { trapFocus } from '../../shared/utils/a11y.js'
import { observeOnce } from '../../shared/utils/observers.js'
import { getIcon } from '../../shared/utils/icons.js'
import { eventBus } from './eventbus.js'
import { EXCLUDE_FIELDS } from '../../shared/constants/status.js'
import { inferFields } from '../../shared/schema/normalize.js'
import { PremiumCard } from '../components/card.js'
import { Carousel } from '../components/carousel.js'
import { Lightbox } from '../components/lightbox.js'
import { Gallery } from '../components/gallery.js'
import { Filters } from '../../src/filters.js'
import { Comparator } from '../../src/comparator.js'
import { Configurator } from '../components/configurator.js'
import { FormatExplorer } from '../components/format-explorer.js'
import { ExpandedView } from '../components/expanded-view.js'
import { Animations } from '../components/animations.js'

export const StudioEngine = ((globalData) => {
  /* ── Store ── */
  const store = globalData || {}
  const watchers = new Map()

  const resolve = (obj, path) => {
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = obj
    for (let i = 0; i < parts.length; i++) {
      if (current == null) return undefined
      current = current[parts[i]]
    }
    return current
  }

  const set = (obj, path, value) => {
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }

  /* ── Event Bus ── */

  const _notify = (path) => {
    const deps = watchers.get(path)
    if (deps) deps.forEach(h => h(resolve(store, path)))
    eventBus.emit('change', { path, value: resolve(store, path) })
  }

  /* ── Public Data API ── */
  const data = (path, value) => {
    if (value === undefined) return resolve(store, path)
    set(store, path, value)
    _notify(path)
    return value
  }

  const watch = (path, handler) => {
    if (!watchers.has(path)) watchers.set(path, new Set())
    watchers.get(path).add(handler)
    handler(resolve(store, path))
    return () => watchers.get(path)?.delete(handler)
  }

  /* ── Data Inference ── */

  const inferEnumFields = (items) => Filters.inferEnumFields(items)

  /* ── Bind ── */
  const bindings = new Map()
  const bind = (container) => {
    if (typeof container === 'string') container = $(container)
    if (!container) return []
    return $$('[data-bind]', container).reduce((unsubs, el) => {
      const path = el.getAttribute('data-bind')
      if (!path || bindings.has(el)) return unsubs
      bindings.set(el, true)
      const tag = el.tagName.toLowerCase()
      const update = (val) => {
        if (tag === 'input' || tag === 'select' || tag === 'textarea') {
          if (el.type === 'checkbox') el.checked = !!val
          else el.value = val ?? ''
        } else if (tag === 'img') { el.src = val ?? ''; el.alt = val ? '' : 'Sin imagen' }
        else el.textContent = formatValue(val)
      }
      unsubs.push(watch(path, update))
      return unsubs
    }, [])
  }

  /* ══════════════════════════════════════════════════════════════
     WRAPPERS — Delegate to standalone components
     ══════════════════════════════════════════════════════════════ */

  /* ── Cards → PremiumCard ── */
  const createCards = (container, dataPath, config = {}) => {
    container = resolveContainer(container)
    if (!container) return []
    const items = resolve(store, dataPath) || []
    if (!items.length) {
      container.innerHTML = '<p class="text-caption text-secondary" style="padding:var(--space-4)">Sin datos disponibles</p>'
      return []
    }
    const allFields = config.fields || inferFields(items)
    const valueField = config.valueField || allFields[2]
    const statusField = config.statusField || 'status'

    return PremiumCard.createGrid(container, items, {
      titleField: config.titleField || allFields[0] || 'name',
      subtitleField: config.subtitleField || allFields[1] || 'model',
      stagger: true,
      ariaLabelBuilder: (item) => sanitize(item[config.titleField || allFields[0] || 'name'] || ''),
      contentBuilder: (item) => {
        const status = item[statusField]
        const statusClass = status === 'flying' || status === 'completed' || status === 'active' ? 'success'
          : status === 'warning' || status === 'maintenance' || status === 'idle' ? 'warning' : 'default'
        return `<div style="display:flex;flex-direction:column;gap:var(--space-2)">
          ${status ? `<span class="badge badge--${statusClass} badge--dot" style="align-self:flex-start"></span>` : ''}
          ${valueField && item[valueField] != null ? `<span class="text-mono" style="font-size:var(--text-lg);color:var(--color-primary)">${typeof item[valueField] === 'number' ? (valueField.includes('price') ? `$${item[valueField].toLocaleString('es-MX')}` : item[valueField] + (valueField === 'battery' ? '%' : '')) : sanitize(formatValue(item[valueField]))}</span>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-top:var(--space-1)">
            ${allFields.slice(3).filter(f => item[f] != null && typeof item[f] !== 'object').map(f => `<span class="text-caption text-secondary">${getLabel(f)}: ${sanitize(formatValue(item[f]))}</span>`).join('')}
          </div>
        </div>`
      },
      onItemClick: (item, index) => eventBus.emit('card:select', { item, index, dataPath }),
    })
  }

  /* ── Filters → Filters ── */
  const createFilters = (container, dataPath, config = {}) => {
    container = resolveContainer(container)
    if (!container) return null
    const items = resolve(store, dataPath) || []
    return Filters.create(container, {
      items,
      enums: config.enums,
      search: config.search,
      searchPlaceholder: config.searchPlaceholder,
      onFilterChange: (state) => eventBus.emit('filter:change', { ...state, dataPath }),
    })
  }

  /* ── Carousel → Carousel ── */
  const createCarousel = (container, dataPath, config = {}) => {
    container = resolveContainer(container)
    if (!container) return null
    const items = resolve(store, dataPath) || []
    if (!items.length) {
      container.innerHTML = '<p class="text-caption text-secondary" style="padding:var(--space-4)">Sin elementos</p>'
      return null
    }

    return Carousel.createFromData(container, items, (item, i) => {
      const titleField = config.titleField || 'name'
      const subtitleField = config.subtitleField
      const title = item[titleField] || ''
      const subtitle = subtitleField ? item[subtitleField] : ''
      const img = config.imageField ? resolve(item, config.imageField) : (item.media?.thumbnail || item.poster || item.coverImage || item.avatar || '')

      const card = elAttr('article', { class: 'card card--glass card--interactive', tabindex: '0', role: 'group', 'aria-label': sanitize(title) })
      card.innerHTML = `
        ${img ? `<div style="height:160px;overflow:hidden;background:var(--bg-raised)"><img src="${sanitize(img)}" alt="${sanitize(title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"></div>` : ''}
        <div class="card__body" style="display:flex;flex-direction:column;gap:var(--space-1)">
          <span class="text-body" style="font-weight:var(--weight-semibold)">${sanitize(title)}</span>
          ${subtitle ? `<span class="text-caption text-secondary">${sanitize(subtitle)}</span>` : ''}
          ${config.showDescription && item.description ? `<p class="text-body-sm text-secondary" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${sanitize(item.description)}</p>` : ''}
        </div>`
      card.addEventListener('click', () => eventBus.emit('carousel:select', { item, index: i, dataPath }))
      return card
    }, {
      gap: 16, arrows: true, dots: true, drag: true,
      label: config.label || 'Carrusel',
    })
  }

  /* ── Comparator → Comparator ── */
  const createComparator = (container, dataPath, config = {}) => {
    container = resolveContainer(container)
    if (!container) return null
    const items = resolve(store, dataPath) || []
    if (!items.length) return null
    return Comparator.create(container, {
      items,
      fields: config.fields || inferFields(items, 8),
      maxItems: config.maxItems || 3,
      titleField: config.titleField || 'name',
      label: config.label || 'Comparar',
    })
  }

  /* ── Modal → Lightbox ── */
  const createModal = (container, config = {}) => {
    if (typeof config === 'string') {
      const item = resolve(store, config)
      config = { item, fields: inferFields(item ? [item] : []) }
    }
    const { item, title = 'Detalle', fields, size = 'md' } = config
    if (!item) return

    const effectiveFields = fields || Object.keys(item).filter(k => !['id', 'slug', 'media', 'gallery', 'tags', 'metadata'].includes(k) && (typeof item[k] !== 'object' || item[k] === null))

    const modalHtml = `<div class="modal modal--${size}">
      <header class="modal__header">
        <h2 class="text-h4">${sanitize(item.name || item.title || title)}</h2>
      </header>
      <div class="modal__body">
        ${config.render ? config.render(item) : `<dl style="display:grid;gap:var(--space-3)">${effectiveFields.map(f => `
          <div><dt class="text-caption text-secondary">${getLabel(f)}</dt><dd class="text-body">${sanitize(typeof item[f] === 'object' ? (Array.isArray(item[f]) ? item[f].join(', ') : JSON.stringify(item[f]).slice(0, 80)) : formatValue(item[f]))}</dd></div>`).join('')}</dl>`}
      </div>
      ${config.footer !== false ? `<footer class="modal__footer">
        <button type="button" class="btn btn--ghost btn--md">${config.closeText || 'Cerrar'}</button>
        ${config.confirmText ? `<button type="button" class="btn btn--primary btn--md engine-modal-confirm">${config.confirmText}</button>` : ''}
      </footer>` : ''}
    </div>`

    const lightbox = Lightbox.create({
      type: 'html',
      html: modalHtml,
      showClose: true,
      closeOnBackdrop: true,
      closeOnEsc: true,
      title: item.name || item.title || title,
      onClose: () => eventBus.emit('modal:close', { item }),
    })

    if (lightbox) {
      lightbox.element.querySelectorAll('.modal__footer .btn--ghost').forEach(btn => {
        btn.addEventListener('click', () => lightbox.close())
      })
      const confirmBtn = lightbox.element.querySelector('.engine-modal-confirm')
      if (confirmBtn) confirmBtn.addEventListener('click', () => {
        eventBus.emit('modal:confirm', { item })
        lightbox.close()
      })
    }

    return lightbox
  }

  /* ── Hero (kept in engine — no standalone equivalent) ── */
  let heroObserver = null
  const createHero = (container, dataPath, config = {}) => {
    container = resolveContainer(container)
    if (!container) return
    const heroData = resolve(store, dataPath) || {}
    if (!heroData?.name) return

    const { heroVideo: videoSrc = '', name: title = 'Dronestica', tagline = '', about: { mission: description = '' } = {} } = heroData
    const ctaText = config.ctaText || 'Ver proyectos'
    const ctaLink = config.ctaLink || '#portfolio'
    const secondaryCtaText = config.secondaryCtaText || 'Contactar'
    const secondaryCtaLink = config.secondaryCtaLink || heroData.contact?.bookingUrl || '#contact'

    const section = el('section', 'engine-hero')
    section.setAttribute('data-component', 'hero')
    section.setAttribute('aria-label', title)

    section.innerHTML = `
      <div class="engine-hero__bg">
        ${videoSrc ? `<video class="engine-hero__video" autoplay muted loop playsinline poster="${config.poster || ''}"><source src="${sanitize(videoSrc)}" type="${config.videoType || 'video/mp4'}"></video>` : '<div class="engine-hero__gradient"></div>'}
        <div class="engine-hero__overlay"></div>
      </div>
      <div class="engine-hero__content"><div class="engine-hero__text">
        ${tagline ? `<p class="engine-hero__tagline">${sanitize(tagline)}</p>` : ''}
        <h1 class="engine-hero__title">${sanitize(title)}</h1>
        ${description ? `<p class="engine-hero__description">${sanitize(description.length > 120 ? description.slice(0, 120) + '…' : description)}</p>` : ''}
        <div class="engine-hero__actions">
          <a href="${ctaLink}" class="btn btn--primary btn--lg engine-hero__cta">${ctaText}</a>
          <a href="${secondaryCtaLink}" class="btn btn--glass btn--lg engine-hero__cta engine-hero__cta--secondary">${secondaryCtaText}</a>
        </div>
      </div></div>
      <div class="engine-hero__scroll" aria-hidden="true">
        <span class="engine-hero__scroll-text">Desliza</span>
        <svg class="engine-hero__scroll-icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M6 13l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>`

    container.appendChild(section)
    observeOnce(section, 'engine-hero--visible', { threshold: 0.1 })

    return { element: section, data: heroData }
  }

  /* ── Data Manager Reference ── */
  let dataManager = null

  /* ── Init ── */
  const init = (dm) => {
    dataManager = dm
    const app = $('#app')
    if (app) bind(app)
    $$('[data-page]').forEach(p => bind(p))
    $$('[data-region]').forEach(r => bind(r))
    $$('[data-route]').forEach(s => {
      if (!s.hasAttribute('hidden')) eventBus.emit('route:change', { route: s.getAttribute('data-route') })
    })
    eventBus.emit('engine:ready', { version: '2.0.0' })
  }

  return {
    /* Data layer */
    data, watch, bind, init,
    resolve: (path) => resolve(store, path),
    get raw() { return store },
    get dataManager() { return dataManager },

    /* Event bus */
    on: eventBus.on, off: eventBus.off, emit: eventBus.emit,

    /* Data inference */
    getType, formatValue, getLabel, inferFields, inferEnumFields,

    /* Component wrappers (coordinate standalone components) */
    createCards, createFilters, createCarousel, createComparator, createModal, createHero,

    /* Standalone components (exposed for direct use) */
    PremiumCard, Carousel, Lightbox, Gallery, Filters, Comparator,
    Configurator, FormatExplorer, ExpandedView, Animations,

    /* Shared utils re-export */
    el, elAttr, clear, $, $$, sanitize, getIcon, debounce, trapFocus, observeOnce, resolveContainer,
  }
})(window.DATA || {})
