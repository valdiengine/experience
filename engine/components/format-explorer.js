/**
 * Format Explorer — Explorador de Formatos Cinematográficos
 * Refactored: uses shared utils, reduced from 542 to ~200 lines
 */

import { el, elAttr, clear, $, sanitize, getIcon } from '../../src/utils.js'
import { DOMAIN_ICONS } from '../data/icons.js'

const FORMATS = [
  { id: '16-9', name: '16:9', label: 'Widescreen', ratio: 16/9, css: '16-9', res: '1920×1080', res4k: '3840×2160', desc: 'Estándar universal para televisión y contenido digital.',
    uses: ['Televisión HD', 'YouTube', 'Streaming', 'Videojuegos', 'Webinars'],
    resolutions: ['HD 1280×720', 'Full HD 1920×1080', '4K UHD 3840×2160', '8K 7680×4320'],
    platforms: ['YouTube (Estándar)', 'Netflix (HD/4K)', 'Twitch (Estándar)', 'Televisión (Digital/HD)'] },
  { id: '9-16', name: '9:16', label: 'Vertical / Stories', ratio: 9/16, css: '9-16', res: '1080×1920', desc: 'Formato vertical optimizado para consumo móvil.',
    uses: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Stories', 'Publicidad móvil'],
    resolutions: ['Estándar 1080×1920', '4K Vertical 2160×3840'],
    platforms: ['TikTok (1080×1920)', 'Instagram (Reels/Stories)', 'YouTube (Shorts)'] },
  { id: '1-1', name: '1:1', label: 'Cuadrado', ratio: 1, css: '1-1', res: '1080×1080', desc: 'Formato cuadrado, versátil para redes sociales.',
    uses: ['Instagram Feed', 'Facebook Ads', 'Perfiles', 'Thumbnails'],
    resolutions: ['Estándar 1080×1080', 'HD 720×720', '4K 2160×2160'],
    platforms: ['Instagram (Feed)', 'Facebook (Ads/Posts)', 'LinkedIn (Posts)'] },
  { id: '4-5', name: '4:5', label: 'Portrait', ratio: 4/5, css: '4-5', res: '1080×1350', desc: 'Formato vertical para feeds de redes sociales.',
    uses: ['Instagram Feed', 'Facebook Mobile', 'Publicidad', 'Editorial'],
    resolutions: ['Estándar 1080×1350', 'HD 800×1000'],
    platforms: ['Instagram (Feed óptimo)', 'Facebook (Mobile feed)'] },
  { id: '21-9', name: '21:9', label: 'Ultrawide', ratio: 21/9, css: '21-9', res: '2560×1080', desc: 'Formato cinematográfico panorámico.',
    uses: ['Cine', 'Películas', 'Monitores UW', 'Videojuegos'],
    resolutions: ['UW-FHD 2560×1080', 'UW-QHD 3440×1440', 'Scope 2048×858'],
    platforms: ['Cine (Scope 2.39:1)', 'Blu-ray (Ultrawide)', 'PC Gaming'] },
]

export const FormatExplorer = (() => {
  const create = (container, options = {}) => {
    container = $(container) || container
    if (!container) return null

    const config = { formats: FORMATS, showDetail: true, onSelect: null, ...options }
    const state = { selectedFormat: null }
    let element, gridEl, detailPanel

    const init = () => {
      element = el('div', 'format-explorer')
      element.innerHTML = `<div class="format-explorer__header"><h2 class="format-explorer__title">${sanitize(options.title || 'Formatos de Video')}</h2><p class="format-explorer__subtitle">${sanitize(options.subtitle || 'Explora las proporciones y usos de cada formato')}</p></div>`
      gridEl = el('div', 'format-explorer__grid')
      config.formats.forEach(f => gridEl.appendChild(createCard(f)))
      element.appendChild(gridEl)
      container.appendChild(element)
    }

    const createCard = (format) => {
      const card = elAttr('div', { class: 'format-card', 'data-format-id': format.id, tabindex: '0', role: 'button', 'aria-label': `Formato ${format.name} - ${format.label}` })
      card.innerHTML = `
        <div class="format-card__thumbnail format-card__thumbnail--${format.css}"><div class="format-card__pattern">${'<div class="format-card__pattern-cell"></div>'.repeat(24)}</div><div class="format-card__icon"><span class="format-card__ratio">${format.name}</span><span class="format-card__pixels">${format.res}</span></div></div>
        <div class="format-card__info"><h3 class="format-card__name">${sanitize(format.label)}</h3><span class="format-card__badge">${format.uses.length} usos</span></div>`
      card.addEventListener('click', () => selectFormat(format, card))
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFormat(format, card) } })
      return card
    }

    const selectFormat = (format, card) => {
      state.selectedFormat = format
      gridEl.querySelectorAll('.format-card').forEach(c => c.classList.remove('format-card--active'))
      card.classList.add('format-card--active')
      if (config.showDetail) showDetail(format)
      config.onSelect?.(format)
    }

    const showDetail = (format) => {
      detailPanel?.remove()
      detailPanel = el('div', 'format-detail')
      detailPanel.style.position = 'relative'
      detailPanel.innerHTML = `
        <div class="format-detail__preview" style="aspect-ratio:${format.ratio};max-width:300px">
          <div class="format-detail__preview-pattern">${'<div class="format-detail__preview-cell"></div>'.repeat(48)}</div>
          <div class="format-detail__preview-content"><div class="format-detail__preview-ratio">${format.name}</div><div class="format-detail__preview-resolution">${format.res}</div></div>
        </div>
        <div class="format-detail__info">
          <div class="format-detail__header"><h3 class="format-detail__title">${format.name} — ${format.label}</h3><p class="format-detail__subtitle">${sanitize(format.desc)}</p></div>
          <div class="format-detail__section"><h4 class="format-detail__section-title">Dónde se utiliza</h4><div class="format-detail__uses">${format.uses.map(u => `<span class="format-detail__use-tag"><span class="format-detail__use-icon">${DOMAIN_ICONS.camera}</span><span>${sanitize(u)}</span></span>`).join('')}</div></div>
          <div class="format-detail__section"><h4 class="format-detail__section-title">Resolución</h4><div class="format-detail__resolution">${format.resolutions.map(r => { const [label, ...val] = r.split(' '); return `<div class="format-detail__resolution-item"><span class="format-detail__resolution-label">${label}</span><span class="format-detail__resolution-value">${val.join(' ')}</span></div>` }).join('')}</div></div>
          <div class="format-detail__section"><h4 class="format-detail__section-title">Plataformas</h4><div class="format-detail__platforms">${format.platforms.map(p => { const [name, ...note] = p.split(' '); return `<div class="format-detail__platform"><span class="format-detail__platform-name">${name}</span><span class="format-detail__platform-note">(${note.join(' ')})</span></div>` }).join('')}</div></div>
        </div>`
      const closeBtn = elAttr('button', { type: 'button', class: 'format-detail__close', 'aria-label': 'Cerrar detalle' })
      closeBtn.innerHTML = getIcon('x')
      closeBtn.addEventListener('click', () => { detailPanel.remove(); detailPanel = null; gridEl.querySelectorAll('.format-card').forEach(c => c.classList.remove('format-card--active')); state.selectedFormat = null })
      detailPanel.appendChild(closeBtn)
      element.appendChild(detailPanel)
    }

    init()

    return {
      get element() { return element },
      getSelected: () => state.selectedFormat,
      getFormats: () => config.formats,
      setFormats: (f) => { config.formats = f; clear(gridEl); f.forEach(fmt => gridEl.appendChild(createCard(fmt))); detailPanel?.remove(); detailPanel = null },
    }
  }

  return { create, FORMATS }
})()
