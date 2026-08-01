/**
 * Filters — Standalone filter form component
 * Extracted from engine.js, uses shared utils
 */

import { el, elAttr, clear, $, sanitize, getLabel } from './utils.js'

export const Filters = (() => {

  const inferEnumFields = (items) => {
    if (!items?.length) return {}
    const skip = new Set(['id', 'slug', 'name', 'title', 'description', 'bio', 'synopsis', 'quote', 'question', 'answer', 'email', 'phone', 'address', 'avatar', 'logo', 'icon'])
    const enums = {}
    for (const key of Object.keys(items[0])) {
      if (skip.has(key)) continue
      const values = [...new Set(items.map(i => i[key]).filter(v => v != null && typeof v === 'string'))]
      if (values.length > 1 && values.length <= 12) enums[key] = values
    }
    return enums
  }

  const create = (container, options = {}) => {
    container = $(container) || container
    if (!container) return null

    const { items = [], enums, search = true, searchPlaceholder = 'Buscar...', onFilterChange } = options
    const filterEnums = enums || inferEnumFields(items)
    const state = { search: '', filters: {} }

    clear(container)
    const form = el('form', 'engine-filters')
    form.style.cssText = 'display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:end'
    form.setAttribute('data-engine', 'filters')

    if (search !== false) {
      const wrapper = el('div', 'input-group')
      wrapper.style.flex = '1 1 200px'
      wrapper.innerHTML = `
        <label class="label">Buscar</label>
        <input type="search" class="input input--sm" placeholder="${sanitize(searchPlaceholder)}">`
      wrapper.querySelector('input').addEventListener('input', (e) => {
        state.search = e.target.value.toLowerCase()
        onFilterChange?.({ ...state })
      })
      form.appendChild(wrapper)
    }

    for (const [field, values] of Object.entries(filterEnums)) {
      const wrapper = el('div', 'input-group')
      wrapper.style.minWidth = '150px'
      const select = el('select', 'input input--sm')
      select.innerHTML = `<option value="">Todos</option>${values.map(v => `<option value="${v}">${getLabel(v)}</option>`).join('')}`
      select.addEventListener('change', (e) => { state.filters[field] = e.target.value; onFilterChange?.({ ...state }) })
      wrapper.innerHTML = `<label class="label">${getLabel(field)}</label>`
      wrapper.appendChild(select)
      form.appendChild(wrapper)
    }

    const clearBtn = el('button', 'btn btn--ghost btn--sm', 'Limpiar')
    clearBtn.type = 'button'
    clearBtn.addEventListener('click', () => {
      form.querySelectorAll('input, select').forEach(e => { e.value = '' })
      state.search = ''; state.filters = {}
      onFilterChange?.({ ...state, reset: true })
    })
    form.appendChild(clearBtn)
    container.appendChild(form)

    return {
      getState: () => ({ ...state }),
      reset: () => {
        form.querySelectorAll('input, select').forEach(e => { e.value = '' })
        state.search = ''; state.filters = {}
        onFilterChange?.({ ...state, reset: true })
      },
      destroy: () => clear(container),
    }
  }

  return { create, inferEnumFields }
})()
