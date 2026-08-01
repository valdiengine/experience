/**
 * ExpandedView — Vista expandida cinematográfica
 * Refactored: uses shared utils, reduced from 436 to ~200 lines
 */

import { el, elAttr, clear, $, sanitize, getIcon } from '../../src/utils.js'
import { DOMAIN_ICONS } from '../data/icons.js'

const SECTION_TITLES = { description: 'Descripción', clients: 'Clientes', services: 'Servicios', timeline: 'Timeline', includes: 'Qué incluye' }

const SERVICE_ICONS = {
  film: DOMAIN_ICONS.film, camera: DOMAIN_ICONS.camera, drone: getIcon('grid'),
  broadcast: getIcon('play'), inspection: getIcon('search'), training: getIcon('info'),
  default: getIcon('info'),
}

export const ExpandedView = (() => {
  const section = (className, title, contentFn) => (data) => {
    if (!data) return null
    const s = el('div', `expanded-view__${className}`)
    const t = el('h4', className === 'description' ? 'expanded-view__description-title' : 'expanded-view__section-title')
    t.textContent = title
    s.appendChild(t)
    const content = contentFn(data)
    if (content) s.appendChild(content)
    return s
  }

  const sectionFns = {
    description: section('description', SECTION_TITLES.description, (desc) => {
      const text = el('p', 'expanded-view__description-text')
      text.textContent = typeof desc === 'string' ? desc : desc.text
      return text
    }),
    clients: section('clients', SECTION_TITLES.clients, (clients) => {
      const grid = el('div', 'expanded-view__clients-grid')
      clients.forEach(client => {
        const item = el('div', 'expanded-view__client')
        if (client.logo) {
          const logo = elAttr('img', { class: 'expanded-view__client-logo', src: client.logo, alt: client.name, loading: 'lazy' })
          logo.onerror = function() { this.style.display = 'none' }
          item.appendChild(logo)
        }
        const info = el('div')
        const name = elAttr('span', { class: 'expanded-view__client-name' }); name.textContent = client.name; info.appendChild(name)
        if (client.type || client.industry) { const type = elAttr('span', { class: 'expanded-view__client-type' }); type.textContent = client.type || client.industry; info.appendChild(type) }
        item.appendChild(info)
        grid.appendChild(item)
      })
      return grid
    }),
    services: section('services', SECTION_TITLES.services, (services) => {
      const list = el('div', 'expanded-view__services-list')
      services.forEach(service => {
        const item = el('div', 'expanded-view__service')
        const iconWrapper = el('div', 'expanded-view__service-icon')
        iconWrapper.innerHTML = SERVICE_ICONS[service.icon || service.type] || SERVICE_ICONS.default
        item.appendChild(iconWrapper)
        const info = el('div', 'expanded-view__service-info')
        const name = el('h5', 'expanded-view__service-name'); name.textContent = service.name; info.appendChild(name)
        if (service.description) { const desc = el('p', 'expanded-view__service-desc'); desc.textContent = service.description; info.appendChild(desc) }
        item.appendChild(info)
        if (service.price || service.from) {
          const badge = elAttr('span', { class: 'badge badge--primary expanded-view__service-badge' })
          badge.textContent = service.price || `Desde $${service.from?.toLocaleString('es-MX')}`
          item.appendChild(badge)
        }
        list.appendChild(item)
      })
      return list
    }),
    timeline: section('timeline', SECTION_TITLES.timeline, (timeline) => {
      const list = el('div', 'expanded-view__timeline-list')
      timeline.forEach((item, i) => {
        const itemEl = el('div', 'expanded-view__timeline-item')
        if (item.active) itemEl.classList.add('expanded-view__timeline-item--active')
        else if (item.completed || i < timeline.length - 1) itemEl.classList.add('expanded-view__timeline-item--completed')
        if (item.date) { const date = el('span', 'expanded-view__timeline-date'); date.textContent = item.date; itemEl.appendChild(date) }
        const title = el('h5', 'expanded-view__timeline-title'); title.textContent = item.title || item.label; itemEl.appendChild(title)
        if (item.description) { const desc = el('p', 'expanded-view__timeline-desc'); desc.textContent = item.description; itemEl.appendChild(desc) }
        list.appendChild(itemEl)
      })
      return list
    }),
    includes: section('includes', SECTION_TITLES.includes, (includes) => {
      const grid = el('div', 'expanded-view__includes-grid')
      includes.forEach(item => {
        const itemEl = el('div', 'expanded-view__include-item')
        const check = el('span', 'expanded-view__include-check')
        check.innerHTML = getIcon('check')
        itemEl.appendChild(check)
        const text = el('span', 'expanded-view__include-text')
        text.textContent = typeof item === 'string' ? item : item.text || item.name
        itemEl.appendChild(text)
        grid.appendChild(itemEl)
      })
      return grid
    }),
  }

  function create(data = {}) {
    const container = el('div', 'expanded-view')
    const keys = ['description', 'clients', 'services', 'timeline', 'includes']
    let prev = false

    keys.forEach(key => {
      const val = data[key]
      if (!val) return
      if (prev) container.appendChild(el('div', 'expanded-view__separator'))
      const section = sectionFns[key](val)
      if (section) container.appendChild(section)
      prev = true
    })

    if (data.cta) {
      container.appendChild(el('div', 'expanded-view__separator'))
      container.appendChild(createCTA(data.cta))
    }

    return container
  }

  function createCTA(cta) {
    const section = el('div', 'expanded-view__cta')
    const text = el('p', 'expanded-view__cta-text')
    text.textContent = cta.text || '¿Listo para empezar?'
    section.appendChild(text)
    const actions = el('div', 'expanded-view__cta-actions')

    const addBtn = (config, btnClass) => {
      if (!config) return
      const btn = elAttr('a', { href: config.link || '#', class: `btn ${btnClass} btn--md expanded-view__cta-btn` })
      btn.textContent = config.label || 'Contactar'
      if (config.onClick) btn.addEventListener('click', (e) => { e.preventDefault(); config.onClick() })
      actions.appendChild(btn)
    }

    addBtn(cta.primary, 'btn--primary')
    addBtn(cta.secondary, 'btn--glass')
    section.appendChild(actions)
    return section
  }

  function createFromProject(project) {
    return create({
      description: project.synopsis || project.description,
      clients: project.client ? [project.client] : [],
      services: project.services || [],
      timeline: project.timeline || [],
      includes: project.includes || [],
      cta: { text: '¿Te interesa este proyecto?', primary: { label: 'Ver caso de estudio', link: project.caseStudyUrl || '#' }, secondary: { label: 'Contactar', link: project.contactUrl || '#' } },
    })
  }

  function createFromService(service) {
    return create({
      description: service.description,
      clients: service.featuredClients || [],
      services: [service],
      timeline: service.timeline || [],
      includes: service.deliverables || service.includes || [],
      cta: { text: service.ctaText || '¿Listo para cotizar?', primary: { label: service.ctaLabel || 'Solicitar cotización', link: service.ctaLink || '#' }, secondary: { label: 'Ver ejemplos', link: service.examplesUrl || '#' } },
    })
  }

  return { create, createFromProject, createFromService }
})()
