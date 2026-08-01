export const CMS_RUNTIME_EVENTS = {
  RUNTIME_CMS_REGISTERED: 'cms:runtime_registered',
  RUNTIME_CMS_INITIALIZED: 'cms:runtime_initialized',
  RUNTIME_CMS_PROVIDER_CHANGED: 'cms:runtime_provider_changed',
  RUNTIME_CMS_HEALTH_CHANGED: 'cms:runtime_health_changed',
  RUNTIME_CMS_ERROR: 'cms:runtime_error',
  RUNTIME_CMS_SHUTDOWN: 'cms:runtime_shutdown',
}

export function createCmsRuntimeEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'cms-runtime-integration',
    payload,
  }
}

export default CMS_RUNTIME_EVENTS
