/**
 * Carousel — Componente Independiente Cinematográfico
 * Refactored: uses shared utils, reduced from 837 to ~350 lines
 */

import { el, elAttr, clear, $, throttle, debounce, observeOnce, createObserver } from '../../src/utils.js'

export const Carousel = (() => {
  let carouselCounter = 0

  const defaultConfig = {
    slideSize: 'auto', slideWidth: null, gap: 16, loop: false,
    arrows: true, dots: true, counter: false, progress: false,
    autoplay: false, autoplayInterval: 5000, pauseOnHover: true, pauseOnFocus: true,
    lazy: false, lazyThreshold: 0.1,
    drag: true, dragThreshold: 10,
    onSlideChange: null, onDragStart: null, onDragEnd: null, onLoad: null,
  }

  function create(container, options = {}) {
    if (!container) return null

    const id = `carousel-${++carouselCounter}`
    const config = { ...defaultConfig, ...options }
    const state = { currentSlide: 0, totalSlides: 0, isDragging: false, startX: 0, scrollLeft: 0, dragStartX: 0, dragStartScrollLeft: 0, autoplayTimer: null, isPaused: false, isFocused: false, slides: [], loadedSlides: new Set() }

    let element, viewport, track, arrowsEls = { prev: null, next: null }, dotsContainer, counterEl, progressBar

    const init = () => { buildStructure(); setupEventListeners(); updateState(); if (config.autoplay) startAutoplay() }

    const buildStructure = () => {
      element = elAttr('div', { id, class: 'carousel', role: 'region', 'aria-label': 'Carrusel' })
      viewport = el('div', 'carousel__viewport')
      track = elAttr('div', { class: 'carousel__track', tabindex: '0', role: 'list' })
      track.style.setProperty('--carousel-gap', `${config.gap}px`)

      Array.from(container.children).forEach(child => track.appendChild(createSlide(child)))
      viewport.appendChild(track)
      element.appendChild(viewport)

      if (config.arrows) element.appendChild(createArrows())
      if (config.dots) { dotsContainer = createDots(); element.appendChild(dotsContainer) }
      if (config.counter) { counterEl = el('div', 'carousel__counter'); counterEl.innerHTML = '<span class="carousel__counter-text"></span>'; element.appendChild(counterEl) }
      if (config.progress) { progressBar = el('div', 'carousel__progress'); progressBar.innerHTML = '<div class="carousel__progress-bar" style="width:0%"></div>'; element.appendChild(progressBar) }

      container.innerHTML = ''
      container.appendChild(element)
      state.slides = Array.from(track.children)
      state.totalSlides = state.slides.length
    }

    const createSlide = (content) => {
      const slide = elAttr('div', { class: 'carousel__slide', role: 'listitem' })
      if (config.slideSize !== 'auto') slide.classList.add(`carousel__slide--${config.slideSize}`)
      if (config.lazy) {
        slide.classList.add('carousel__slide--lazy')
        slide.appendChild(el('div', 'carousel__lazy-placeholder'))
        const wrapper = el('div', 'carousel__lazy-content')
        if (content instanceof HTMLElement) wrapper.appendChild(content)
        else if (typeof content === 'string') wrapper.innerHTML = content
        slide.appendChild(wrapper)
      } else {
        if (content instanceof HTMLElement) slide.appendChild(content)
        else if (typeof content === 'string') slide.innerHTML = content
      }
      return slide
    }

    const createArrows = () => {
      const nav = el('div', 'carousel__nav')
      const makeArrow = (dir, cls, label) => {
        const btn = elAttr('button', { type: 'button', class: `carousel__arrow ${cls}`, 'aria-label': label })
        btn.innerHTML = dir === 'prev' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
        btn.addEventListener('click', dir === 'prev' ? prev : next)
        return btn
      }
      arrowsEls.prev = makeArrow('prev', 'carousel__arrow--prev', 'Anterior')
      arrowsEls.next = makeArrow('next', 'carousel__arrow--next', 'Siguiente')
      nav.append(arrowsEls.prev, arrowsEls.next)
      return nav
    }

    const createDots = () => elAttr('div', { class: 'carousel__dots', role: 'tablist' })

    const setupEventListeners = () => {
      track.addEventListener('scroll', updateState, { passive: true })
      if (config.drag) {
        track.addEventListener('mousedown', (e) => { if (e.button !== 0) return; state.isDragging = true; state.dragStartX = e.pageX; state.dragStartScrollLeft = track.scrollLeft; track.classList.add('carousel__track--dragging'); config.onDragStart?.(getPublicAPI()) })
        track.addEventListener('mousemove', throttle((e) => { if (!state.isDragging) return; e.preventDefault(); track.scrollLeft = state.dragStartScrollLeft + (state.dragStartX - e.pageX) * 1.5 }, 16))
        const endDrag = () => { if (!state.isDragging) return; state.isDragging = false; track.classList.remove('carousel__track--dragging'); snapToNearestSlide(); config.onDragEnd?.(getPublicAPI()) }
        track.addEventListener('mouseup', endDrag)
        track.addEventListener('mouseleave', endDrag)
      }
      track.addEventListener('touchstart', (e) => { state.isDragging = true; state.startX = e.touches[0].pageX; state.scrollLeft = track.scrollLeft; config.onDragStart?.(getPublicAPI()) }, { passive: true })
      track.addEventListener('touchmove', (e) => { if (!state.isDragging) return; const walk = (state.startX - e.touches[0].pageX) * 1.2; if (Math.abs(walk) > 10) e.preventDefault(); track.scrollLeft = state.scrollLeft + walk }, { passive: false })
      track.addEventListener('touchend', () => { if (!state.isDragging) return; state.isDragging = false; snapToNearestSlide(); config.onDragEnd?.(getPublicAPI()) })
      track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; if (Math.abs(e.deltaY) > 0) { e.preventDefault(); track.scrollLeft += e.deltaY * 2 } }, { passive: false })
      track.addEventListener('keydown', (e) => { const actions = { ArrowLeft: prev, ArrowRight: next, Home: () => goTo(0), End: () => goTo(state.totalSlides - 1) }; if (actions[e.key]) { e.preventDefault(); actions[e.key]() } })
      track.addEventListener('focus', () => { state.isFocused = true })
      track.addEventListener('blur', () => { state.isFocused = false })
      if (config.autoplay && config.pauseOnHover) { element.addEventListener('mouseenter', pause); element.addEventListener('mouseleave', resume) }
      if (config.autoplay && config.pauseOnFocus) { track.addEventListener('focusin', pause); track.addEventListener('focusout', resume) }
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(debounce(updateState, 100)).observe(track)
    }

    const updateState = () => {
      if (!track || !state.slides.length) return
      const slideWidth = state.slides[0]?.offsetWidth || 0
      if (slideWidth > 0) {
        const newSlide = Math.round(track.scrollLeft / (slideWidth + config.gap))
        if (newSlide !== state.currentSlide && newSlide >= 0 && newSlide < state.totalSlides) {
          state.currentSlide = newSlide
          config.onSlideChange?.(getPublicAPI())
        }
      }
      updateDots(); updateCounter(); updateProgress(); updateArrows(); loadVisibleSlides()
    }

    const updateDots = () => {
      if (!dotsContainer) return
      if (dotsContainer.children.length !== state.totalSlides) {
        clear(dotsContainer)
        for (let i = 0; i < state.totalSlides; i++) {
          const dot = elAttr('button', { type: 'button', class: 'carousel__dot', role: 'tab', 'aria-label': `Slide ${i + 1}`, 'aria-selected': 'false' })
          dot.addEventListener('click', () => goTo(i))
          dotsContainer.appendChild(dot)
        }
      }
      Array.from(dotsContainer.children).forEach((dot, i) => {
        const isActive = i === state.currentSlide
        dot.classList.toggle('carousel__dot--active', isActive)
        dot.setAttribute('aria-selected', isActive.toString())
      })
    }

    const updateCounter = () => { counterEl && (counterEl.querySelector('.carousel__counter-text').textContent = `${state.currentSlide + 1} / ${state.totalSlides}`) }
    const updateProgress = () => { const bar = progressBar?.querySelector('.carousel__progress-bar'); if (bar && state.totalSlides > 0) bar.style.width = `${((state.currentSlide + 1) / state.totalSlides) * 100}%` }
    const updateArrows = () => { if (!config.arrows) return; arrowsEls.prev && (arrowsEls.prev.disabled = !config.loop && state.currentSlide === 0); arrowsEls.next && (arrowsEls.next.disabled = !config.loop && state.currentSlide === state.totalSlides - 1) }

    const loadVisibleSlides = () => {
      if (!config.lazy) return
      const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { const idx = state.slides.indexOf(entry.target); if (idx !== -1 && !state.loadedSlides.has(idx)) { entry.target.classList.add('carousel__slide--loaded'); state.loadedSlides.add(idx); config.onLoad?.(idx, entry.target, getPublicAPI()) } } }) }, { root: track, threshold: config.lazyThreshold })
      state.slides.forEach(s => { if (!s.classList.contains('carousel__slide--loaded')) observer.observe(s) })
    }

    const snapToNearestSlide = () => { if (!state.slides.length) return; track.scrollTo({ left: state.currentSlide * (state.slides[0].offsetWidth + config.gap), behavior: 'smooth' }) }
    const prev = () => { if (state.currentSlide > 0) goTo(state.currentSlide - 1); else if (config.loop) goTo(state.totalSlides - 1) }
    const next = () => { if (state.currentSlide < state.totalSlides - 1) goTo(state.currentSlide + 1); else if (config.loop) goTo(0) }
    const goTo = (index) => { if (index < 0 || index >= state.totalSlides) return; state.currentSlide = index; track.scrollTo({ left: index * (state.slides[0].offsetWidth + config.gap), behavior: 'smooth' }); updateState() }

    const startAutoplay = () => { if (state.autoplayTimer) return; state.autoplayTimer = setInterval(() => { if (!state.isPaused && !state.isFocused) next() }, config.autoplayInterval) }
    const stopAutoplay = () => { clearInterval(state.autoplayTimer); state.autoplayTimer = null }
    const pause = () => { state.isPaused = true }
    const resume = () => { state.isPaused = false }

    const addSlides = (content) => { (Array.isArray(content) ? content : [content]).forEach(item => { const slide = createSlide(item); track.appendChild(slide); state.slides.push(slide) }); state.totalSlides = state.slides.length; updateState() }
    const removeSlide = (index) => { if (index < 0 || index >= state.totalSlides) return; state.slides[index].remove(); state.slides.splice(index, 1); state.totalSlides = state.slides.length; if (state.currentSlide >= state.totalSlides) state.currentSlide = state.totalSlides - 1; updateState() }
    const clearSlides = () => { clear(track); state.slides = []; state.totalSlides = 0; state.currentSlide = 0; state.loadedSlides.clear(); dotsContainer && clear(dotsContainer); updateState() }

    function getPublicAPI() { return { id, element, track, state: { ...state }, config: { ...config }, init, prev, next, goTo, addSlides, removeSlide, clear: clearSlides, startAutoplay, stopAutoplay, pause, resume, updateState } }

    init()
    return getPublicAPI()
  }

  function createFromData(container, data, renderer, options = {}) {
    if (!container || !data?.length || !renderer) return null
    const carousel = create(container, options)
    carousel.addSlides(data.map((item, i) => renderer(item, i)))
    return carousel
  }

  return { create, createFromData }
})()
