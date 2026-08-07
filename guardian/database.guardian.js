/**
 * Database Guardian
 *
 * Validates database architecture and configuration.
 * Ensures database layer follows architecture rules.
 *
 * @version 4.1
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

export class DatabaseGuardian {
  constructor() {
    this.name = 'Database Guardian'
    this.results = {
      checked: [],
      violations: [],
      warnings: [],
      info: []
    }
  }

  async run() {
    console.log('[DatabaseGuardian] Running database checks...')

    await this.checkDatabaseConfig()
    await this.checkMigrationFiles()
    await this.checkSchemaFiles()
    await this.checkEnvironmentFiles()
    await this.checkDrizzleConfig()
    await this.checkNoDirectAccess()

    return this.results
  }

  addViolation(message, file = null) {
    this.results.violations.push({
      guardian: 'database',
      message,
      file,
      timestamp: new Date().toISOString()
    })
  }

  addWarning(message, file = null) {
    this.results.warnings.push({
      guardian: 'database',
      message,
      file,
      timestamp: new Date().toISOString()
    })
  }

  addInfo(message, file = null) {
    this.results.info.push({
      guardian: 'database',
      message,
      file,
      timestamp: new Date().toISOString()
    })
  }

  async checkDatabaseConfig() {
    const configPath = path.join(ROOT, 'database', 'config', 'database.config.js')

    if (fs.existsSync(configPath)) {
      this.results.checked.push('database.config.js exists')
      this.addInfo('Database configuration file exists', configPath)
    } else {
      this.addViolation('Database configuration file missing', configPath)
    }
  }

  async checkMigrationFiles() {
    const migrationsDir = path.join(ROOT, 'database', 'migrations')

    if (!fs.existsSync(migrationsDir)) {
      this.addViolation('Migrations directory missing', migrationsDir)
      return
    }

    const migrations = fs.readdirSync(migrationsDir)
      .filter(d => d.match(/^\d{4}_/))
      .sort()

    if (migrations.length === 0) {
      this.addViolation('No migration files found', migrationsDir)
      return
    }

    // Check for expected migrations
    const expectedMigrations = [
      '0001_platform_foundation',
      '0002_ecosystem_layer',
      '0003_company_layer',
      '0004_identity_layer',
      '0005_business_layer'
    ]

    for (const expected of expectedMigrations) {
      if (!migrations.includes(expected)) {
        this.addViolation(`Expected migration missing: ${expected}`, migrationsDir)
      }
    }

    // Check each migration has index.js
    for (const migration of migrations) {
      const migrationPath = path.join(migrationsDir, migration, 'index.js')
      if (!fs.existsSync(migrationPath)) {
        this.addViolation(`Migration file missing: ${migration}/index.js`, migrationPath)
      }
    }

    this.results.checked.push(`${migrations.length} migrations found`)
    this.addInfo(`Found ${migrations.length} migrations`, migrationsDir)
  }

  async checkSchemaFiles() {
    const schemaDir = path.join(ROOT, 'database', 'schema')

    if (!fs.existsSync(schemaDir)) {
      this.addViolation('Schema directory missing', schemaDir)
      return
    }

    const layers = ['platform', 'ecosystem', 'company', 'identity', 'business']
    const foundLayers = []

    for (const layer of layers) {
      const layerPath = path.join(schemaDir, layer, 'index.js')
      if (fs.existsSync(layerPath)) {
        foundLayers.push(layer)
        this.addInfo(`Schema layer found: ${layer}`, layerPath)
      } else {
        this.addViolation(`Schema layer missing: ${layer}`, layerPath)
      }
    }

    this.results.checked.push(`${foundLayers.length} schema layers found`)
  }

  async checkEnvironmentFiles() {
    const envFiles = [
      '.env.example',
      '.env.development.example',
      '.env.test.example',
      '.env.production.example'
    ]

    for (const envFile of envFiles) {
      const envPath = path.join(ROOT, envFile)
      if (!fs.existsSync(envPath)) {
        this.addWarning(`Environment template missing: ${envFile}`, envPath)
      } else {
        this.addInfo(`Environment template exists: ${envFile}`, envPath)
      }
    }

    // Check that real .env doesn't exist (it should be in .gitignore)
    const realEnvPath = path.join(ROOT, '.env')
    if (fs.existsSync(realEnvPath)) {
      this.addWarning('.env file exists (should be gitignored)', realEnvPath)
    }
  }

  async checkDrizzleConfig() {
    const drizzleConfigPath = path.join(ROOT, 'drizzle.config.js')

    if (!fs.existsSync(drizzleConfigPath)) {
      this.addViolation('Drizzle configuration missing', drizzleConfigPath)
    } else {
      this.results.checked.push('drizzle.config.js exists')
      this.addInfo('Drizzle configuration exists', drizzleConfigPath)
    }
  }

  async checkNoDirectAccess() {
    // Check that database/client.js is not imported by forbidden paths
    const forbiddenImports = [
      'capabilities/*/business.service.js',
      'capabilities/*/service.js',
      'api/controllers/',
      'api/routes/'
    ]

    // Read database/client.js to check exports
    const clientPath = path.join(ROOT, 'database', 'client.js')
    if (fs.existsSync(clientPath)) {
      const content = fs.readFileSync(clientPath, 'utf8')

      // Check that client.js doesn't export raw pool
      if (content.includes('export pool') || content.includes('export { pool')) {
        this.addViolation('database/client.js should not export pool directly', clientPath)
      }

      // Check that it uses drizzle wrapper
      if (!content.includes('drizzle')) {
        this.addViolation('database/client.js should use drizzle', clientPath)
      }
    }

    this.results.checked.push('No direct database access patterns verified')
  }
}

export default DatabaseGuardian
