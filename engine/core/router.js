/**
 * Router — Hash-based SPA routing
 * Reads data-route attributes from <section> elements
 */
import { $, $$ } from '../../shared/utils/dom.js'
import { announce } from '../../shared/utils/a11y.js'

export const Router = (() => {
  let currentRoute = null
  const listeners = new Set()

  const getRoute = () => location.hash.slice(1) || 'dashboard'

  const navigate = (route) => {
    if (route === currentRoute) return
    const section = $(`[data-route="${route}"]`)
    if (!section) return

    // Hide all pages
    $$('[data-page]').forEach(p => p.setAttribute('hidden', ''))

    // Show target
    section.removeAttribute('hidden')

    // Update sidebar active state
    $$('.sidebar__link').forEach(link => {
      const isActive = link.getAttribute('href') === `#${route}`
      link.toggleAttribute('aria-current', isActive)
    })

    currentRoute = route
    listeners.forEach(fn => fn(route))
    announce(`Navegaste a ${route}`)
  }

  const onRouteChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

  const init = () => {
    window.addEventListener('hashchange', () => navigate(getRoute()))
    navigate(getRoute())
  }

  return { init, navigate, onRouteChange, getCurrent: () => currentRoute }
})()
