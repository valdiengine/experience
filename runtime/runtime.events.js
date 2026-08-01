export const RUNTIME_EVENTS = {
  RUNTIME_REGISTERED: 'runtime:registered',
  RUNTIME_INITIALIZED: 'runtime:initialized',
  RUNTIME_PROVIDER_CHANGED: 'runtime:provider_changed',
  RUNTIME_PROVIDER_FAILED: 'runtime:provider_failed',
  RUNTIME_HEALTH_CHANGED: 'runtime:health_changed',
  RUNTIME_SHUTDOWN: 'runtime:shutdown',
  RUNTIME_ERROR: 'runtime:error',

  // Bootstrap events
  BOOT_STARTED: 'runtime:boot_started',
  CONFIGURATION_LOADED: 'runtime:configuration_loaded',
  PROVIDERS_REGISTERED: 'runtime:providers_registered',
  REPOSITORIES_INITIALIZED: 'runtime:repositories_initialized',
  CAPABILITIES_INITIALIZED: 'runtime:capabilities_initialized',
  CMS_INITIALIZED: 'runtime:cms_initialized',
  AUTH_INITIALIZED: 'runtime:authentication_initialized',
  RUNTIME_BUILT: 'runtime:runtime_built',
  HEALTH_CHECK_COMPLETED: 'runtime:health_check_completed',
  APPLICATION_READY: 'runtime:application_ready',
  BOOT_STEP_STARTED: 'runtime:boot_step_started',
  BOOT_STEP_COMPLETED: 'runtime:boot_step_completed',
  BOOT_STEP_FAILED: 'runtime:boot_step_failed',
  BOOT_FAILED: 'runtime:boot_failed',
  SHUTDOWN_STARTED: 'runtime:shutdown_started',
  SHUTDOWN_COMPLETED: 'runtime:shutdown_completed',
}

export function createRuntimeEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'platform-runtime', payload }
}

export default RUNTIME_EVENTS
