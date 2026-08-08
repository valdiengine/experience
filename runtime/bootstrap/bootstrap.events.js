export const BOOTSTRAP_EVENTS = {
  BOOT_STARTED: 'runtime:boot_started',
  CONFIGURATION_LOADED: 'runtime:configuration_loaded',
  RUNTIME_BUILT: 'runtime:runtime_built',
  PROVIDERS_REGISTERED: 'runtime:providers_registered',
  REPOSITORIES_INITIALIZED: 'runtime:repositories_initialized',
  CAPABILITIES_INITIALIZED: 'runtime:capabilities_initialized',
  CMS_INITIALIZED: 'runtime:cms_initialized',
  AUTH_INITIALIZED: 'runtime:authentication_initialized',
  EXPERIENCE_INITIALIZED: 'runtime:experience_initialized',
  RUNTIME_INITIALIZED: 'runtime:runtime_initialized',
  HEALTH_CHECK_COMPLETED: 'runtime:health_check_completed',
  APPLICATION_READY: 'runtime:application_ready',
  BOOT_STEP_STARTED: 'runtime:boot_step_started',
  BOOT_STEP_COMPLETED: 'runtime:boot_step_completed',
  BOOT_STEP_FAILED: 'runtime:boot_step_failed',
  BOOT_FAILED: 'runtime:boot_failed',
  SHUTDOWN_STARTED: 'runtime:shutdown_started',
  SHUTDOWN_COMPLETED: 'runtime:shutdown_completed',
}

export function createBootstrapEvent(event, payload = {}) {
  return {
    event,
    timestamp: Date.now(),
    source: 'bootstrap-pipeline',
    payload,
  }
}

export default BOOTSTRAP_EVENTS
