/**
 * PWA Middleware
 *
 * Handles PWA-specific routes:
 * - /pwa/:slug/manifest.json - Dynamic manifest generation
 * - /sw-:slug.js - Service worker proxy
 *
 * Framework-free implementation.
 *
 * Multi-application aware: uses req.domain when available for proper
 * domain+route isolation across valdi.app/albasie, valdi.app/corral, etc.
 */

import { createApplicationResolver } from '../application/application.resolver.js'
import { ConfigurationLoader } from '../../experience/loader/configuration.loader.js'

let _resolver = null
let _configLoader = null

async function getResolver() {
  if (!_resolver) {
    _configLoader = new ConfigurationLoader()
    await _configLoader.initialize()
    _resolver = createApplicationResolver({ configurationLoader: _configLoader })
  }
  return _resolver
}

const DEFAULT_ICONS = [
  { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
  { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
  { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
  { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
  { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
  { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
  { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
  { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
]

const SW_TEMPLATE = `
/**
 * Service Worker for VALDI PWA
 * Application-scoped cache isolation
 * Scope: {scope}
 */
var APPLICATION_CACHE_PREFIX = 'app-cache-{appIdNorm}-';
var CACHE_NAME = APPLICATION_CACHE_PREFIX + 'v1';
var OFFLINE_URL = '{offlineFallback}';
var APP_SCOPE = '{scope}';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        APP_SCOPE,
        APP_SCOPE + 'index.html',
        OFFLINE_URL
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name.startsWith(APPLICATION_CACHE_PREFIX) && name !== CACHE_NAME;
          })
          .map(function(name) {
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(OFFLINE_URL).then(function(response) {
          return response || caches.match(APP_SCOPE + 'index.html') || caches.match(APP_SCOPE);
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  console.log('[SW] Event data:', event.data ? 'present' : 'null');

  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  var data;
  try {
    data = event.data.json();
    console.log('[SW] Payload parsed:', JSON.stringify(data));
  } catch (err) {
    console.error('[SW] Payload parse error:', err.message);
    console.log('[SW] Raw data:', event.data.text());
    return;
  }

  var title = data.title || 'Notificación';
  var tag = data.tag || ('push-' + (data.notificationId || Date.now()));
  var options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: tag,
    renotify: data.tag ? false : true,
    data: {
      url: data.url || data.click_action || '/',
      notificationId: data.notificationId
    },
    vibrate: [100, 50, 100],
    requireInteraction: false
  };

  console.log('[SW] Calling showNotification with title:', title);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(function() {
        console.log('[SW] showNotification() succeeded');
      })
      .catch(function(err) {
        console.error('[SW] showNotification() failed:', err.message);
      })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event.notification.tag);
});
`

export function createPWAMiddleware(options = {}) {
  const maxAge = options.maxAge || 86400

  return async function pwaMiddleware(req, res, next) {
    const pathname = req.pathname || req.url

    if (pathname.match(/^\/pwa\/([^/]+)\/manifest\.json$/)) {
      return handleManifest(req, res, maxAge)
    }

    if (pathname.match(/^\/sw-([^/]+)\.js$/)) {
      return handleServiceWorker(req, res, pathname, maxAge)
    }

    return next()
  }
}

async function handleManifest(req, res, maxAge) {
  const pathname = req.pathname || req.url
  const match = pathname.match(/^\/pwa\/([^/]+)\/manifest\.json$/)

  if (!match) {
    res.statusCode = 400
    res.end('Bad Request')
    return
  }

  const slug = match[1]
  const domain = req.domain || 'valdi.app'

  try {
    const appIdDecoded = slug.replace(/__SLASH__/g, '/').replace(/__DOT__/g, '.')
    if (!appIdDecoded.startsWith(domain)) {
      throw new Error('Application ID does not match domain')
    }

    const route = '/' + appIdDecoded.slice(domain.length).replace(/^\/|\/$/g, '') + '/'

    const resolver = await getResolver()
    const result = resolver.resolve({ domain, path: route })

    if (!result.success) {
      throw new Error(result.error || 'Application resolution failed')
    }

    const resolved = result.resolved
    const company = resolved.configuration?.company || {}
    const identity = resolved.identity || {}

    // Load installableApp config directly from company config
    // The composition code stores company capabilities without the { configuration: ... } wrapper
    // so we access them directly from the company config's capabilities
    const companyCapabilities = resolved.configuration?.capabilities || {}
    const capConfig = companyCapabilities.installableApp || {}

    const tenant = {
      slug: company.slug || slug.replace(/__DOT__/g, '.').replace(/__SLASH__/g, '/'),
      domain: identity.domain || domain,
      name: company.name || 'Valdi App',
      description: company.description || '',
      pwa: {
        name: capConfig.name || company.name || 'Valdi App',
        shortName: capConfig.shortName || company.shortName || 'Valdi',
        description: capConfig.description || company.description || '',
        startUrl: capConfig.startUrl || route,
        display: capConfig.display || 'standalone',
        themeColor: capConfig.themeColor || company.branding?.colors?.primary || '#c8956c',
        backgroundColor: capConfig.backgroundColor || company.branding?.colors?.background || '#0a0a0a',
        icons: capConfig.icons || DEFAULT_ICONS,
        scope: capConfig.scope || route,
        offlineFallback: capConfig.offlineFallback || `${route}offline.html`,
        lang: capConfig.lang || 'es',
        categories: capConfig.categories || ['business']
      }
    }

    const manifest = generateManifest(tenant, tenant.pwa)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/manifest+json')
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
    res.end(JSON.stringify(manifest, null, 2))
  } catch (error) {
    console.warn(`[PWA Middleware] Manifest generation failed for ${slug}: ${error.message}`)

    const manifest = {
      name: 'Valdi App',
      short_name: 'Valdi',
      description: 'Experience application',
      start_url: `/${slug}/`,
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#c8956c',
      icons: DEFAULT_ICONS,
      scope: `/${slug}/`,
      lang: 'es',
      categories: ['business'],
      id: `/tenant/${domain}/${slug}`
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/manifest+json')
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
    res.end(JSON.stringify(manifest, null, 2))
  }
}

async function handleServiceWorker(req, res, pathname, maxAge) {
  const match = pathname.match(/^\/sw-([^/]+)\.js$/)

  if (!match) {
    res.statusCode = 400
    res.end('Bad Request')
    return
  }

  const slug = match[1]
  const domain = req.domain || 'valdi.app'
  const scope = `/${slug}/`
  const appId = `${domain}/${slug}`
  const appIdNorm = appId.replace(/[^a-zA-Z0-9]/g, '_')

  const swCode = SW_TEMPLATE
    .replace(/\{appId\}/g, appId)
    .replace(/\{appIdNorm\}/g, appIdNorm)
    .replace(/\{slug\}/g, slug)
    .replace(/\{scope\}/g, scope)
    .replace(/\{offlineFallback\}/g, `/${slug}/offline.html`)

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
  res.end(swCode)
}

export function generateManifest(tenant, config = {}) {
  const slug = tenant?.slug || 'default'
  const domain = tenant?.domain || 'valdi.app'
  const pwaConfig = tenant?.pwa || config || {}

  const scope = pwaConfig.scope || (tenant?.domain?.includes(slug) ? '/' : `/${slug}/`)

  return {
    name: pwaConfig.name || tenant?.name || 'Valdi App',
    short_name: pwaConfig.shortName || tenant?.shortName || 'Valdi',
    description: pwaConfig.description || tenant?.description || '',
    start_url: pwaConfig.startUrl || `/${slug}/`,
    display: pwaConfig.display || 'standalone',
    theme_color: pwaConfig.themeColor || tenant?.branding?.colors?.primary || '#c8956c',
    background_color: pwaConfig.backgroundColor || tenant?.branding?.colors?.background || '#0a0a0a',
    icons: pwaConfig.icons || DEFAULT_ICONS,
    scope: scope,
    lang: pwaConfig.lang || tenant?.lang || 'es',
    categories: pwaConfig.categories || tenant?.categories || ['business'],
    id: pwaConfig.id || `/tenant/${domain}/${slug}`
  }
}

export function generateServiceWorker(slug, domain, options = {}) {
  const scope = options.scope || `/${slug}/`
  const appId = `${domain}/${slug}`
  const appIdNorm = appId.replace(/[^a-zA-Z0-9]/g, '_')
  const offlineFallback = options.offlineFallback || `/${slug}/offline.html`

  return SW_TEMPLATE
    .replace(/\{appId\}/g, appId)
    .replace(/\{appIdNorm\}/g, appIdNorm)
    .replace(/\{slug\}/g, slug)
    .replace(/\{scope\}/g, scope)
    .replace(/\{offlineFallback\}/g, offlineFallback)
}

export function createAppScopedKey(baseKey, appId) {
  return `pwa-${baseKey}-${appId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export default {
  createPWAMiddleware,
  generateManifest,
  generateServiceWorker,
  createAppScopedKey
}
