/**
 * App — Backward compatibility re-export
 * Actual implementation: engine/core/bootstrap.js
 *
 * Pipeline: Loader → Theme → TenantManager → CapabilityLoader → DataManager → Router → UI → Loader.hide
 */
import { Bootstrap } from '../engine/core/bootstrap.js'

document.addEventListener('DOMContentLoaded', async () => {
  await Bootstrap.init()
})
