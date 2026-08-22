/**
 * Web Application Start
 *
 * Entry point for the public web delivery layer.
 */

import { PublicWebServer } from './web.server.js'
import { createEventBus } from '../shared/events/eventbus.js'
import { loadEnv } from '../database/config/environment.loader.js'

const DEFAULT_PORT = process.env.WEB_PORT || 3001
const DEFAULT_HOST = process.env.WEB_HOST || '0.0.0.0'
const DEFAULT_ENV = process.env.NODE_ENV || 'development'

export async function startWeb(options = {}) {
  loadEnv({ env: options.env || DEFAULT_ENV })

  const eventBus = options.eventBus || createEventBus()
  const port = options.port || DEFAULT_PORT
  const host = options.host || DEFAULT_HOST
  const env = options.env || DEFAULT_ENV

  const server = new PublicWebServer({
    port,
    host,
    env,
    staticRoot: options.staticRoot,
    publicRoot: options.publicRoot
  })

  await server.initialize()
  await server.start()

  console.log(`Public Web Server started on ${host}:${port}`)
  console.log(`Environment: ${env}`)

  return {
    server,
    eventBus,
    shutdown: async () => {
      await server.shutdown()
      if (eventBus && typeof eventBus.clear === 'function') {
        eventBus.clear()
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWeb().catch((error) => {
    console.error('Failed to start web server:', error)
    process.exit(1)
  })
}

export default { startWeb }
