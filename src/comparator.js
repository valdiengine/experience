/**
 * Comparator — Standalone comparison table component
 * Extracted from engine.js, uses shared utils
 */

import { el, elAttr, clear, $, sanitize, getLabel, formatValue } from './utils.js'

export const Comparator = (() => {

  const create = (container, options = {}) => {
    container = $(container) || container
    if (!container) return null

    const { items = [], fields = [], maxItems = 3, titleField = 'name', label = 'Comparar' } = options
    if (!items.length) return null

    const selected = []
    clear(container)

    const selectorWrapper = el('div', '')
    selectorWrapper.style.cssText = 'display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4)'
    selectorWrapper.innerHTML = `<span class="text-caption">${sanitize(label)}:</span>`

    const tableWrapper = el('div', 'engine-comparator')
    tableWrapper.style.overflowX = 'auto'

    const renderComparison = () => {
      if (!selected.length) {
        tableWrapper.innerHTML = `<p class="text-caption text-secondary" style="padding:var(--space-2)">Selecciona hasta ${maxItems} elementos</p>`
        return
      }
      const compareItems = selected.map(i => items[i])
      tableWrapper.innerHTML = `<table class="data-table" style="width:100%"><tbody>${
        fields.map(f => `<tr><td class="text-caption" style="padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--border-subtle);font-weight:var(--weight-semibold)">${getLabel(f)}</td>${compareItems.map(item => `<td style="padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--border-subtle)">${sanitize(formatValue(item[f]))}</td>`).join('')}</tr>`).join('')
      }</tbody></table>`
    }

    items.forEach((item, i) => {
      const btn = el('button', 'btn btn--secondary btn--sm')
      btn.textContent = item[titleField] || `Item ${i + 1}`
      btn.addEventListener('click', () => {
        const idx = selected.indexOf(i)
        if (idx >= 0) { selected.splice(idx, 1); btn.className = 'btn btn--secondary btn--sm' }
        else if (selected.length < maxItems) { selected.push(i); btn.className = 'btn btn--primary btn--sm' }
        renderComparison()
      })
      selectorWrapper.appendChild(btn)
    })

    container.appendChild(selectorWrapper)
    container.appendChild(tableWrapper)
    renderComparison()

    return {
      getSelected: () => [...selected].map(i => items[i]),
      destroy: () => clear(container),
    }
  }

  return { create }
})()
