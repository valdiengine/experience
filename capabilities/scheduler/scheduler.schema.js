/**
 * Scheduler Schema — Business-agnostic job definitions
 */
import { createSchema } from '../core/schema.js'

export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export const JOB_TYPE = {
  DELAYED: 'delayed',
  RECURRING: 'recurring',
  ONE_TIME: 'one_time',
}

export const JOB_SCHEMA = createSchema({
  id: 'scheduler_job',
  name: 'Scheduler Job',
  description: 'A scheduled job',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: false },
    type: { type: 'string', required: true, values: Object.values(JOB_TYPE) },
    status: { type: 'string', required: true, values: Object.values(JOB_STATUS) },
    handler: { type: 'string', required: true },
    payload: { type: 'object', required: false },
    schedule: { type: 'object', required: false },
    delay: { type: 'number', required: false },
    runAt: { type: 'string', required: false },
    lastRun: { type: 'string', required: false },
    nextRun: { type: 'string', required: false },
    retries: { type: 'number', required: false },
    maxRetries: { type: 'number', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export function validateJob(data) {
  return JOB_SCHEMA.validate(data)
}
