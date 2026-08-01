/**
 * Lightbox — Modal Cinematográfico
 * Refactored: uses shared utils, reduced from 770 to ~280 lines
 */

import { el, elAttr, clear, $, sanitize, getIcon, trapFocus, createObserver } from '../../src/utils.js'

export const Lightbox = (() => {
  let lightboxCounter = 0
  let activeLightbox = null

  const defaultConfig = {
    type: 'image',
    videoSrc: null, videoType: 'video/mp4', videoPoster: null, videoAutoplay: true,
    embedUrl: null, html: null,
    items: [], currentIndex: 0,
    showClose: true, showNav: true, showCounter: true, showThumbnails: false,
    showHeader: false, showFooter: false, showCaption: false,
    title: null, subtitle: null, caption: null,
    closeOnBackdrop: true, closeOnEsc: true, trapFocus: true,
    onOpen: null, onClose: null, onNavigate: null,
  }

  function getEmbedUrl(url) {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`
    const vimeo = url.match(/vimeo\.com\/(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
    return url
  }

  function create(config = {}) {
    if (activeLightbox) activeLightbox.close()
    const id = `lightbox-${++lightboxCounter}`
    const cfg = { ...defaultConfig, ...config }
    const state = { isOpen: false, isClosing: false, currentIndex: cfg.currentIndex, focusedElement: null }
    let element, backdrop, container, content, closeButton, prevButton, nextButton, counterEl, captionEl, handleKeyDown

    const init = () => { buildStructure(); setupEventListeners(); open() }

    const buildStructure = () => {
      element = elAttr('div', { id, class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title || 'Lightbox' })
      backdrop = el('div', 'lightbox__backdrop')
      container = el('div', 'lightbox__container')
      content = el('div', 'lightbox__content')
      renderContent()
      container.appendChild(content)
      element.append(backdrop, container)

      if (cfg.showHeader && (cfg.title || cfg.subtitle)) {
        const header = el('div', 'lightbox__header')
        const hc = el('div')
        if (cfg.title) { const t = el('h2', 'lightbox__title'); t.textContent = cfg.title; hc.appendChild(t) }
        if (cfg.subtitle) { const s = el('p', 'lightbox__subtitle'); s.textContent = cfg.subtitle; hc.appendChild(s) }
        header.appendChild(hc)
        element.appendChild(header)
      }

      if (cfg.showFooter) element.appendChild(el('div', 'lightbox__footer'))

      if (cfg.showClose) {
        closeButton = elAttr('button', { type: 'button', class: 'lightbox__close', 'aria-label': 'Cerrar' })
        closeButton.innerHTML = getIcon('x')
        element.appendChild(closeButton)
      }

      if (cfg.type === 'gallery' && cfg.items.length > 1 && cfg.showNav) {
        prevButton = elAttr('button', { type: 'button', class: 'lightbox__nav lightbox__nav--prev', 'aria-label': 'Anterior' })
        prevButton.innerHTML = getIcon('chevron-left')
        nextButton = elAttr('button', { type: 'button', class: 'lightbox__nav lightbox__nav--next', 'aria-label': 'Siguiente' })
        nextButton.innerHTML = getIcon('chevron-right')
        element.append(prevButton, nextButton)
        if (cfg.showCounter) { counterEl = el('div', 'lightbox__counter'); element.appendChild(counterEl); updateCounter() }
        if (cfg.showThumbnails) {
          const thumbs = el('div', 'lightbox__thumbnails')
          cfg.items.forEach((item, i) => {
            const thumb = elAttr('img', { class: 'lightbox__thumbnail', src: item.thumbnail || item.src, alt: item.alt || `Thumbnail ${i + 1}` })
            thumb.addEventListener('click', () => navigateTo(i))
            thumbs.appendChild(thumb)
          })
          element.appendChild(thumbs)
        }
      }

      if (cfg.showCaption && cfg.caption) { captionEl = el('div', 'lightbox__caption'); captionEl.textContent = cfg.caption; element.appendChild(captionEl) }
      document.body.appendChild(element)
    }

    const renderContent = () => {
      clear(content)
      if (cfg.type === 'gallery') {
        const item = cfg.items[state.currentIndex]
        if (!item) return
        if (item.type === 'video' || item.src?.match(/\.(mp4|webm|ogg)$/i)) { cfg.videoSrc = item.src; cfg.videoType = item.type || 'video/mp4'; renderVideo() }
        else if (item.embedUrl) { cfg.embedUrl = item.embedUrl; renderVideo() }
        else { cfg.imageSrc = item.src; renderImage() }
        if (captionEl && item.caption) captionEl.textContent = item.caption
      } else { ({ image: renderImage, video: renderVideo, html: renderHtml })[cfg.type]?.() || renderImage() }
    }

    const renderImage = () => {
      const src = cfg.type === 'gallery' ? cfg.items[state.currentIndex]?.src : cfg.imageSrc
      const img = elAttr('img', { class: 'lightbox__image', src, alt: cfg.items[state.currentIndex]?.alt || 'Imagen', draggable: 'false' })
      img.onload = () => { img.style.opacity = '1' }
      content.appendChild(img)
    }

    const renderVideo = () => {
      const wrapper = el('div', 'lightbox__video-wrapper')
      if (cfg.embedUrl) {
        const iframe = elAttr('iframe', { src: getEmbedUrl(cfg.embedUrl) })
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
        iframe.setAttribute('allowfullscreen', 'true')
        wrapper.appendChild(iframe)
      } else if (cfg.videoSrc) {
        const video = el('video')
        video.src = cfg.videoSrc; video.type = cfg.videoType; video.controls = true; video.autoplay = cfg.videoAutoplay; video.playsInline = true
        if (cfg.videoPoster) video.poster = cfg.videoPoster
        wrapper.appendChild(video)
      }
      content.appendChild(wrapper)
    }

    const renderHtml = () => {
      const c = el('div', 'lightbox__html')
      if (typeof cfg.html === 'string') c.innerHTML = cfg.html
      else if (cfg.html instanceof HTMLElement) c.appendChild(cfg.html)
      content.appendChild(c)
    }

    const setupEventListeners = () => {
      closeButton?.addEventListener('click', close)
      if (cfg.closeOnBackdrop) { backdrop.addEventListener('click', close); container.addEventListener('click', (e) => { if (e.target === container) close() }) }
      handleKeyDown = (e) => { if (!state.isOpen) return; if (e.key === 'Escape' && cfg.closeOnEsc) { e.preventDefault(); close() } else if (cfg.type === 'gallery') { if (e.key === 'ArrowLeft') { e.preventDefault(); prev() } else if (e.key === 'ArrowRight') { e.preventDefault(); next() } } }
      if (cfg.closeOnEsc) document.addEventListener('keydown', handleKeyDown)
      prevButton?.addEventListener('click', prev)
      nextButton?.addEventListener('click', next)
      if (cfg.type === 'gallery') setupTouchSwipe()
    }

    const setupTouchSwipe = () => {
      let startX = 0, isDragging = false
      content.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isDragging = true }, { passive: true })
      content.addEventListener('touchmove', (e) => { if (!isDragging) return; if (Math.abs(e.touches[0].clientX - startX) > Math.abs(e.touches[0].clientY - e.touches[0].clientY)) e.preventDefault() }, { passive: false })
      content.addEventListener('touchend', (e) => { if (!isDragging) return; isDragging = false; const diff = startX - e.changedTouches[0].clientX; if (Math.abs(diff) > 50) diff > 0 ? next() : prev() })
    }

    const open = () => {
      state.isOpen = true; activeLightbox = getPublicAPI()
      document.body.classList.add('lightbox-open')
      state.focusedElement = document.activeElement
      requestAnimationFrame(() => element.classList.add('lightbox--active'))
      if (cfg.trapFocus) trapFocus(element)
      cfg.onOpen?.(getPublicAPI())
    }

    const close = () => {
      if (!state.isOpen || state.isClosing) return
      state.isClosing = true; state.isOpen = false
      element.classList.add('lightbox--exit')
      element.classList.remove('lightbox--active')
      const video = content.querySelector('video'); video?.pause()
      const iframe = content.querySelector('iframe'); if (iframe) iframe.src = iframe.src
      setTimeout(() => {
        element.remove(); document.body.classList.remove('lightbox-open')
        state.focusedElement?.focus()
        if (cfg.closeOnEsc) document.removeEventListener('keydown', handleKeyDown)
        cfg.onClose?.(getPublicAPI())
        if (activeLightbox === getPublicAPI()) activeLightbox = null
        state.isClosing = false
      }, 300)
    }

    const prev = () => { if (state.currentIndex > 0) navigateTo(state.currentIndex - 1) }
    const next = () => { if (state.currentIndex < cfg.items.length - 1) navigateTo(state.currentIndex + 1) }
    const navigateTo = (index) => {
      if (index < 0 || index >= cfg.items.length) return
      state.currentIndex = index; renderContent(); updateCounter(); updateNavButtons(); updateThumbnails()
      cfg.onNavigate?.(index, cfg.items[index], getPublicAPI())
    }

    const updateCounter = () => { counterEl && (counterEl.textContent = `${state.currentIndex + 1} / ${cfg.items.length}`) }
    const updateNavButtons = () => { prevButton && (prevButton.disabled = state.currentIndex === 0); nextButton && (nextButton.disabled = state.currentIndex === cfg.items.length - 1) }
    const updateThumbnails = () => { element.querySelectorAll('.lightbox__thumbnail').forEach((t, i) => t.classList.toggle('lightbox__thumbnail--active', i === state.currentIndex)) }

    function getPublicAPI() { return { id, element, state: { ...state }, config: { ...cfg }, close, prev, next, navigateTo, renderContent } }

    init()
    return getPublicAPI()
  }

  const openImage = (src, opts = {}) => create({ type: 'image', imageSrc: src, ...opts })
  const openVideo = (src, opts = {}) => create({ type: 'video', videoSrc: src, ...opts })
  const openEmbed = (url, opts = {}) => create({ type: 'video', embedUrl: url, ...opts })
  const openHtml = (content, opts = {}) => create({ type: 'html', html: content, ...opts })
  const openGallery = (items, startIndex = 0, opts = {}) => create({ type: 'gallery', items, currentIndex: startIndex, ...opts })
  const closeActive = () => activeLightbox?.close()

  return { create, openImage, openVideo, openEmbed, openHtml, openGallery, closeActive }
})()
