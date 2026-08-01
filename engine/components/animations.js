/**
 * Animations Engine — requestAnimationFrame + Intersection Observer
 * Refactored: uses shared utils where applicable, removed verbose comments
 */

export const Animations = (() => {

  const Easing = {
    cinematic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    smooth: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    elastic: (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1 },
    expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    quadInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  }

  class AnimationFrame {
    constructor() { this.animations = new Map(); this.rafId = null }

    animate({ from = 0, to = 1, duration = 600, easing = Easing.smooth, onUpdate, onComplete, delay = 0 } = {}) {
      return new Promise((resolve) => {
        const startTime = performance.now() + delay
        const id = Symbol('animation')
        const tick = (currentTime) => {
          const elapsed = currentTime - startTime
          if (elapsed < 0) { this.rafId = requestAnimationFrame(tick); return }
          const progress = Math.min(elapsed / duration, 1)
          const easedProgress = easing(progress)
          const currentValue = from + (to - from) * easedProgress
          onUpdate?.(currentValue, easedProgress)
          if (progress < 1) { this.rafId = requestAnimationFrame(tick) } else { this.animations.delete(id); onComplete?.(); resolve() }
        }
        this.animations.set(id, tick)
        this.rafId = requestAnimationFrame(tick)
      })
    }

    animateElement(element, properties, { duration = 600, easing = Easing.smooth, delay = 0, transform = true } = {}) {
      const startValues = {}, endValues = {}
      Object.entries(properties).forEach(([prop, value]) => {
        if (transform && ['x', 'y', 'scale', 'rotate', 'opacity'].includes(prop)) {
          startValues[prop] = this._getTransformValue(element, prop)
        } else { startValues[prop] = parseFloat(getComputedStyle(element)[prop]) || 0 }
        endValues[prop] = value
      })
      return this.animate({ from: 0, to: 1, duration, easing, delay, onUpdate: (progress) => {
        Object.keys(properties).forEach(prop => {
          const current = startValues[prop] + (endValues[prop] - startValues[prop]) * progress
          if (transform && ['x', 'y', 'scale', 'rotate'].includes(prop)) this._setTransformValue(element, prop, current)
          else if (prop === 'opacity') element.style.opacity = current
          else element.style[prop] = `${current}px`
        })
      }})
    }

    _getTransformValue(element, prop) {
      const match = element.style.transform?.match(new RegExp(`${prop}\\(([^)]+)\\)`))
      if (!match) return prop === 'scale' ? 1 : 0
      return prop === 'rotate' ? parseFloat(match[1]) * (180 / Math.PI) : parseFloat(match[1])
    }

    _setTransformValue(element, prop, value) {
      const map = this._getTransformMap(element)
      map[prop] = value
      element.style.transform = Object.entries(map).map(([k, v]) => {
        if (k === 'x') return `translateX(${v}px)`
        if (k === 'y') return `translateY(${v}px)`
        if (k === 'scale') return `scale(${v})`
        if (k === 'rotate') return `rotate(${v}deg)`
        return ''
      }).join(' ')
    }

    _getTransformMap(element) {
      const style = element.style.transform || ''
      const map = { x: 0, y: 0, scale: 1, rotate: 0 }
      const translations = style.match(/translate[XY]\(([^)]+)\)/g) || []
      translations.forEach(t => { const [, val] = t.match(/(-?[\d.]+)/); if (t.includes('X')) map.x = parseFloat(val); else map.y = parseFloat(val) })
      const scaleMatch = style.match(/scale\(([^)]+)\)/); if (scaleMatch) map.scale = parseFloat(scaleMatch[1])
      const rotateMatch = style.match(/rotate\(([^)]+)\)/); if (rotateMatch) map.rotate = parseFloat(rotateMatch[1])
      return map
    }

    stop() { cancelAnimationFrame(this.rafId); this.rafId = null; this.animations.clear() }
  }

  class ScrollAnimator {
    constructor({ threshold = 0.1, rootMargin = '0px 0px -50px 0px', root = null } = {}) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) { const cfg = this.elements.get(entry.target); if (cfg && !cfg.animated) this.triggerAnimation(entry.target, cfg) } })
      }, { threshold, rootMargin, root })
      this.elements = new Map()
    }

    observe(element, config = {}) {
      if (!element) return
      const animConfig = { animation: 'fadeIn', duration: 600, delay: 0, easing: Easing.smooth, once: true, animated: false, ...config }
      element.style.opacity = '0'
      if (['slideUp', 'slideLeft', 'slideRight', 'scaleIn'].includes(animConfig.animation)) element.style.transform = this._getInitialTransform(animConfig.animation)
      this.elements.set(element, animConfig)
      this.observer.observe(element)
    }

    observeAll(elements, config = {}) { elements.forEach(el => this.observe(el, config)) }

    triggerAnimation(element, config) {
      const { animation, duration, delay, easing } = config
      const transforms = {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
        slideDown: { from: { opacity: 0, y: -40 }, to: { opacity: 1, y: 0 } },
        slideLeft: { from: { opacity: 0, x: 60 }, to: { opacity: 1, x: 0 } },
        slideRight: { from: { opacity: 0, x: -60 }, to: { opacity: 1, x: 0 } },
        scaleIn: { from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } },
        blurIn: { from: { opacity: 0, filter: 'blur(10px)' }, to: { opacity: 1, filter: 'blur(0px)' } },
        parallax: { from: { y: 60 }, to: { y: 0 } },
      }
      const anim = transforms[animation] || transforms.fadeIn
      const frame = new AnimationFrame()
      frame.animate({ from: 0, to: 1, duration, delay, easing, onUpdate: (progress) => {
        Object.keys(anim.to).forEach(prop => {
          const from = anim.from[prop], to = anim.to[prop]
          if (prop === 'filter') { element.style.filter = `blur(${(parseFloat(from) || 0) + ((parseFloat(to) || 0) - (parseFloat(from) || 0)) * progress}px)` }
          else if (prop === 'opacity') element.style.opacity = from + (to - from) * progress
          else element.style.transform = this._buildTransform(prop, from + (to - from) * progress)
        })
      }, onComplete: () => { config.animated = true; element.style.opacity = anim.to.opacity ?? 1; if (anim.to.filter) element.style.filter = anim.to.filter } })
    }

    _getInitialTransform(a) { return { slideUp: 'translateY(40px)', slideDown: 'translateY(-40px)', slideLeft: 'translateX(60px)', slideRight: 'translateX(-60px)', scaleIn: 'scale(0.8)' }[a] || 'none' }
    _buildTransform(prop, value) { return prop === 'x' ? `translateX(${value}px)` : prop === 'y' ? `translateY(${value}px)` : prop === 'scale' ? `scale(${value})` : prop === 'rotate' ? `rotate(${value}deg)` : '' }
    disconnect() { this.observer?.disconnect(); this.elements.clear() }
  }

  class ParallaxEffect {
    constructor() { this.elements = new Map(); this.isRunning = false; this.ticking = false }

    add(element, config = {}) {
      this.elements.set(element, { speed: 0.3, direction: 'vertical', limit: null, offset: 0, ...config })
      if (!this.isRunning) this.start()
    }

    start() {
      if (this.isRunning) return; this.isRunning = true
      this.scrollHandler = () => { if (!this.ticking) { requestAnimationFrame(() => { this.update(); this.ticking = false }); this.ticking = true } }
      window.addEventListener('scroll', this.scrollHandler, { passive: true })
      this.update()
    }

    update() {
      this.elements.forEach((cfg, element) => {
        const rect = element.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          let translateY = (rect.top + rect.height / 2 - window.innerHeight / 2) * cfg.speed * -1
          if (cfg.limit) translateY = Math.max(-cfg.limit, Math.min(cfg.limit, translateY))
          element.style.transform = `translateY(${translateY + cfg.offset}px)`
        }
      })
    }

    remove(element) { this.elements.delete(element); element.style.transform = '' }
    stop() { this.isRunning = false; window.removeEventListener('scroll', this.scrollHandler) }
  }

  class HoverEffect {
    constructor(element, options = {}) {
      this.element = element
      this.opts = { intensity: 10, perspective: 1000, speed: 300, easing: Easing.quadInOut, glare: true, glareOpacity: 0.15, scale: 1.02, ...options }
      this.current = { rotateX: 0, rotateY: 0, scale: 1 }
      this.target = { rotateX: 0, rotateY: 0, scale: 1 }
      this.rafId = null; this.isAnimating = false
      this._init()
    }

    _init() {
      this.element.style.transformStyle = 'preserve-3d'
      this.element.style.transition = `transform ${this.opts.speed}ms ${this.opts.easing.toString()}`
      if (this.opts.glare) {
        this.glare = document.createElement('div')
        this.glare.style.cssText = `position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,${this.opts.glareOpacity}) 50%,rgba(255,255,255,0) 100%);opacity:0;pointer-events:none;transition:opacity ${this.opts.speed}ms ease;border-radius:inherit`
        this.element.style.position = 'relative'
        this.element.appendChild(this.glare)
      }
      this.element.addEventListener('mouseenter', this._onEnter.bind(this))
      this.element.addEventListener('mouseleave', this._onLeave.bind(this))
      this.element.addEventListener('mousemove', this._onMove.bind(this))
    }

    _onEnter() { this.target.scale = this.opts.scale; this.glare && (this.glare.style.opacity = '1'); this._startAnimation() }
    _onLeave() { this.target = { rotateX: 0, rotateY: 0, scale: 1 }; this.glare && (this.glare.style.opacity = '0'); this._startAnimation() }

    _onMove(e) {
      const rect = this.element.getBoundingClientRect()
      const x = e.clientX - rect.left, y = e.clientY - rect.top
      this.target.rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -this.opts.intensity
      this.target.rotateY = ((x - rect.width / 2) / (rect.width / 2)) * this.opts.intensity
      if (this.glare) {
        this.glare.style.background = `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%,rgba(255,255,255,${this.opts.glareOpacity}) 0%,rgba(255,255,255,0) 80%)`
      }
      this._startAnimation()
    }

    _startAnimation() { if (this.isAnimating) return; this.isAnimating = true; this._animate() }

    _animate() {
      let progress = 0
      const duration = this.opts.speed, ease = this.opts.easing
      const tick = () => {
        progress = Math.min(progress + 16 / duration, 1)
        const t = ease(progress)
        this.current.rotateX += (this.target.rotateX - this.current.rotateX) * t
        this.current.rotateY += (this.target.rotateY - this.current.rotateY) * t
        this.current.scale += (this.target.scale - this.current.scale) * t
        this.element.style.transform = `perspective(${this.opts.perspective}px) rotateX(${this.current.rotateX}deg) rotateY(${this.current.rotateY}deg) scale(${this.current.scale})`
        progress < 1 ? (this.rafId = requestAnimationFrame(tick)) : (this.isAnimating = false)
      }
      this.rafId = requestAnimationFrame(tick)
    }

    destroy() { cancelAnimationFrame(this.rafId); this.element.removeEventListener('mouseenter', this._onEnter); this.element.removeEventListener('mouseleave', this._onLeave); this.element.removeEventListener('mousemove', this._onMove); this.glare?.remove() }
  }

  class BlurEffect {
    static apply(element, intensity = 10, duration = 300) {
      return new AnimationFrame().animate({ from: 0, to: intensity, duration, easing: Easing.smooth, onUpdate: (v) => { element.style.filter = `blur(${v}px)` } })
    }
    static remove(element, duration = 300) {
      const current = parseFloat(element.style.filter?.match(/blur\(([^)]+)\)/)?.[1]) || 0
      return new AnimationFrame().animate({ from: current, to: 0, duration, easing: Easing.smooth, onUpdate: (v) => { element.style.filter = `blur(${v}px)` }, onComplete: () => { element.style.filter = '' } })
    }
    static toggle(element, intensity = 10, duration = 300) {
      return (parseFloat(element.style.filter?.match(/blur\(([^)]+)\)/)?.[1]) || 0) > 0 ? this.remove(element, duration) : this.apply(element, intensity, duration)
    }
  }

  const convenience = (transformFn) => (element, options = {}) => {
    const frame = new AnimationFrame()
    const { duration = 600, delay = 0, easing = Easing.smooth } = options
    const { initial, update } = transformFn(element)
    Object.assign(element.style, initial)
    return frame.animate({ from: 0, to: 1, duration, delay, easing, onUpdate: (v) => update(element, v) })
  }

  return {
    Easing, AnimationFrame, ScrollAnimator, ParallaxEffect, HoverEffect, BlurEffect,
    fadeIn: convenience((el) => ({ initial: { opacity: '0' }, update: (e, v) => { e.style.opacity = v } })),
    fadeOut: convenience((el) => ({ initial: {}, update: (e, v) => { e.style.opacity = (parseFloat(el.style.opacity) || 1) * (1 - v) } })),
    slideUp: convenience((el) => ({ initial: { opacity: '0', transform: 'translateY(40px)' }, update: (e, v) => { e.style.opacity = v; e.style.transform = `translateY(${40 * (1 - v)}px)` } })),
    scaleIn: convenience((el) => ({ initial: { opacity: '0', transform: 'scale(0.8)' }, update: (e, v) => { e.style.opacity = v; e.style.transform = `scale(${0.8 + 0.2 * v})` } })),
  }
})()
