import { $, $$ } from './dom.js'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const trapFocus = (container) => {
  const focusable = $$(FOCUSABLE, container)
  if (!focusable.length) return () => {}
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  const handler = (e) => {
    if (e.key !== 'Tab') return
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  container.addEventListener('keydown', handler)
  first.focus()

  return () => container.removeEventListener('keydown', handler)
}

export const announce = (msg, priority = 'polite') => {
  const el = document.createElement('div')
  el.setAttribute('aria-live', priority)
  el.setAttribute('aria-atomic', 'true')
  el.className = 'u-sr-only'
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.textContent = msg; setTimeout(() => el.remove(), 1000) })
}
