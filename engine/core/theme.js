/**
 * ThemeManager — Dark/light theme toggle
 * Reads from data-theme attribute, persists to localStorage
 */
import { $ } from '../../shared/utils/dom.js'

export const ThemeManager = (() => {
  const STORAGE_KEY = 'dronestica-theme'

  const get = () => document.documentElement.getAttribute('data-theme') || 'dark'

  const set = (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }

  const toggle = () => set(get() === 'dark' ? 'light' : 'dark')

  const init = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) set(saved)
  }

  return { init, get, set, toggle }
})()
