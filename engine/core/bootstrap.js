/**
 * Bootstrap — Initialization sequence for Valdi Engine
 *
 * Pipeline: Loader → Theme → TenantManager → Provider → DataManager → CapabilityLoader → Router → UI → Loader.hide
 */
import { Loader } from './loader.js'
import { ThemeManager } from './theme.js'
import { StudioEngine } from './engine.js'
import { Router } from './router.js'
import { DataManager } from './datamanager.js'
import { JSONProvider } from '../providers/json.provider.js'
import { eventBus } from './eventbus.js'
import { TenantManager } from '../../capabilities/tenant/manager.js'
import { CapabilityLoader } from '../../capabilities/core/loader.js'
import { createAllCapabilities } from '../../capabilities/core/register.js'
import { UIManager } from '../../src/ui.js'

export const Bootstrap = (() => {

  const init = async () => {

    // 1. Show loader
    Loader.show()

    // 2. Theme (instant — no await)
    ThemeManager.init()

    // 3. TenantManager (resolves current tenant)
    const tenantManager = new TenantManager(eventBus)
    const tenant = await tenantManager.init({
      tenants: [
        {
          id: 'dronestica',
          name: 'Dronestica',
          slug: 'dronestica',
          domain: 'dronestica.com',
          branding: {
            colors: {
              primary: '#c8a55c',
              secondary: '#1a1a2e',
            },
          },
          provider: { type: 'json', config: {} },
          capabilities: ['gallery', 'booking', 'notifications', 'pwa'],
        },
      ],
      defaultTenantId: 'dronestica',
    })

    // 4. Provider + DataManager (BEFORE capabilities — they need data access)
    const providerConfig = tenantManager.getProviderConfig()
    let provider

    if (providerConfig.type === 'json') {
      provider = new JSONProvider(window.DATA)
    } else {
      // Future: RESTProvider, CMSProvider, etc.
      provider = new JSONProvider(window.DATA)
    }

    const dataManager = new DataManager(provider, eventBus)
    await dataManager.load()

    // 5. CapabilityLoader (WITH complete context)
    const capabilityLoader = new CapabilityLoader(eventBus)
    await capabilityLoader.init({
      context: {
        tenant,
        dataManager,
        provider,
        eventBus,
      },
    })

    // 5b. Register available capabilities
    const capabilities = createAllCapabilities()
    for (const cap of capabilities) {
      capabilityLoader.register(cap)
    }

    // 5c. Load capabilities from tenant config
    const tenantCapabilities = tenant?.capabilities || []
    await capabilityLoader.loadCapabilities(tenantCapabilities)

    // 5d. Activate loaded capabilities
    for (const capId of tenantCapabilities) {
      await capabilityLoader.activate(capId)
    }

    // 6. StudioEngine (receives dataManager for backward compat)
    StudioEngine.init(dataManager)

    // 7. Router (reads hash, shows correct page)
    Router.init()

    // 8. UIManager (wires all components into the HTML shell)
    UIManager.init()

    // 9. Hide loader
    requestAnimationFrame(() => Loader.hide())

    console.log('[Bootstrap] Dronestica initialized', {
      tenant: tenant?.slug,
      capabilities: capabilityLoader.getActive().map(c => c.id),
      timestamp: new Date().toISOString(),
    })
  }

  return { init }
})()
