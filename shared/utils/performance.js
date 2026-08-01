export const debounce = (fn, ms = 100) => {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }
}

export const throttle = (fn, ms = 16) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= ms) { last = now; fn(...args) }
  }
}

export const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
