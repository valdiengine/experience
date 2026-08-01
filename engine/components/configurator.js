/**
 * Configurator — Apple-inspired Visual Selector
 * Refactored: uses shared utils, reduced duplication
 */

import { el, elAttr, clear, $, $$, sanitize, getIcon, observeOnce } from '../../src/utils.js'

const CATEGORIES = {
  drone:     { id: 'drone', label: 'Drone', description: 'Selecciona el equipo de captura', options: [
    { id: 'any', name: 'Cualquiera', icon: 'grid', meta: 'Todos los drones' },
    { id: 'cinema', name: 'Cinema', icon: 'film', meta: 'ARRI, RED, 8K' },
    { id: 'fpv', name: 'FPV', icon: 'rocket', meta: 'Alta velocidad' },
    { id: 'heavy', name: 'Carga Pesada', icon: 'weight', meta: 'Equipos cinematográficos' },
    { id: 'enterprise', name: 'Enterprise', icon: 'building', meta: 'Industrial / Térmica' },
  ]},
  client:    { id: 'client', label: 'Cliente', description: 'Filtrar por cliente', options: [
    { id: 'any', name: 'Todos', icon: 'grid', meta: 'Todos los clientes' },
    { id: 'streaming', name: 'Streaming', icon: 'play', meta: 'Netflix, HBO, Apple' },
    { id: 'automotive', name: 'Automotriz', icon: 'car', meta: 'Porsche, Audi' },
    { id: 'beverages', name: 'Bebidas', icon: 'wine', meta: 'Cuervo, Coca-Cola' },
    { id: 'sports', name: 'Deportes', icon: 'trophy', meta: 'F1, Eventos' },
    { id: 'ngo', name: 'ONG', icon: 'leaf', meta: 'WWF, BBC Earth' },
  ]},
  destination: { id: 'destination', label: 'Destino', description: 'Elige la ubicación de rodaje', options: [
    { id: 'any', name: 'Todos', icon: 'grid', meta: 'Todos los destinos' },
    { id: 'desert', name: 'Desierto', icon: 'sun', meta: 'Sonora, Atacama' },
    { id: 'jungle', name: 'Selva', icon: 'tree', meta: 'Calakmul, Lacandón' },
    { id: 'city', name: 'Ciudad', icon: 'building', meta: 'CDMX, LA, Madrid' },
    { id: 'coast', name: 'Costa', icon: 'wave', meta: 'Playas, Acapulco' },
    { id: 'mountain', name: 'Montaña', icon: 'mountain', meta: 'Volcanes, Sierras' },
  ]},
  style:     { id: 'style', label: 'Estilo', description: 'Define la estética visual', options: [
    { id: 'any', name: 'Todos', icon: 'grid', meta: 'Todos los estilos' },
    { id: 'cinematic', name: 'Cinematográfico', icon: 'film', meta: 'Dramático, Épico' },
    { id: 'documentary', name: 'Documental', icon: 'camera', meta: 'Natural, Observacional' },
    { id: 'commercial', name: 'Comercial', icon: 'megaphone', meta: 'Limpio, Moderno' },
    { id: 'artistic', name: 'Artístico', icon: 'star', meta: 'Experimental' },
  ]},
  pace:      { id: 'pace', label: 'Ritmo', description: 'Velocidad del montaje', options: [
    { id: 'any', name: 'Todos', icon: 'grid', meta: 'Todos los ritmos' },
    { id: 'slow', name: 'Lento', icon: 'cloud', meta: 'Pausado, Reflexivo' },
    { id: 'moderate', name: 'Moderado', icon: 'activity', meta: 'Equilibrado' },
    { id: 'fast', name: 'Rápido', icon: 'zap', meta: 'Dinámico, Enérgico' },
    { id: 'mixed', name: 'Mixto', icon: 'shuffle', meta: 'Variación de ritmo' },
  ]},
}

const STEPS = ['drone', 'client', 'destination', 'style', 'pace']

export const Configurator = (() => {
  const create = (container, options = {}) => {
    container = $(container) || container
    if (!container) return null

    const config = { categories: CATEGORIES, onChange: null, ...options }
    const state = { currentStep: 'drone', selections: { drone: null, client: null, destination: null, style: null, pace: null }, completedSteps: [] }
    let element, stepperEl, panelEl, navEl

    const init = () => {
      element = el('div', 'configurator')
      const header = el('div', 'configurator__header')
      header.innerHTML = `<h2 class="configurator__title">${sanitize(options.title || 'Configura tu Experiencia')}</h2><p class="configurator__subtitle">${sanitize(options.subtitle || 'Personaliza cada aspecto de tu producción cinematográfica')}</p>`
      element.appendChild(header)
      stepperEl = el('div', 'configurator__stepper')
      panelEl = el('div', 'configurator__panel')
      navEl = el('div', 'configurator__nav')
      element.append(stepperEl, panelEl, navEl)
      container.appendChild(element)
      render()
    }

    const render = () => { renderStepper(); renderPanel(); renderNav() }

    const renderStepper = () => {
      clear(stepperEl)
      STEPS.forEach((stepId, i) => {
        const cat = config.categories[stepId]
        const btn = elAttr('button', { type: 'button', class: `configurator__step${stepId === state.currentStep ? ' configurator__step--active' : state.completedSteps.includes(stepId) ? ' configurator__step--completed' : ''}`, 'data-step': stepId })
        const num = state.completedSteps.includes(stepId) ? getIcon('check') : String(i + 1)
        btn.innerHTML = `<span class="configurator__step-number">${num}</span><span>${cat.label}</span>`
        btn.addEventListener('click', () => goToStep(stepId))
        stepperEl.appendChild(btn)
        if (i < STEPS.length - 1) stepperEl.appendChild(el('div', 'configurator__step-connector'))
      })
    }

    const renderPanel = () => {
      clear(panelEl)
      const inner = el('div', 'configurator__panel-inner')
      const cat = config.categories[state.currentStep]
      inner.innerHTML = `<div><h3 class="configurator__category-label">${sanitize(cat.label)}</h3><p class="configurator__category-description">${sanitize(cat.description)}</p></div>`
      const grid = el('div', 'configurator__options')
      cat.options.forEach(opt => grid.appendChild(createOption(opt, state.currentStep)))
      inner.appendChild(grid)
      panelEl.appendChild(inner)
    }

    const createOption = (option, categoryId) => {
      const isSelected = state.selections[categoryId] === option.id || (option.id === 'any' && state.selections[categoryId] === null)
      const card = elAttr('div', {
        class: `configurator__option${isSelected ? ' configurator__option--selected' : ''}`,
        'data-option-id': option.id,
        role: 'radio',
        'aria-checked': isSelected,
        tabindex: '0',
        'aria-label': `${option.name} - ${option.meta}`,
      })
      card.innerHTML = `
        <div class="configurator__option-icon">${getIcon(option.icon)}</div>
        <div class="configurator__option-content"><span class="configurator__option-name">${sanitize(option.name)}</span><span class="configurator__option-meta">${sanitize(option.meta)}</span></div>
        <div class="configurator__option-check">${getIcon('check')}</div>`
      card.addEventListener('click', () => selectOption(option.id, categoryId))
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(option.id, categoryId) } })
      return card
    }

    const selectOption = (optionId, categoryId) => {
      state.selections[categoryId] = optionId === 'any' ? null : optionId
      if (!state.completedSteps.includes(categoryId)) state.completedSteps.push(categoryId)
      render()
      const idx = STEPS.indexOf(categoryId)
      if (idx < STEPS.length - 1) goToStep(STEPS[idx + 1])
      config.onChange?.({ selections: { ...state.selections }, hasSelections: Object.values(state.selections).some(v => v !== null) })
    }

    const goToStep = (stepId) => { state.currentStep = stepId; renderStepper(); renderPanel() }

    const renderNav = () => {
      clear(navEl)
      const parts = STEPS.filter(s => state.selections[s]).map(s => `${config.categories[s].label}: ${config.categories[s].options.find(o => o.id === state.selections[s])?.name}`)
      navEl.innerHTML = `
        <div class="configurator__nav-info"><span class="configurator__nav-label">Selección actual</span><span class="configurator__nav-summary">${parts.length ? parts.join(' → ') : 'Ninguna selección aún'}</span></div>
        <div class="configurator__nav-actions"><button type="button" class="configurator__reset">${getIcon('refresh')} Limpiar todo</button></div>`
      navEl.querySelector('.configurator__reset').addEventListener('click', resetAll)
    }

    const resetAll = () => {
      state.selections = { drone: null, client: null, destination: null, style: null, pace: null }
      state.completedSteps = []; state.currentStep = 'drone'
      render()
      config.onChange?.({ selections: { ...state.selections }, hasSelections: false })
    }

    init()

    return {
      get element() { return element },
      getSelections: () => ({ ...state.selections }),
      setSelection: (cat, opt) => { if (config.categories[cat]) { state.selections[cat] = opt === 'any' ? null : opt; if (!state.completedSteps.includes(cat)) state.completedSteps.push(cat); render(); config.onChange?.({ selections: { ...state.selections }, hasSelections: Object.values(state.selections).some(v => v !== null) }) } },
      reset: resetAll,
      onChange: (cb) => { config.onChange = cb },
    }
  }

  return { create, CATEGORIES }
})()
