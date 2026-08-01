export const el = (tag, className, ...children) => {
  const element = document.createElement(tag)
  if (className) element.className = className
  for (const child of children) {
    if (child == null) continue
    if (typeof child === 'string') {
      element.insertAdjacentHTML('beforeend', child)
    } else if (child instanceof Node) {
      element.appendChild(child)
    }
  }
  return element
}

export const elAttr = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag)
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') element.className = val
    else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val)
    else if (key.startsWith('on') && typeof val === 'function') element.addEventListener(key.slice(2).toLowerCase(), val)
    else element.setAttribute(key, val)
  }
  for (const child of children) {
    if (child == null) continue
    if (typeof child === 'string') element.insertAdjacentHTML('beforeend', child)
    else if (child instanceof Node) element.appendChild(child)
  }
  return element
}

export const clear = (el) => { el.innerHTML = ''; return el }

export const $ = (sel, ctx = document) => ctx.querySelector(sel)

export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

export const resolveContainer = (container) => {
  if (typeof container === 'string') return $(container)
  return container
}
