/**
 * PWA Engine Events — Event definitions for PWA lifecycle
 */
export const PWA_ENGINE_EVENTS = {
  // Manifest
  MANIFEST_GENERATED: 'pwa-engine:manifest_generated',
  MANIFEST_INJECTED: 'pwa-engine:manifest_injected',

  // Service Worker
  SW_REGISTERED: 'pwa-engine:sw_registered',
  SW_ACTIVATED: 'pwa-engine:sw_activated',
  SW_UPDATE_AVAILABLE: 'pwa-engine:sw_update_available',
  SW_UPDATED: 'pwa-engine:sw_updated',
  SW_ERROR: 'pwa-engine:sw_error',

  // Cache
  CACHE_UPDATED: 'pwa-engine:cache_updated',
  CACHE_CLEARED: 'pwa-engine:cache_cleared',

  // Installation
  INSTALL_AVAILABLE: 'pwa-engine:install_available',
  INSTALL_TRIGGERED: 'pwa-engine:install_triggered',
  INSTALLED: 'pwa-engine:installed',
  INSTALL_DISMISSED: 'pwa-engine:install_dismissed',
  INSTALL_FAILED: 'pwa-engine:install_failed',

  // Offline
  OFFLINE_DETECTED: 'pwa-engine:offline_detected',
  OFFLINE_RESTORED: 'pwa-engine:offline_restored',
  OFFLINE_PAGE_SHOWN: 'pwa-engine:offline_page_shown',

  // Push
  PUSH_PERMISSION_GRANTED: 'pwa-engine:push_permission_granted',
  PUSH_PERMISSION_DENIED: 'pwa-engine:push_permission_denied',
  PUSH_RECEIVED: 'pwa-engine:push_received',
  PUSH_CLICKED: 'pwa-engine:push_clicked',

  // Analytics
  PWA_OPENED: 'pwa-engine:pwa_opened',
  PWA_NOTIFICATION_CLICKED: 'pwa-engine:pwa_notification_clicked',
}
