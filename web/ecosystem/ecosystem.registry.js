/**
 * Ecosystem Registry
 *
 * Central registry for the five Turistic OS ecosystems.
 * Provides canonical identity, domain mapping, and destination info.
 *
 * ECOSYSTEM-1: Proves ONE engine serves MULTIPLE ecosystems with strict isolation.
 * ECOSYSTEM-2: Extends with Zone Applications under Valdi ecosystem.
 */

export const ECOSYSTEMS = {
  valdi: {
    id: 'valdi',
    ecosystemId: 'cl-los-rios-valdivia',
    domain: 'valdi.app',
    destination: 'valdi',
    region: 'los-rios',
    country: 'cl',
    name: 'Valdivia',
    displayName: 'Valdi',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    zones: ['corral', 'costa']
  },
  natales: {
    id: 'natales',
    ecosystemId: 'cl-magallanes-puerto-natales',
    domain: 'natales.app',
    destination: 'natales',
    region: 'magallanes',
    country: 'cl',
    name: 'Puerto Natales',
    displayName: 'Natales',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    zones: []
  },
  puntaarenas: {
    id: 'puntaarenas',
    ecosystemId: 'cl-magallanes-punta-arenas',
    domain: 'puntaarenas.app',
    destination: 'puntaarenas',
    region: 'magallanes',
    country: 'cl',
    name: 'Punta Arenas',
    displayName: 'Punta Arenas',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    zones: []
  },
  coyhaique: {
    id: 'coyhaique',
    ecosystemId: 'cl-aysen-coyhaique',
    domain: 'coyhaique.app',
    destination: 'coyhaique',
    region: 'aysen',
    country: 'cl',
    name: 'Coyhaique',
    displayName: 'Coyhaique',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    zones: []
  },
  chiloe: {
    id: 'chiloe',
    ecosystemId: 'cl-los-lagos-chiloe',
    domain: 'chiloe.app',
    destination: 'chiloe',
    region: 'los-lagos',
    country: 'cl',
    name: 'Chiloé',
    displayName: 'Chiloé',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    zones: []
  }
}

export const ZONES = {
  'valdi.app/corral': {
    id: 'corral',
    ecosystemId: 'valdi',
    domain: 'valdi.app',
    route: '/corral',
    applicationId: 'valdi.app/corral',
    destination: 'valdi',
    region: 'los-rios',
    country: 'cl',
    name: 'Corral',
    displayName: 'Corral',
    type: 'zone',
    experienceType: 'tourism-destination',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    description: 'Zona turística de Corral, Valdivia',
    capabilities: ['hero', 'attractions', 'activities', 'gallery', 'map', 'businesses']
  },
  'valdi.app/costa': {
    id: 'costa',
    ecosystemId: 'valdi',
    domain: 'valdi.app',
    route: '/costa',
    applicationId: 'valdi.app/costa',
    destination: 'valdi',
    region: 'los-rios',
    country: 'cl',
    name: 'Costa',
    displayName: 'Costa',
    type: 'zone',
    experienceType: 'tourism-destination',
    timezone: 'America/Santiago',
    locale: 'es-CL',
    enabled: true,
    description: 'Zona turística Costa de Valdivia',
    capabilities: ['hero', 'attractions', 'activities', 'gallery', 'map', 'businesses']
  }
}

export const ECOSYSTEM_IDS = Object.keys(ECOSYSTEMS)

export const ECOSYSTEM_DOMAINS = ECOSYSTEM_IDS.map(id => ECOSYSTEMS[id].domain)

export function getEcosystemByDomain(domain) {
  const normalized = domain?.toLowerCase().replace(/^www\./, '')
  return Object.values(ECOSYSTEMS).find(e => e.domain === normalized) || null
}

export function getEcosystemById(id) {
  return ECOSYSTEMS[id?.toLowerCase()] || null
}

export function isValidEcosystemId(id) {
  return ECOSYSTEM_IDS.includes(id?.toLowerCase())
}

export function isValidEcosystemDomain(domain) {
  const normalized = domain?.toLowerCase().replace(/^www\./, '')
  return ECOSYSTEM_DOMAINS.includes(normalized)
}

export function getEcosystemForDestination(destination) {
  return Object.values(ECOSYSTEMS).find(e => e.destination === destination) || null
}

export function getZoneByApplicationId(applicationId) {
  return ZONES[applicationId] || null
}

export function getZoneByDomainAndRoute(domain, route) {
  const appId = `${domain}${route}`
  return ZONES[appId] || null
}

export function getZonesForEcosystem(ecosystemId) {
  return Object.values(ZONES).filter(z => z.ecosystemId === ecosystemId)
}

export function isZoneApplication(applicationId) {
  return applicationId in ZONES
}

export function createEcosystemRegistry() {
  return {
    ecosystems: { ...ECOSYSTEMS },
    zones: { ...ZONES },
    getEcosystemByDomain,
    getEcosystemById,
    isValidEcosystemId,
    isValidEcosystemDomain,
    getEcosystemForDestination,
    getZoneByApplicationId,
    getZoneByDomainAndRoute,
    getZonesForEcosystem,
    isZoneApplication,
    getAllEcosystemIds: () => [...ECOSYSTEM_IDS],
    getAllDomains: () => [...ECOSYSTEM_DOMAINS],
    getAllZoneIds: () => Object.keys(ZONES)
  }
}

export default {
  ECOSYSTEMS,
  ZONES,
  ECOSYSTEM_IDS,
  ECOSYSTEM_DOMAINS,
  getEcosystemByDomain,
  getEcosystemById,
  isValidEcosystemId,
  isValidEcosystemDomain,
  getEcosystemForDestination,
  getZoneByApplicationId,
  getZoneByDomainAndRoute,
  getZonesForEcosystem,
  isZoneApplication,
  createEcosystemRegistry
}
