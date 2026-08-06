/**
 * Loader — Shows/hides the loading screen
 */
import { $ } from '../../shared/utils/dom.js'
import { PRODUCT_CONFIG } from '../../config/product.config.js'

export const Loader = (() => {
  let el = null

  const show = () => {
    el = document.createElement('div')
    el.id = 'loader'
    el.className = 'loader'
    el.setAttribute('aria-live', 'polite')
    el.innerHTML = `
      <div class="loader__inner">
        <div class="loader__spinner"></div>
        <span class="loader__text">${PRODUCT_CONFIG.name}</span>
      </div>`
    document.body.prepend(el)
  }

  const hide = () => {
    if (!el) return
    el.classList.add('loader--exit')
    el.addEventListener('animationend', () => el.remove(), { once: true })
    setTimeout(() => el?.remove(), 600)
    el = null
  }

  return { show, hide }
})()
