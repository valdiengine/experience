/**
 * Experience Engine Events
 * 
 * Lifecycle events for Experience Engine operations.
 */

export const EXPERIENCE_EVENTS = {
  EXPERIENCE_INITIALIZING: 'experience:initializing',
  EXPERIENCE_INITIALIZED: 'experience:initialized',
  
  EXPERIENCE_RESOLVING: 'experience:resolving',
  EXPERIENCE_RESOLVED: 'experience:resolved',
  
  EXPERIENCE_LOADING: 'experience:loading',
  EXPERIENCE_LOADED: 'experience:loaded',
  
  EXPERIENCE_COMPOSING: 'experience:composing',
  EXPERIENCE_COMPOSED: 'experience:composed',
  
  EXPERIENCE_READY: 'experience:ready',
  EXPERIENCE_FAILED: 'experience:failed',
  
  EXPERIENCE_STOPPING: 'experience:stopping',
  EXPERIENCE_STOPPED: 'experience:stopped',
  
  EXPERIENCE_CONTEXT_UPDATED: 'experience:context:updated',
  
  MODULE_RESOLVED: 'experience:module:resolved',
  MODULE_ACTIVATED: 'experience:module:activated',
  
  CAPABILITY_RESOLVED: 'experience:capability:resolved',
  CAPABILITY_COMPOSED: 'experience:capability:composed',
  
  ECOSYSTEM_LOADED: 'experience:ecosystem:loaded',
  ECOSYSTEM_LOAD_FAILED: 'experience:ecosystem:load:failed',
  
  PRODUCT_RESOLVED: 'experience:product:resolved',
  PRODUCT_RESOLUTION_FAILED: 'experience:product:resolution:failed',
  
  CONFIGURATION_LOADED: 'experience:configuration:loaded',
  CONFIGURATION_INHERITANCE_RESOLVED: 'experience:configuration:inheritance:resolved',
  
  EXPERIENCE_HEALTH_CHECK: 'experience:health:check',
  EXPERIENCE_HEALTH_RESULT: 'experience:health:result'
}

export function createExperienceEvent(event, data = {}) {
  return {
    event,
    timestamp: new Date().toISOString(),
    data
  }
}

export default {
  EXPERIENCE_EVENTS,
  createExperienceEvent
}
