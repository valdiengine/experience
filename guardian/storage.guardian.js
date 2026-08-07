/**
 * Storage Guardian
 *
 * P12.3.2.0 — Storage Architecture Definition
 * P12.3.2.1 — Storage Provider Interface Implementation
 * P12.3.2.2 — Storage Integration & Testing
 *
 * Validates storage architecture compliance.
 * Ensures no direct filesystem/cloud SDK usage outside storage layer.
 * Ensures provider-specific SDKs only used in correct providers.
 * Validates database synchronization, events, and multi-tenant isolation.
 *
 * Design Freeze P13.8: Platform Core, Runtime, API, BusinessService are frozen
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const REQUIRED_PROVIDER_METHODS = [
  'initialize',
  'health',
  'upload',
  'download',
  'stream',
  'delete',
  'exists',
  'move',
  'copy',
  'list',
  'createFolder',
  'deleteFolder',
  'generatePublicUrl',
  'generateSignedUrl',
  'getMetadata',
  'setMetadata',
  'getChecksum',
]

const REQUIRED_STORAGE_TABLES = [
  'assets',
  'asset_metadata',
  'asset_versions',
  'asset_permissions',
  'storage_providers',
  'storage_locations',
]

const REQUIRED_EVENTS = [
  'ASSET_UPLOADED',
  'ASSET_DELETED',
  'ASSET_ACCESSED',
  'ASSET_COPIED',
  'ASSET_MOVED',
  'ASSET_ERROR',
  'QUOTA_EXCEEDED',
  'PROVIDER_SWITCHED',
]

export class StorageGuardian {
  constructor() {
    this.name = 'Storage Guardian'
    this.results = {
      checked: [],
      violations: [],
      warnings: [],
      info: [],
    }
  }

  async run() {
    console.log('[StorageGuardian] Running storage architecture checks...')

    await this.checkStorageDirectoryExists()
    await this.checkNoDirectFilesystemUsage()
    await this.checkNoDirectCloudSDKUsage()
    await this.checkProviderInterfaceExists()
    await this.checkStorageServiceExists()
    await this.checkDatabaseSchemaExists()
    await this.checkConfigurationDriven()
    await this.checkGuardianIntegration()
    await this.checkFactoryPattern()
    await this.checkProviderIsolation()
    await this.checkAllProvidersImplementInterface()
    await this.checkProviderSpecificSDKUsage()
    await this.checkStorageEventsExist()
    await this.checkStorageCapabilityExists()
    await this.checkStorageManagerExists()
    await this.checkStorageAdapterExists()
    await this.checkIntegrationLayerExists()
    await this.checkDatabaseSchemaTables()
    await this.checkTenantIsolation()
    await this.checkNoDirectProviderImports()
    await this.checkTestsExist()
    await this.checkDocumentationExists()

    return this.results
  }

  addViolation(message, file = null) {
    this.results.violations.push({
      guardian: 'storage',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  addWarning(message, file = null) {
    this.results.warnings.push({
      guardian: 'storage',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  addInfo(message, file = null) {
    this.results.info.push({
      guardian: 'storage',
      message,
      file,
      timestamp: new Date().toISOString(),
    })
  }

  async checkStorageDirectoryExists() {
    const storagePath = path.join(ROOT, 'storage')

    if (fs.existsSync(storagePath)) {
      this.results.checked.push('storage/ directory exists')
      this.addInfo('Storage directory exists', storagePath)
    } else {
      this.addViolation('Storage directory missing', storagePath)
    }
  }

  async checkNoDirectFilesystemUsage() {
    const forbiddenDirs = [
      'capabilities/',
      'api/controllers/',
      'api/routes/',
      'business/',
      'runtime/',
    ]

    const fsPatterns = [
      "import fs from 'fs'",
      'require("fs")',
      "require(\'fs\')",
      'fs/promises',
      'fs.readFileSync',
      'fs.writeFileSync',
      'fs.mkdirSync',
      'fs.unlinkSync',
    ]

    for (const dir of forbiddenDirs) {
      const dirPath = path.join(ROOT, dir)
      if (!fs.existsSync(dirPath)) continue

      await this.scanDirectoryForPattern(dirPath, fsPatterns, 'direct filesystem usage')
    }

    this.results.checked.push('No direct filesystem usage outside storage layer')
  }

  async checkNoDirectCloudSDKUsage() {
    const forbiddenDirs = [
      'capabilities/',
      'api/controllers/',
      'api/routes/',
      'business/',
      'runtime/',
    ]

    const sdkPatterns = [
      '@aws-sdk/client-s3',
      '@aws-sdk/client-r2',
      '@azure/storage-blob',
      '@google-cloud/storage',
      'aws-sdk',
    ]

    for (const dir of forbiddenDirs) {
      const dirPath = path.join(ROOT, dir)
      if (!fs.existsSync(dirPath)) continue

      await this.scanDirectoryForPattern(dirPath, sdkPatterns, 'direct cloud SDK usage')
    }

    this.results.checked.push('No direct cloud SDK usage outside storage providers')
  }

  async scanDirectoryForPattern(dirPath, patterns, violationType) {
    const files = this.getAllFiles(dirPath)

    for (const file of files) {
      if (file.endsWith('.json')) continue

      try {
        const content = fs.readFileSync(file, 'utf8')

        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            const relativePath = path.relative(ROOT, file)
            this.addViolation(
              `Forbidden ${violationType}: "${pattern}" found`,
              relativePath
            )
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  getAllFiles(dirPath) {
    const files = []

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllFiles(fullPath))
        } else if (entry.isFile()) {
          files.push(fullPath)
        }
      }
    } catch {
      // Skip directories that can't be read
    }

    return files
  }

  async checkProviderInterfaceExists() {
    const interfacePath = path.join(ROOT, 'storage', 'providers', 'storage.provider.interface.js')

    if (fs.existsSync(interfacePath)) {
      this.results.checked.push('StorageProviderInterface exists')
      this.addInfo('Storage provider interface exists', interfacePath)
    } else {
      this.addViolation('Storage provider interface missing', interfacePath)
    }
  }

  async checkStorageServiceExists() {
    const servicePath = path.join(ROOT, 'storage', 'storage.service.js')

    if (fs.existsSync(servicePath)) {
      this.results.checked.push('StorageService exists')
      this.addInfo('Storage service exists', servicePath)
    } else {
      this.addViolation('Storage service missing', servicePath)
    }
  }

  async checkDatabaseSchemaExists() {
    const schemaPath = path.join(ROOT, 'database', 'schema', 'storage', 'index.js')

    if (fs.existsSync(schemaPath)) {
      this.results.checked.push('Storage database schema exists')
      this.addInfo('Storage database schema exists', schemaPath)
    } else {
      this.addViolation('Storage database schema missing', schemaPath)
    }
  }

  async checkConfigurationDriven() {
    const servicePath = path.join(ROOT, 'storage', 'storage.service.js')

    if (!fs.existsSync(servicePath)) {
      return
    }

    const content = fs.readFileSync(servicePath, 'utf8')

    if (content.includes('registerProvider') && content.includes('getProvider')) {
      this.results.checked.push('Storage is configuration-driven')
      this.addInfo('Storage uses provider configuration pattern')
    } else {
      this.addWarning('Storage may not be fully configuration-driven')
    }
  }

  async checkGuardianIntegration() {
    const guardianPath = path.join(ROOT, 'guardian', 'storage.guardian.js')

    if (fs.existsSync(guardianPath)) {
      this.results.checked.push('Storage guardian exists')
      this.addInfo('Storage guardian exists', guardianPath)
    } else {
      this.addWarning('Storage guardian not yet created (optional)', guardianPath)
    }
  }

  async checkFactoryPattern() {
    const factoryPath = path.join(ROOT, 'storage', 'providers', 'storage.provider.factory.js')
    const servicePath = path.join(ROOT, 'storage', 'storage.service.js')

    if (fs.existsSync(factoryPath) && fs.existsSync(servicePath)) {
      const factoryContent = fs.readFileSync(factoryPath, 'utf8')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')

      const usesFactory = serviceContent.includes('StorageProviderFactory') ||
                          serviceContent.includes('storage.provider.factory')

      if (usesFactory) {
        this.results.checked.push('Storage uses factory pattern')
        this.addInfo('StorageService uses StorageProviderFactory')
      } else {
        this.addWarning('StorageService may not use factory pattern')
      }
    }
  }

  async checkProviderIsolation() {
    const localProviderPath = path.join(ROOT, 'storage', 'providers', 'local.provider.js')
    const s3ProviderPath = path.join(ROOT, 'storage', 'providers', 's3.provider.js')
    const r2ProviderPath = path.join(ROOT, 'storage', 'providers', 'r2.provider.js')

    if (fs.existsSync(localProviderPath)) {
      const content = fs.readFileSync(localProviderPath, 'utf8')
      if (content.includes("import fs from 'fs'") || content.includes('require("fs")')) {
        this.results.checked.push('LocalProvider uses fs module (allowed)')
        this.addInfo('LocalProvider correctly uses fs for local storage', localProviderPath)
      }
    }

    if (fs.existsSync(s3ProviderPath)) {
      const content = fs.readFileSync(s3ProviderPath, 'utf8')
      if (content.includes('@aws-sdk')) {
        this.results.checked.push('S3Provider uses AWS SDK (allowed)')
        this.addInfo('S3Provider correctly uses AWS SDK', s3ProviderPath)
      }
    }

    if (fs.existsSync(r2ProviderPath)) {
      const content = fs.readFileSync(r2ProviderPath, 'utf8')
      if (content.includes('@aws-sdk')) {
        this.results.checked.push('R2Provider uses AWS SDK (allowed)')
        this.addInfo('R2Provider correctly uses AWS SDK', r2ProviderPath)
      }
    }
  }

  async checkAllProvidersImplementInterface() {
    const providersDir = path.join(ROOT, 'storage', 'providers')
    const providerFiles = ['local.provider.js', 's3.provider.js', 'r2.provider.js']

    for (const providerFile of providerFiles) {
      const providerPath = path.join(providersDir, providerFile)

      if (!fs.existsSync(providerPath)) {
        continue
      }

      const content = fs.readFileSync(providerPath, 'utf8')

      for (const method of REQUIRED_PROVIDER_METHODS) {
        const methodPattern = new RegExp(`(async\\s+)?${method}\\s*\\(`)
        if (!methodPattern.test(content)) {
          this.addViolation(
            `Provider ${providerFile} missing method: ${method}`,
            providerPath
          )
        }
      }

      this.results.checked.push(`${providerFile} implements all required methods`)
      this.addInfo(`${providerFile} implements StorageProviderInterface`, providerPath)
    }
  }

  async checkProviderSpecificSDKUsage() {
    const providersDir = path.join(ROOT, 'storage', 'providers')
    const allFiles = this.getAllFiles(providersDir)

    for (const file of allFiles) {
      if (file.endsWith('.json') || file === path.join(providersDir, 'storage.provider.interface.js')) {
        continue
      }

      const content = fs.readFileSync(file, 'utf8')
      const fileName = path.basename(file)

      if (fileName === 'local.provider.js') {
        if (content.includes('@aws-sdk') || content.includes('@google-cloud') || content.includes('@azure')) {
          this.addViolation(
            `LocalProvider should not use cloud SDKs`,
            file
          )
        }
      }

      if (fileName === 's3.provider.js') {
        if (!content.includes('@aws-sdk') && content.includes('S3Client')) {
          this.addWarning(
            `S3Provider may be missing AWS SDK import`,
            file
          )
        }
      }

      if (fileName === 'r2.provider.js') {
        if (!content.includes('@aws-sdk') && content.includes('S3Client')) {
          this.addWarning(
            `R2Provider may be missing AWS SDK import`,
            file
          )
        }
      }
    }

    this.results.checked.push('Provider SDK usage is isolated')
  }

  async checkStorageEventsExist() {
    const eventsPath = path.join(ROOT, 'capabilities', 'storage', 'storage.events.js')

    if (fs.existsSync(eventsPath)) {
      const content = fs.readFileSync(eventsPath, 'utf8')

      for (const event of REQUIRED_EVENTS) {
        if (!content.includes(event)) {
          this.addWarning(`Storage event missing: ${event}`, eventsPath)
        }
      }

      this.results.checked.push('Storage events defined')
      this.addInfo('Storage events exist', eventsPath)
    } else {
      this.addViolation('Storage events missing', eventsPath)
    }
  }

  async checkStorageCapabilityExists() {
    const capabilityPath = path.join(ROOT, 'capabilities', 'storage', 'storage.capability.js')

    if (fs.existsSync(capabilityPath)) {
      this.results.checked.push('Storage capability exists')
      this.addInfo('Storage capability exists', capabilityPath)
    } else {
      this.addViolation('Storage capability missing', capabilityPath)
    }
  }

  async checkStorageManagerExists() {
    const managerPath = path.join(ROOT, 'capabilities', 'storage', 'storage.manager.js')

    if (fs.existsSync(managerPath)) {
      this.results.checked.push('Storage manager exists')
      this.addInfo('Storage manager exists', managerPath)
    } else {
      this.addViolation('Storage manager missing', managerPath)
    }
  }

  async checkStorageAdapterExists() {
    const adapterPath = path.join(ROOT, 'capabilities', 'storage', 'storage.adapter.js')

    if (fs.existsSync(adapterPath)) {
      this.results.checked.push('Storage adapter exists')
      this.addInfo('Storage adapter exists', adapterPath)
    } else {
      this.addViolation('Storage adapter missing', adapterPath)
    }
  }

  async checkIntegrationLayerExists() {
    const integrationPath = path.join(ROOT, 'storage', 'integration', 'index.js')

    if (fs.existsSync(integrationPath)) {
      const content = fs.readFileSync(integrationPath, 'utf8')

      if (content.includes('StorageIntegration') && content.includes('switchProvider')) {
        this.results.checked.push('Storage integration layer exists with provider switching')
        this.addInfo('Storage integration layer exists', integrationPath)
      } else {
        this.addWarning('Storage integration may be incomplete', integrationPath)
      }
    } else {
      this.addWarning('Storage integration layer not yet created', integrationPath)
    }
  }

  async checkDatabaseSchemaTables() {
    const schemaPath = path.join(ROOT, 'database', 'schema', 'storage', 'index.js')

    if (!fs.existsSync(schemaPath)) {
      this.addViolation('Storage schema not found for table validation', schemaPath)
      return
    }

    const content = fs.readFileSync(schemaPath, 'utf8')

    for (const table of REQUIRED_STORAGE_TABLES) {
      const tablePattern = new RegExp(`['"]${table}['"]`)
      if (!tablePattern.test(content)) {
        this.addViolation(`Storage table missing: ${table}`, schemaPath)
      }
    }

    this.results.checked.push('All storage database tables exist')
    this.addInfo('Storage database schema has all required tables', schemaPath)
  }

  async checkTenantIsolation() {
    const managerPath = path.join(ROOT, 'capabilities', 'storage', 'storage.manager.js')

    if (!fs.existsSync(managerPath)) {
      return
    }

    const content = fs.readFileSync(managerPath, 'utf8')

    if (content.includes('tenantId') || content.includes('tenant')) {
      this.results.checked.push('Tenant isolation implemented')
      this.addInfo('Storage manager has tenant isolation', managerPath)
    } else {
      this.addWarning('Storage manager may not implement tenant isolation', managerPath)
    }
  }

  async checkNoDirectProviderImports() {
    const forbiddenImports = [
      { pattern: "from './providers/local.provider.js'", dir: 'storage/' },
      { pattern: "from './providers/s3.provider.js'", dir: 'storage/' },
      { pattern: "from './providers/r2.provider.js'", dir: 'storage/' },
    ]

    const storageServicePath = path.join(ROOT, 'storage', 'storage.service.js')

    if (!fs.existsSync(storageServicePath)) {
      return
    }

    const content = fs.readFileSync(storageServicePath, 'utf8')

    if (content.includes("from './providers/local.provider.js'") ||
        content.includes("from './providers/s3.provider.js'") ||
        content.includes("from './providers/r2.provider.js'")) {
      this.addViolation('StorageService directly imports provider implementations', storageServicePath)
    } else {
      this.results.checked.push('StorageService does not import providers directly')
    }

    if (content.includes('StorageProviderFactory') || content.includes('storage.provider.factory')) {
      this.results.checked.push('StorageService uses factory pattern')
    }
  }

  async checkTestsExist() {
    const testPath = path.join(ROOT, 'storage', 'tests', 'integration.test.js')

    if (fs.existsSync(testPath)) {
      this.results.checked.push('Storage integration tests exist')
      this.addInfo('Storage integration tests exist', testPath)
    } else {
      this.addWarning('Storage integration tests not found', testPath)
    }
  }

  async checkDocumentationExists() {
    const docs = [
      { path: 'docs/storage/STORAGE_PROVIDER_IMPLEMENTATION.md', name: 'Provider Implementation' },
      { path: 'docs/storage/STORAGE_CONTRACT.md', name: 'Storage Contract' },
      { path: 'docs/storage/STORAGE_FACTORY.md', name: 'Storage Factory' },
      { path: 'docs/storage/STORAGE_LOCAL.md', name: 'Local Provider' },
      { path: 'docs/storage/STORAGE_S3.md', name: 'S3 Provider' },
      { path: 'docs/storage/STORAGE_R2.md', name: 'R2 Provider' },
    ]

    let docsFound = 0

    for (const doc of docs) {
      const docPath = path.join(ROOT, doc.path)
      if (fs.existsSync(docPath)) {
        docsFound++
      } else {
        this.addWarning(`Storage documentation missing: ${doc.name}`, docPath)
      }
    }

    if (docsFound >= 4) {
      this.results.checked.push('Storage documentation exists')
      this.addInfo(`Storage documentation: ${docsFound}/${docs.length} files exist`)
    }
  }
}

export default StorageGuardian
