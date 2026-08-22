/**
 * cPanel Node.js Selector / Passenger Entry Point
 *
 * Minimal adapter that delegates to the existing startWeb() function.
 * cPanel provides PORT, HOST, NODE_ENV via environment variables.
 * TURISTIC_ENV overrides the Turistic OS configuration environment.
 *
 * TURISTIC_ENV=staging   -> Turistic OS runs in staging mode
 * TURISTIC_ENV=production -> Turistic OS runs in production mode
 * (defaults to staging if not set)
 */

import { startWeb } from './start.web.js'

const PORT = parseInt(process.env.PORT) || 8080
const HOST = process.env.HOST || '0.0.0.0'
const ENV = process.env.TURISTIC_ENV || 'staging'

startWeb({
  port: PORT,
  host: HOST,
  env: ENV
}).catch((error) => {
  console.error('[Passenger] Failed to start:', error)
  process.exit(1)
})
