/**
 * Seed Runner
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Executes all seeds in dependency order with idempotency checks.
 */

import { SEED_REGISTRY, validateSeedOrder } from './registry/seed.registry.js'
import { bootstrapDatabase } from './bootstrap/database.bootstrap.js'
import { eq, and, or } from 'drizzle-orm'

export class SeedRunner {
  constructor(db) {
    this.db = db
    this.results = {
      executed: [],
      skipped: [],
      errors: [],
      startTime: null,
      endTime: null,
    }
  }

  async run(options = {}) {
    const { specificSeeds = null, force = false, verbose = false } = options

    this.results.startTime = new Date()

    const validation = validateSeedOrder()
    if (!validation.valid) {
      throw new Error(`Seed order validation failed: ${validation.errors.join(', ')}`)
    }

    const seedsToRun = specificSeeds
      ? SEED_REGISTRY.order.filter((s) => specificSeeds.includes(s.name))
      : SEED_REGISTRY.order

    console.log('╔════════════════════════════════════════════════╗')
    console.log('║         PLATFORM SEED RUNNER v4.1               ║')
    console.log('╚════════════════════════════════════════════════╝')
    console.log('')
    console.log(`Seeds to run: ${seedsToRun.length}`)
    console.log(`Force mode: ${force}`)
    console.log('')

    for (const seed of seedsToRun) {
      await this.executeSeed(seed, { force, verbose })
    }

    this.results.endTime = new Date()

    this.printSummary()

    return this.results
  }

  async executeSeed(seed, options = {}) {
    const { force, verbose } = options

    console.log(`[${seed.layer.toUpperCase()}] ${seed.name}...`)

    try {
      const module = await import(seed.file)
      const seedData = module.default

      if (!seedData || !Array.isArray(seedData)) {
        throw new Error(`Invalid seed data format for ${seed.name}`)
      }

      if (verbose) {
        console.log(`  → ${seedData.length} records to process`)
      }

      let processed = 0
      let skipped = 0

      for (const record of seedData) {
        const result = await this.processRecord(seed, record, { force })
        if (result.processed) {
          processed++
        } else {
          skipped++
        }
      }

      this.results.executed.push({
        seed: seed.name,
        processed,
        skipped,
        layer: seed.layer,
      })

      console.log(`  ✓ ${processed} processed, ${skipped} skipped`)
    } catch (error) {
      this.results.errors.push({
        seed: seed.name,
        error: error.message,
      })
      console.log(`  ✗ ERROR: ${error.message}`)
    }
  }

  async processRecord(seed, record, options = {}) {
    const { force } = options

    try {
      if (seed.name === 'countries') {
        return await this.processCountry(record, { force })
      } else if (seed.name === 'regions') {
        return await this.processRegion(record, { force })
      } else if (seed.name === 'languages') {
        return await this.processLanguage(record, { force })
      } else if (seed.name === 'tenants') {
        return await this.processTenant(record, { force })
      } else if (seed.name === 'destinations') {
        return await this.processDestination(record, { force })
      } else if (seed.name === 'ecosystems') {
        return await this.processEcosystem(record, { force })
      } else if (seed.name === 'categories') {
        return await this.processCategory(record, { force })
      } else if (seed.name === 'modules') {
        return await this.processModule(record, { force })
      } else if (seed.name === 'experiences') {
        return await this.processExperience(record, { force })
      } else if (seed.name === 'themes') {
        return await this.processTheme(record, { force })
      } else if (seed.name === 'companies') {
        return await this.processCompany(record, { force })
      } else if (seed.name === 'companySettings') {
        return await this.processCompanySettings(record, { force })
      }

      return { processed: false, reason: 'Unknown seed type' }
    } catch (error) {
      throw error
    }
  }

  async processCountry(record, options = {}) {
    const { force } = options
    const { countries } = this.db

    const existing = await this.db
      .select()
      .from(countries)
      .where(eq(countries.code, record.code))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(countries)
          .set({
            name: record.name,
            nativeName: record.nativeName,
            flagEmoji: record.flagEmoji,
            currency: record.currency,
            currencySymbol: record.currencySymbol,
            phoneCode: record.phoneCode,
            timezone: record.timezone,
            locale: record.locale,
            dateFormat: record.dateFormat,
            timeFormat: record.timeFormat,
            metadata: record.metadata,
            updatedAt: new Date(),
          })
          .where(eq(countries.code, record.code))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(countries).values(record)
    return { processed: true, action: 'inserted' }
  }

  async processRegion(record, options = {}) {
    const { force } = options
    const { regions, countries } = this.db

    const country = await this.db
      .select()
      .from(countries)
      .where(eq(countries.code, record.countryCode))
      .limit(1)

    if (country.length === 0) {
      throw new Error(`Country ${record.countryCode} not found`)
    }

    const existing = await this.db
      .select()
      .from(regions)
      .where(and(eq(regions.countryId, country[0].id), eq(regions.code, record.code)))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(regions)
          .set({
            name: record.name,
            nativeName: record.nativeName,
            type: record.type,
            coordinates: record.coordinates,
            metadata: record.metadata,
            updatedAt: new Date(),
          })
          .where(eq(regions.id, existing[0].id))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(regions).values({
      countryId: country[0].id,
      code: record.code,
      name: record.name,
      nativeName: record.nativeName,
      type: record.type,
      coordinates: record.coordinates,
      metadata: record.metadata,
    })
    return { processed: true, action: 'inserted' }
  }

  async processLanguage(record, options = {}) {
    const { force } = options
    const { languages } = this.db

    const existing = await this.db
      .select()
      .from(languages)
      .where(eq(languages.code, record.code))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(languages)
          .set({
            name: record.name,
            nativeName: record.nativeName,
            rtl: record.rtl,
            isDefault: record.isDefault,
            metadata: record.metadata,
            updatedAt: new Date(),
          })
          .where(eq(languages.code, record.code))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(languages).values(record)
    return { processed: true, action: 'inserted' }
  }

  async processTenant(record, options = {}) {
    const { force } = options
    const { tenants } = this.db

    const existing = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(tenants)
          .set({
            name: record.name,
            type: record.type,
            status: record.status,
            domain: record.domain,
            config: record.config,
            plan: record.plan,
            isActive: record.isActive,
            updatedAt: new Date(),
          })
          .where(eq(tenants.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(tenants).values(record)
    return { processed: true, action: 'inserted' }
  }

  async processDestination(record, options = {}) {
    const { force } = options
    const { destinations, regions } = this.db

    const region = await this.db
      .select()
      .from(regions)
      .where(eq(regions.code, record.regionCode))
      .limit(1)

    if (region.length === 0) {
      throw new Error(`Region ${record.regionCode} not found`)
    }

    const existing = await this.db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(destinations)
          .set({
            name: record.name,
            type: record.type,
            description: record.description,
            coordinates: record.coordinates,
            branding: record.branding,
            seo: record.seo,
            maps: record.maps,
            enabledCategories: record.enabledCategories,
            enabledModules: record.enabledModules,
            status: record.status,
            updatedAt: new Date(),
          })
          .where(eq(destinations.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(destinations).values({
      regionId: region[0].id,
      code: record.code,
      name: record.name,
      slug: record.slug,
      type: record.type,
      description: record.description,
      coordinates: record.coordinates,
      branding: record.branding,
      seo: record.seo,
      maps: record.maps,
      enabledCategories: record.enabledCategories,
      enabledModules: record.enabledModules,
      sortOrder: record.sortOrder,
      status: record.status,
    })
    return { processed: true, action: 'inserted' }
  }

  async processEcosystem(record, options = {}) {
    const { force } = options
    const { ecosystems, destinations } = this.db

    const destination = await this.db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, record.destinationSlug))
      .limit(1)

    if (destination.length === 0) {
      throw new Error(`Destination ${record.destinationSlug} not found`)
    }

    const existing = await this.db
      .select()
      .from(ecosystems)
      .where(eq(ecosystems.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(ecosystems)
          .set({
            name: record.name,
            type: record.type,
            description: record.description,
            configuration: record.configuration,
            features: record.features,
            updatedAt: new Date(),
          })
          .where(eq(ecosystems.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(ecosystems).values({
      destinationId: destination[0].id,
      name: record.name,
      slug: record.slug,
      type: record.type,
      description: record.description,
      configuration: record.configuration,
      features: record.features,
    })
    return { processed: true, action: 'inserted' }
  }

  async processCategory(record, options = {}) {
    const { force } = options
    const { categories, ecosystems } = this.db

    const ecosystem = await this.db
      .select()
      .from(ecosystems)
      .limit(1)

    if (ecosystem.length === 0) {
      throw new Error('No ecosystem found')
    }

    const existing = await this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(categories)
          .set({
            name: record.name,
            type: record.type,
            icon: record.icon,
            description: record.description,
            sortOrder: record.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(categories.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(categories).values({
      ecosystemId: ecosystem[0].id,
      name: record.name,
      slug: record.slug,
      type: record.type,
      icon: record.icon,
      description: record.description,
      sortOrder: record.sortOrder,
    })
    return { processed: true, action: 'inserted' }
  }

  async processModule(record, options = {}) {
    const { force } = options
    const { modules, ecosystems } = this.db

    const ecosystem = await this.db
      .select()
      .from(ecosystems)
      .limit(1)

    if (ecosystem.length === 0) {
      throw new Error('No ecosystem found')
    }

    const existing = await this.db
      .select()
      .from(modules)
      .where(and(eq(modules.ecosystemId, ecosystem[0].id), eq(modules.code, record.code)))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(modules)
          .set({
            name: record.name,
            description: record.description,
            icon: record.icon,
            configuration: record.configuration,
            capabilities: record.capabilities,
            permissions: record.permissions,
            isBuiltIn: record.isBuiltIn,
            updatedAt: new Date(),
          })
          .where(eq(modules.id, existing[0].id))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(modules).values({
      ecosystemId: ecosystem[0].id,
      code: record.code,
      name: record.name,
      slug: record.slug,
      type: record.type,
      description: record.description,
      version: record.version,
      icon: record.icon,
      configuration: record.configuration,
      capabilities: record.capabilities,
      permissions: record.permissions,
      dependencies: record.dependencies,
      isBuiltIn: record.isBuiltIn,
    })
    return { processed: true, action: 'inserted' }
  }

  async processExperience(record, options = {}) {
    const { force } = options
    const { experiences, ecosystems, categories } = this.db

    const ecosystem = await this.db
      .select()
      .from(ecosystems)
      .limit(1)

    if (ecosystem.length === 0) {
      throw new Error('No ecosystem found')
    }

    let categoryId = null
    if (record.categorySlug) {
      const category = await this.db
        .select()
        .from(categories)
        .where(eq(categories.slug, record.categorySlug))
        .limit(1)
      if (category.length > 0) {
        categoryId = category[0].id
      }
    }

    const existing = await this.db
      .select()
      .from(experiences)
      .where(eq(experiences.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(experiences)
          .set({
            name: record.name,
            type: record.type,
            description: record.description,
            shortDescription: record.shortDescription,
            layouts: record.layouts,
            navigation: record.navigation,
            workflows: record.workflows,
            seo: record.seo,
            i18n: record.i18n,
            settings: record.settings,
            sortOrder: record.sortOrder,
            status: record.status,
            updatedAt: new Date(),
          })
          .where(eq(experiences.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(experiences).values({
      ecosystemId: ecosystem[0].id,
      categoryId,
      name: record.name,
      slug: record.slug,
      type: record.type,
      description: record.description,
      shortDescription: record.shortDescription,
      layouts: record.layouts,
      navigation: record.navigation,
      workflows: record.workflows,
      seo: record.seo,
      i18n: record.i18n,
      settings: record.settings,
      sortOrder: record.sortOrder,
      status: record.status,
    })
    return { processed: true, action: 'inserted' }
  }

  async processTheme(record, options = {}) {
    const { force } = options
    const { themes, destinations, tenants } = this.db

    let destinationId = null
    if (record.destinationSlug) {
      const destination = await this.db
        .select()
        .from(destinations)
        .where(eq(destinations.slug, record.destinationSlug))
        .limit(1)
      if (destination.length > 0) {
        destinationId = destination[0].id
      }
    }

    let tenantId = null
    if (record.tenantSlug) {
      const tenant = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, record.tenantSlug))
        .limit(1)
      if (tenant.length > 0) {
        tenantId = tenant[0].id
      }
    }

    const existing = await this.db
      .select()
      .from(themes)
      .where(eq(themes.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(themes)
          .set({
            name: record.name,
            type: record.type,
            colors: record.colors,
            typography: record.typography,
            isDefault: record.isDefault,
            updatedAt: new Date(),
          })
          .where(eq(themes.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(themes).values({
      destinationId,
      tenantId,
      name: record.name,
      slug: record.slug,
      type: record.type,
      colors: record.colors,
      typography: record.typography,
      isDefault: record.isDefault,
    })
    return { processed: true, action: 'inserted' }
  }

  async processCompany(record, options = {}) {
    const { force } = options
    const { companies, tenants, destinations } = this.db

    const tenant = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, record.tenantSlug))
      .limit(1)

    if (tenant.length === 0) {
      throw new Error(`Tenant ${record.tenantSlug} not found`)
    }

    let destinationId = null
    if (record.destinationSlug) {
      const destination = await this.db
        .select()
        .from(destinations)
        .where(eq(destinations.slug, record.destinationSlug))
        .limit(1)
      if (destination.length > 0) {
        destinationId = destination[0].id
      }
    }

    const existing = await this.db
      .select()
      .from(companies)
      .where(eq(companies.slug, record.slug))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(companies)
          .set({
            name: record.name,
            type: record.type,
            status: record.status,
            description: record.description,
            shortDescription: record.shortDescription,
            contact: record.contact,
            location: record.location,
            website: record.website,
            taxId: record.taxId,
            employeeCount: record.employeeCount,
            branding: record.branding,
            updatedAt: new Date(),
          })
          .where(eq(companies.slug, record.slug))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    const companyResult = await this.db
      .insert(companies)
      .values({
        tenantId: tenant[0].id,
        destinationId,
        name: record.name,
        slug: record.slug,
        type: record.type,
        status: record.status,
        description: record.description,
        shortDescription: record.shortDescription,
        contact: record.contact,
        location: record.location,
        website: record.website,
        taxId: record.taxId,
        employeeCount: record.employeeCount,
        branding: record.branding,
      })
      .returning()

    return { processed: true, action: 'inserted', id: companyResult[0]?.id }
  }

  async processCompanySettings(record, options = {}) {
    const { force } = options
    const { companySettings, companies } = this.db

    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.slug, record.companySlug))
      .limit(1)

    if (company.length === 0) {
      throw new Error(`Company ${record.companySlug} not found`)
    }

    const existing = await this.db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, company[0].id))
      .limit(1)

    if (existing.length > 0) {
      if (force) {
        await this.db
          .update(companySettings)
          .set({
            timezone: record.timezone,
            locale: record.locale,
            currency: record.currency,
            dateFormat: record.dateFormat,
            timeFormat: record.timeFormat,
            weekStartDay: record.weekStartDay,
            businessRules: record.businessRules,
            bookingRules: record.bookingRules,
            cancellationPolicy: record.cancellationPolicy,
            paymentSettings: record.paymentSettings,
            notificationSettings: record.notificationSettings,
            updatedAt: new Date(),
          })
          .where(eq(companySettings.companyId, company[0].id))
        return { processed: true, action: 'updated' }
      }
      return { processed: false, reason: 'already exists' }
    }

    await this.db.insert(companySettings).values({
      companyId: company[0].id,
      timezone: record.timezone,
      locale: record.locale,
      currency: record.currency,
      dateFormat: record.dateFormat,
      timeFormat: record.timeFormat,
      weekStartDay: record.weekStartDay,
      businessRules: record.businessRules,
      bookingRules: record.bookingRules,
      cancellationPolicy: record.cancellationPolicy,
      paymentSettings: record.paymentSettings,
      notificationSettings: record.notificationSettings,
    })
    return { processed: true, action: 'inserted' }
  }

  printSummary() {
    const duration = this.results.endTime - this.results.startTime

    console.log('')
    console.log('╔════════════════════════════════════════════════╗')
    console.log('║              SEED SUMMARY                     ║')
    console.log('╚════════════════════════════════════════════════╝')
    console.log('')
    console.log(`Duration: ${duration}ms`)
    console.log(`Seeds executed: ${this.results.executed.length}`)
    console.log(`Errors: ${this.results.errors.length}`)
    console.log('')

    if (this.results.errors.length > 0) {
      console.log('ERRORS:')
      for (const error of this.results.errors) {
        console.log(`  - ${error.seed}: ${error.error}`)
      }
      console.log('')
    }

    console.log('DETAILS:')
    for (const result of this.results.executed) {
      console.log(
        `  [${result.layer}] ${result.seed}: ${result.processed} processed, ${result.skipped} skipped`
      )
    }
  }
}

export async function runSeeds(options = {}) {
  const db = await bootstrapDatabase()
  const runner = new SeedRunner(db)
  return runner.run(options)
}

export default SeedRunner
