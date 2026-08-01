export const observeOnce = (el, cls = 'is-visible', opts = {}) => {
  if (!el || !('IntersectionObserver' in window)) { el?.classList.add(cls); return }
  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { el.classList.add(cls); obs.disconnect() }
  }, { threshold: 0.1, ...opts })
  obs.observe(el)
}

export const createObserver = (callback, opts = {}) => {
  return new IntersectionObserver((entries) => entries.forEach(callback), {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    ...opts,
  })
}
