/**
 * Ecosystem Simulation Middleware
 *
 * DEVELOPMENT ONLY mechanism to simulate all five ecosystems locally
 * WITHOUT modifying the Windows hosts file.
 *
 * IMPORTANT: This is strictly for development/testing.
 * Canonical URLs, PWA identity, and all production-facing
 * attributes MUST use real canonical domains.
 *
 * ECOSYSTEM-1: Allows testing of:
 * - valdi.app simulation at http://127.0.0.1:3001/__ecosystem/valdi/
 * - natales.app simulation at http://127.0.0.1:3001/__ecosystem/natales/
 * - puntaarenas.app simulation at http://127.0.0.1:3001/__ecosystem/puntaarenas/
 * - coyhaique.app simulation at http://127.0.0.1:3001/__ecosystem/coyhaique/
 * - chiloe.app simulation at http://127.0.0.1:3001/__ecosystem/chiloe/
 */

import {
  ECOSYSTEMS,
  getEcosystemById,
  isValidEcosystemId
} from '../ecosystem/ecosystem.registry.js'

const ECOSYSTEM_PATH_PREFIX = '/__ecosystem/'

export function createEcosystemSimulationMiddleware(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'development'

  return async function ecosystemSimulationMiddleware(req, res, next) {
    if (env !== 'development') {
      return next()
    }

    const pathname = req.pathname

    if (!pathname || !pathname.startsWith(ECOSYSTEM_PATH_PREFIX)) {
      return next()
    }

    const remainder = pathname.slice(ECOSYSTEM_PATH_PREFIX.length)
    const slashIndex = remainder.indexOf('/')
    const ecosystemId = slashIndex === -1 ? remainder : remainder.slice(0, slashIndex)
    const remainingPath = slashIndex === -1 ? '/' : remainder.slice(slashIndex)

    if (!isValidEcosystemId(ecosystemId)) {
      return next()
    }

    const ecosystem = getEcosystemById(ecosystemId)
    if (!ecosystem) {
      return next()
    }

    req.ecosystemSimulation = {
      enabled: true,
      ecosystemId: ecosystem.id,
      originalPathname: pathname,
      simulatedDomain: ecosystem.domain,
      simulatedDestination: ecosystem.destination,
      simulatedRegion: ecosystem.region,
      simulatedCountry: ecosystem.country,
      simulatedPath: remainingPath
    }

    req.domain = ecosystem.domain
    req.destination = ecosystem.destination
    req.region = ecosystem.region
    req.country = ecosystem.country
    req.canonicalDomain = ecosystem.domain
    req.pathname = remainingPath
    req.isEcosystemSimulation = true

    next()
  }
}

export function isEcosystemSimulationPath(pathname) {
  return pathname?.startsWith(ECOSYSTEM_PATH_PREFIX) || false
}

export function parseEcosystemSimulationPath(pathname) {
  if (!isEcosystemSimulationPath(pathname)) {
    return null
  }

  const remainder = pathname.slice(ECOSYSTEM_PATH_PREFIX.length)
  const slashIndex = remainder.indexOf('/')
  const ecosystemId = slashIndex === -1 ? remainder : remainder.slice(0, slashIndex)
  const remainingPath = slashIndex === -1 ? '/' : remainder.slice(slashIndex)

  if (!isValidEcosystemId(ecosystemId)) {
    return null
  }

  const ecosystem = getEcosystemById(ecosystemId)
  if (!ecosystem) {
    return null
  }

  return {
    ecosystemId: ecosystem.id,
    domain: ecosystem.domain,
    destination: ecosystem.destination,
    region: ecosystem.region,
    country: ecosystem.country,
    simulatedPath: remainingPath
  }
}

export function getEcosystemSimulationUrls() {
  return [
    { ecosystem: 'valdi', url: 'http://127.0.0.1:3001/__ecosystem/valdi/' },
    { ecosystem: 'natales', url: 'http://127.0.0.1:3001/__ecosystem/natales/' },
    { ecosystem: 'puntaarenas', url: 'http://127.0.0.1:3001/__ecosystem/puntaarenas/' },
    { ecosystem: 'coyhaique', url: 'http://127.0.0.1:3001/__ecosystem/coyhaique/' },
    { ecosystem: 'chiloe', url: 'http://127.0.0.1:3001/__ecosystem/chiloe/' }
  ]
}

export default {
  createEcosystemSimulationMiddleware,
  isEcosystemSimulationPath,
  parseEcosystemSimulationPath,
  getEcosystemSimulationUrls
}
