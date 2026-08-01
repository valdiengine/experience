/**
 * Gallery — Standalone Filtered Gallery
 * Refactored: uses shared utils, reduced duplication
 */

import { el, elAttr, clear, $, sanitize, observeOnce } from '../../src/utils.js'

const CATEGORY_MAP = {
  drone: { cinema: ['proj-001','proj-002','proj-003','proj-004','proj-007','proj-010'], fpv: ['proj-002','proj-003','proj-009'], heavy: ['proj-001'], enterprise: ['proj-005','proj-008'] },
  client: { streaming: ['proj-001','proj-004','proj-010'], automotive: ['proj-002'], beverages: ['proj-003'], sports: ['proj-005','proj-006'], ngo: ['proj-007','proj-008'] },
  destination: { desert: ['proj-001','proj-005'], jungle: ['proj-004','proj-008'], city: ['proj-002','proj-006','proj-009'], coast: [], mountain: ['proj-007'] },
  style: { cinematic: ['proj-001','proj-002','proj-009'], documentary: ['proj-004','proj-007','proj-008','proj-010'], commercial: ['proj-003','proj-005'], artistic: ['proj-009'] },
  pace: { slow: ['proj-004','proj-007','proj-008'], moderate: ['proj-001','proj-009','proj-010'], fast: ['proj-002','proj-003','proj-005','proj-006'], mixed: ['proj-001','proj-004'] },
}

const CAT_NAMES = { 'cat-cine': 'Cine', 'cat-commercial': 'Publicidad', 'cat-documentary': 'Documental', 'cat-broadcast': 'TV / Broadcast', 'cat-corporate': 'Corporativo', 'cat-sports': 'Deportes', 'cat-realestate': 'Bienes Raíces', 'cat-industrial': 'Industrial' }

export const Gallery = (() => {
  const create = (container, options = {}) => {
    container = $(container) || container
    if (!container) return null

    let PROJECTS = options.projects || []
    const config = { title: options.title || 'Galería de Proyectos', onProjectClick: null, ...options }
    const state = { filteredProjects: [...PROJECTS], currentFilters: {} }
    let element, headerEl, gridEl, emptyEl

    const init = () => {
      element = el('div', 'gallery')
      headerEl = el('div', 'gallery__header')
      gridEl = el('div', 'gallery__grid')
      emptyEl = el('div', 'gallery__empty')
      emptyEl.innerHTML = `<div class="gallery__empty-icon">${getIcon('search')}</div><h3 class="gallery__empty-title">No hay proyectos que coincidan</h3><p class="gallery__empty-text">Intenta ajustar los filtros del configurador para ver más resultados.</p>`
      emptyEl.style.display = 'none'
      element.append(headerEl, gridEl, emptyEl)
      container.appendChild(element)
      render()
    }

    const render = () => { renderHeader(); renderGrid() }

    const renderHeader = () => {
      headerEl.innerHTML = `<h2 class="gallery__title">${sanitize(config.title)}</h2><span class="gallery__count"><strong>${state.filteredProjects.length}</strong> de ${PROJECTS.length} proyectos</span>`
    }

    const renderGrid = () => {
      gridEl.classList.add('gallery__grid--filtering')
      setTimeout(() => {
        clear(gridEl)
        if (!state.filteredProjects.length) { gridEl.style.display = 'none'; emptyEl.style.display = 'flex' }
        else { gridEl.style.display = 'grid'; emptyEl.style.display = 'none'; state.filteredProjects.forEach((p, i) => gridEl.appendChild(createCard(p, i))) }
        gridEl.classList.remove('gallery__grid--filtering')
        renderHeader()
      }, 300)
    }

    const createCard = (project, index) => {
      const tags = [CAT_NAMES[project.category], project.client?.name, project.year, project.masterFormat?.split(' ')[0]].filter(Boolean).slice(0, 3)
      const card = elAttr('article', { class: 'gallery__item', style: `animation-delay:${index * 50}ms`, 'data-project-id': project.id, tabindex: '0', role: 'button', 'aria-label': `${project.title} - ${project.subtitle || ''}` })
      card.innerHTML = `
        <div class="gallery__item-image">
          <img src="${sanitize(project.media?.thumbnail || project.media?.poster || '')}" alt="${sanitize(project.title)}" loading="lazy" onerror="this.style.display='none'">
          ${project.status ? `<span class="gallery__item-badge gallery__item-badge--${project.status === 'completed' ? 'completed' : 'in-progress'}">${project.status === 'completed' ? 'Completado' : 'En progreso'}</span>` : ''}
        </div>
        <div class="gallery__item-content">
          <span class="gallery__item-category">${sanitize(CAT_NAMES[project.category] || project.category)}</span>
          <h3 class="gallery__item-title">${sanitize(project.title)}</h3>
          ${project.subtitle ? `<p class="gallery__item-subtitle">${sanitize(project.subtitle)}</p>` : ''}
          <div class="gallery__item-meta">${tags.map(t => `<span class="gallery__item-tag">${sanitize(t)}</span>`).join('')}</div>
        </div>`
      card.addEventListener('click', () => config.onProjectClick?.(project))
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); config.onProjectClick?.(project) } })
      return card
    }

    const applyFilters = (filters) => {
      const matchingIds = new Set(PROJECTS.map(p => p.id))
      for (const [catId, optId] of Object.entries(filters)) {
        if (optId && CATEGORY_MAP[catId]?.[optId]) {
          const catMatches = new Set(CATEGORY_MAP[catId][optId])
          for (const id of matchingIds) { if (!catMatches.has(id)) matchingIds.delete(id) }
        }
      }
      state.filteredProjects = PROJECTS.filter(p => matchingIds.has(p.id))
      renderGrid()
    }

    init()

    return {
      get element() { return element },
      applyFilters,
      clearFilters: () => { state.filteredProjects = [...PROJECTS]; renderGrid() },
      setProjects: (p) => { PROJECTS = p; state.filteredProjects = [...PROJECTS]; render() },
      getFilteredProjects: () => [...state.filteredProjects],
    }
  }

  return { create }
})()
