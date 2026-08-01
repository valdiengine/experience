/**
 * UIManager — Wires StudioEngine into the HTML shell
 * Binds data, renders regions, sets up event listeners
 */
import { $, $$ } from './utils.js'
import { StudioEngine } from './engine.js'

export const UIManager = (() => {

  const initRegions = () => {
    const regions = {
      'drone-items': () => StudioEngine.createCards('[data-region="drone-items"]', 'fleet.drones', {
        titleField: 'name', subtitleField: 'model', valueField: 'battery', statusField: 'status',
      }),
      'mission-items': () => StudioEngine.createCards('[data-region="mission-items"]', 'portfolio.projects', {
        titleField: 'title', subtitleField: 'subtitle', statusField: 'status', fields: ['title', 'subtitle', 'year', 'client.name'],
      }),
      'drone-rows': () => {
        const container = $('[data-region="drone-rows"]')
        if (!container) return
        container.innerHTML = ''
        const drones = StudioEngine.resolve('fleet.drones') || []
        const { sanitize, getLabel, formatValue } = StudioEngine
        drones.forEach(drone => {
          const tr = document.createElement('tr')
          tr.innerHTML = `
            <td class="text-body" style="font-weight:var(--weight-semibold)">${sanitize(drone.name)}</td>
            <td class="text-caption">${sanitize(drone.model)}</td>
            <td><span class="badge badge--${drone.status === 'flying' ? 'success' : drone.status === 'maintenance' ? 'warning' : 'default'}">${drone.status}</span></td>
            <td class="text-mono">${drone.telemetry?.battery ?? '—'}%</td>
            <td class="text-caption">${drone.currentMission ? sanitize(drone.currentMission) : '—'}</td>
            <td class="text-caption">${drone.assignedPilot ? sanitize(drone.assignedPilot) : '—'}</td>
            <td><button type="button" class="btn btn--ghost btn--sm" data-trigger="engine:modal" data-path="fleet.drones.${drones.indexOf(drone)}" data-title="${sanitize(drone.name)}">${StudioEngine.getIcon('search')}</button></td>`
          container.appendChild(tr)
        })
      },
      'drone-filters': () => StudioEngine.createFilters('[data-region="filters"]', 'fleet.drones', {
        searchPlaceholder: 'Buscar drones...',
      }),
      'portfolio-carousel': () => {
        const container = $('[data-region="portfolio-carousel"]')
        if (!container) return
        StudioEngine.createCarousel(container, 'portfolio.projects', {
          titleField: 'title', subtitleField: 'client.name', imageField: 'media.thumbnail',
          showDescription: true, label: 'Proyectos destacados',
        })
      },
      'team-carousel': () => {
        const container = $('[data-region="team-carousel"]')
        if (!container) return
        StudioEngine.createCarousel(container, 'team', {
          titleField: 'name', subtitleField: 'role', imageField: 'avatar', label: 'Equipo',
        })
      },
      'pricing-carousel': () => {
        const container = $('[data-region="pricing-carousel"]')
        if (!container) return
        StudioEngine.createCarousel(container, 'pricing.packages', {
          titleField: 'name', subtitleField: 'price', fields: ['name', 'price', 'duration', 'popular'], showDescription: false,
        })
      },
      'drone-comparator': () => {
        const container = $('[data-region="drone-comparator"]')
        if (!container) return
        StudioEngine.createComparator(container, 'fleet.drones', {
          titleField: 'name', fields: ['name', 'model', 'type', 'status', 'battery', 'weight', 'maxSpeed', 'maxFlightTime'],
        })
      },
    }

    return regions
  }

  const renderAll = (regions) => {
    Object.values(regions).forEach(fn => {
      try { fn() } catch (e) { console.warn('[UI] Region render error:', e) }
    })
  }

  const bindEvents = (regions) => {
    // Modal triggers
    $$('[data-trigger="engine:modal"]').forEach(el => {
      el.addEventListener('click', () => {
        const dataPath = el.getAttribute('data-path')
        const title = el.getAttribute('data-title') || 'Detalle'
        if (dataPath) {
          const item = StudioEngine.resolve(dataPath)
          if (item) StudioEngine.createModal(document.body, { item, title })
        }
      })
    })

    // Card select → modal
    StudioEngine.on('card:select', ({ item }) => {
      StudioEngine.createModal(document.body, { item, title: item.name || item.title || 'Detalle' })
    })

    // Filter change → re-render
    StudioEngine.on('filter:change', () => renderAll(regions))
  }

  const init = () => {
    // Bind data to DOM elements with data-bind
    StudioEngine.bind('#app')

    const regions = initRegions()
    renderAll(regions)
    bindEvents(regions)
  }

  return { init }
})()
