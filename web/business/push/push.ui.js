/**
 * PUSH-1 — Push Notification UI Component
 *
 * Handles push notification opt-in/out UI and subscription management.
 * Works independently of PWA installation.
 *
 * States:
 * - AVAILABLE: Browser supports push, user can opt in
 * - ACTIVE: User has granted permission and is subscribed
 * - DENIED: User has denied permission
 * - UNSUPPORTED: Browser does not support push
 * - LOADING: Checking subscription status
 */

export const PUSH_UI_STATE = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  DENIED: 'DENIED',
  UNSUPPORTED: 'UNSUPPORTED',
  LOADING: 'LOADING'
})

export class PushNotificationUI {
  #options
  #state
  #subscription
  #pushManager

  constructor(options = {}) {
    this.#options = {
      apiBase: options.apiBase || '/api/v1/push',
      vapidPublicKey: options.vapidPublicKey || null,
      buttonText: options.buttonText || {
        activate: 'Activar notificaciones',
        deactivate: 'Desactivar',
        blocked: 'Notificaciones bloqueadas en este navegador',
        unsupported: 'Este navegador no admite notificaciones Push',
        loading: 'Configurando notificaciones...'
      },
      ...options
    }

    this.#state = PUSH_UI_STATE.LOADING
    this.#subscription = null
    this.#pushManager = null
  }

  async init() {
    if (!this.#isPushSupported()) {
      this.#state = PUSH_UI_STATE.UNSUPPORTED
      return
    }

    this.#pushManager = navigator.pushManager || null

    if (!this.#pushManager) {
      this.#state = PUSH_UI_STATE.UNSUPPORTED
      return
    }

    try {
      const existing = await this.#pushManager.getSubscription()
      if (existing) {
        this.#subscription = existing
        this.#state = PUSH_UI_STATE.ACTIVE
      } else if (Notification.permission === 'denied') {
        this.#state = PUSH_UI_STATE.DENIED
      } else {
        this.#state = PUSH_UI_STATE.AVAILABLE
      }
    } catch (error) {
      console.error('[PushUI] Error checking subscription:', error)
      this.#state = PUSH_UI_STATE.AVAILABLE
    }
  }

  getState() {
    return this.#state
  }

  getButtonText() {
    switch (this.#state) {
      case PUSH_UI_STATE.AVAILABLE:
        return this.#options.buttonText.activate
      case PUSH_UI_STATE.ACTIVE:
        return this.#options.buttonText.deactivate
      case PUSH_UI_STATE.DENIED:
        return this.#options.buttonText.blocked
      case PUSH_UI_STATE.UNSUPPORTED:
        return this.#options.buttonText.unsupported
      case PUSH_UI_STATE.LOADING:
        return this.#options.buttonText.loading
      default:
        return ''
    }
  }

  isInteractable() {
    return this.#state === PUSH_UI_STATE.AVAILABLE || this.#state === PUSH_UI_STATE.ACTIVE
  }

  async subscribe() {
    if (this.#state !== PUSH_UI_STATE.AVAILABLE) {
      return { success: false, error: 'Cannot subscribe in current state' }
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        this.#state = PUSH_UI_STATE.DENIED
        return { success: false, error: 'Permission denied' }
      }

      if (!this.#vapidPublicKey && !this.#options.vapidPublicKey) {
        const sub = await this.#pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.#urlBase64ToUint8Array(this.#options.vapidPublicKey || '')
        })

        this.#subscription = sub
        await this.#registerSubscription(sub)
        this.#state = PUSH_UI_STATE.ACTIVE
        return { success: true }
      }

      const sub = await this.#pushManager.subscribe({
        userVisibleOnly: true
      })

      this.#subscription = sub
      await this.#registerSubscription(sub)
      this.#state = PUSH_UI_STATE.ACTIVE
      return { success: true }
    } catch (error) {
      console.error('[PushUI] Subscribe error:', error)
      return { success: false, error: error.message }
    }
  }

  async unsubscribe() {
    if (this.#state !== PUSH_UI_STATE.ACTIVE) {
      return { success: false, error: 'Not subscribed' }
    }

    try {
      if (this.#subscription) {
        await this.#subscription.unsubscribe()
        await this.#unregisterSubscription(this.#subscription.endpoint)
      }
      this.#subscription = null
      this.#state = PUSH_UI_STATE.AVAILABLE
      return { success: true }
    } catch (error) {
      console.error('[PushUI] Unsubscribe error:', error)
      return { success: false, error: error.message }
    }
  }

  async #registerSubscription(subscription) {
    const endpoint = subscription.endpoint
    const keys = {
      p256dh: this.#arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: this.#arrayBufferToBase64(subscription.getKey('auth'))
    }

    try {
      const response = await fetch(`${this.#options.apiBase}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint, keys })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('[PushUI] Registration error:', error)
      throw error
    }
  }

  async #unregisterSubscription(endpoint) {
    try {
      const response = await fetch(`${this.#options.apiBase}/subscriptions/current`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint })
      })

      if (!response.ok) {
        console.warn('[PushUI] Unregister warning:', response.status)
      }
    } catch (error) {
      console.warn('[PushUI] Unregister error:', error)
    }
  }

  #isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  #arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  #urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

export function createPushNotificationUI(options = {}) {
  return new PushNotificationUI(options)
}

export default {
  PushNotificationUI,
  createPushNotificationUI,
  PUSH_UI_STATE
}
