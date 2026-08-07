/**
 * Storage Integration Tests
 *
 * P12.3.2.2 — Storage Integration & Testing
 *
 * Comprehensive integration tests for all storage operations and providers.
 * Tests validate the complete storage pipeline.
 */

import { describe, it, before, after, expect } from 'bun:test'
import { StorageService } from '../storage.service.js'
import { LocalStorageProvider } from '../providers/local.provider.js'
import { S3StorageProvider } from '../providers/s3.provider.js'
import { R2StorageProvider } from '../providers/r2.provider.js'
import StorageProviderFactory from '../providers/storage.provider.factory.js'
import { StorageIntegration } from '../integration/index.js'
import {
  StorageError,
  StorageValidationError,
  StorageNotFoundError,
  StorageProviderError,
} from '../storage.errors.js'
import { STORAGE_PROVIDER_TYPES } from '../providers/storage.provider.interface.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TEST_BUFFER = Buffer.from('Test file content for integration testing')
const TEST_FILENAME = 'test-file.txt'
const TEST_MIMETYPE = 'text/plain'
const TEST_FOLDER = 'test-folder'
const TEST_METADATA = { testKey: 'testValue', version: '1.0' }

function generateTestBuffer(size = 1024) {
  return crypto.randomBytes(size)
}

function createTestAssetData(buffer = TEST_BUFFER, fileName = TEST_FILENAME) {
  return {
    buffer,
    fileName,
    mimeType: TEST_MIMETYPE,
    metadata: TEST_METADATA,
  }
}

describe('Storage Integration Tests', () => {
  let storageService
  let tempDir

  before(async () => {
    tempDir = path.join(process.cwd(), 'temp-storage-test-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })

    storageService = new StorageService({
      local: {
        rootPath: tempDir,
        baseUrl: 'http://localhost:3000/storage',
        enabled: true,
      },
    })

    await storageService.initialize()
  })

  after(async () => {
    await storageService.shutdown()

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Provider Initialization', () => {
    it('should initialize local provider', async () => {
      const provider = storageService.getProvider(STORAGE_PROVIDER_TYPES.LOCAL)
      expect(provider).toBeDefined()
      expect(provider.type).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
    })

    it('should report healthy status for initialized provider', async () => {
      const health = await storageService.healthCheck()
      expect(health.healthy).toBe(true)
      expect(health.provider).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
    })

    it('should throw when getting non-existent provider', () => {
      expect(() => storageService.getProvider('nonexistent')).toThrow()
    })
  })

  describe('Upload Operations', () => {
    it('should upload a file successfully', async () => {
      const assetData = createTestAssetData()

      const result = await storageService.uploadAsset(assetData)

      expect(result.assetId).toBeDefined()
      expect(result.provider).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
      expect(result.size).toBe(assetData.buffer.length)
      expect(result.mimeType).toBe(TEST_MIMETYPE)
    })

    it('should upload with path prefix', async () => {
      const assetData = createTestAssetData()
      assetData.path = 'uploads/2024/01/'

      const result = await storageService.uploadAsset(assetData)

      expect(result.path).toContain('uploads/2024/01/')
    })

    it('should reject upload without buffer or path', async () => {
      const assetData = { fileName: TEST_FILENAME }

      expect(() => storageService.validateAssetData(assetData)).toThrow(StorageValidationError)
    })

    it('should reject upload without filename', async () => {
      const assetData = { buffer: TEST_BUFFER }

      expect(() => storageService.validateAssetData(assetData)).toThrow(StorageValidationError)
    })

    it('should store and return checksum', async () => {
      const assetData = createTestAssetData()

      const result = await storageService.uploadAsset(assetData)

      expect(result.etag).toBeDefined()
    })
  })

  describe('Download Operations', () => {
    it('should download uploaded file', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const downloadResult = await storageService.downloadAsset(uploadResult.assetId)

      expect(downloadResult.buffer).toEqual(assetData.buffer)
      expect(downloadResult.contentType).toBe(TEST_MIMETYPE)
    })

    it('should throw StorageNotFoundError for non-existent asset', async () => {
      await expect(storageService.downloadAsset('nonexistent-id')).rejects.toThrow(StorageNotFoundError)
    })

    it('should require assetId', async () => {
      await expect(storageService.downloadAsset(null)).rejects.toThrow(StorageValidationError)
    })
  })

  describe('Delete Operations', () => {
    it('should delete uploaded file', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const deleteResult = await storageService.deleteAsset(uploadResult.assetId)

      expect(deleteResult.deleted).toBe(true)
    })

    it('should require assetId for deletion', async () => {
      await expect(storageService.deleteAsset(null)).rejects.toThrow(StorageValidationError)
    })
  })

  describe('Exists Check', () => {
    it('should return true for existing asset', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const exists = await storageService.assetExists(uploadResult.assetId)

      expect(exists).toBe(true)
    })

    it('should return false for non-existing asset', async () => {
      const exists = await storageService.assetExists('nonexistent-id')
      expect(exists).toBe(false)
    })
  })

  describe('Stream Operations', () => {
    it('should stream uploaded file', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const streamResult = await storageService.streamAsset(uploadResult.assetId)

      expect(streamResult.stream).toBeDefined()
      expect(streamResult.contentType).toBe(TEST_MIMETYPE)
    })
  })

  describe('Move Operations', () => {
    it('should move file to new path', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const moveResult = await storageService.moveAsset(
        uploadResult.assetId,
        'moved-folder/new-file.txt'
      )

      expect(moveResult.path).toContain('moved-folder')
    })
  })

  describe('Copy Operations', () => {
    it('should copy file to new path', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const copyResult = await storageService.copyAsset(
        uploadResult.assetId,
        'copied-folder/copy.txt'
      )

      expect(copyResult.path).toContain('copied-folder')
    })
  })

  describe('List Operations', () => {
    it('should list files with prefix', async () => {
      const assetData = createTestAssetData()
      assetData.path = 'list-test/'
      await storageService.uploadAsset(assetData)

      const listResult = await storageService.listAssets('list-test/')

      expect(Array.isArray(listResult)).toBe(true)
    })
  })

  describe('Folder Operations', () => {
    it('should create folder', async () => {
      const folderResult = await storageService.createFolder(TEST_FOLDER)

      expect(folderResult.created).toBe(true)
      expect(folderResult.path).toBeDefined()
    })

    it('should delete folder', async () => {
      await storageService.createFolder(TEST_FOLDER + '-delete')

      const deleteResult = await storageService.deleteFolder(TEST_FOLDER + '-delete')

      expect(deleteResult.deleted).toBe(true)
    })
  })

  describe('URL Generation', () => {
    it('should generate public URL', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const url = await storageService.getAssetUrl(uploadResult.assetId)

      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('should generate signed URL', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const signedUrl = await storageService.getAssetUrl(uploadResult.assetId, { signed: true })

      expect(typeof signedUrl).toBe('string')
    })
  })

  describe('Metadata Operations', () => {
    it('should get asset metadata', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const metadata = await storageService.getAssetMetadata(uploadResult.assetId)

      expect(metadata.size).toBeDefined()
      expect(metadata.mimeType).toBe(TEST_MIMETYPE)
    })

    it('should set asset metadata', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const setResult = await storageService.setAssetMetadata(uploadResult.assetId, {
        customField: 'customValue',
      })

      expect(setResult.updated).toBe(true)
    })
  })

  describe('Checksum Operations', () => {
    it('should get asset checksum', async () => {
      const assetData = createTestAssetData()
      const uploadResult = await storageService.uploadAsset(assetData)

      const checksum = await storageService.getAssetChecksum(uploadResult.assetId)

      expect(checksum).toBeDefined()
    })
  })
})

describe('StorageProviderFactory Tests', () => {
  it('should create LOCAL provider', async () => {
    const provider = await StorageProviderFactory.create(STORAGE_PROVIDER_TYPES.LOCAL, {
      rootPath: '/tmp/test',
      baseUrl: 'http://localhost:3000',
    })

    expect(provider).toBeInstanceOf(LocalStorageProvider)
  })

  it('should throw for unknown provider type', async () => {
    await expect(
      StorageProviderFactory.create('unknown', {})
    ).rejects.toThrow()
  })

  it('should cache providers', async () => {
    const provider1 = await StorageProviderFactory.create(STORAGE_PROVIDER_TYPES.LOCAL, {
      rootPath: '/tmp/test',
      baseUrl: 'http://localhost:3000',
    })

    const provider2 = await StorageProviderFactory.create(STORAGE_PROVIDER_TYPES.LOCAL, {
      rootPath: '/tmp/test',
      baseUrl: 'http://localhost:3000',
    })

    expect(provider1).toBe(provider2)
  })

  it('should clear cache', () => {
    StorageProviderFactory.clearCache()
  })
})

describe('StorageIntegration Tests', () => {
  let integration
  let tempDir

  before(async () => {
    tempDir = path.join(process.cwd(), 'temp-integration-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })

    integration = new StorageIntegration({
      storage: {
        local: {
          rootPath: tempDir,
          baseUrl: 'http://localhost:3000/storage',
          enabled: true,
        },
      },
    })

    await integration.initialize()
  })

  after(async () => {
    await integration.shutdown()

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should initialize integration', () => {
    expect(integration.initialized).toBe(true)
    expect(integration.getActiveProvider()).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
  })

  it('should perform full health check', async () => {
    const health = await integration.fullHealthCheck()

    expect(health.overall).toBe('healthy')
    expect(health.providers).toBeDefined()
    expect(health.activeProvider).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
  })

  it('should get integration info', () => {
    const info = StorageIntegration.getIntegrationInfo()

    expect(info.architecture).toBeDefined()
    expect(info.providers).toContain(STORAGE_PROVIDER_TYPES.LOCAL)
    expect(info.layers).toBe(6)
  })

  it('should upload through integration', async () => {
    const result = await integration.getStorageService().uploadAsset({
      buffer: TEST_BUFFER,
      fileName: 'integration-test.txt',
      mimeType: TEST_MIMETYPE,
    })

    expect(result.assetId).toBeDefined()
  })
})

describe('Provider Switching Tests', () => {
  let integration
  let tempDir

  before(async () => {
    tempDir = path.join(process.cwd(), 'temp-switch-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })

    integration = new StorageIntegration({
      storage: {
        local: {
          rootPath: tempDir,
          baseUrl: 'http://localhost:3000/storage',
          enabled: true,
        },
      },
    })

    await integration.initialize()
  })

  after(async () => {
    await integration.shutdown()

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should have LOCAL as default provider', () => {
    expect(integration.getActiveProvider()).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
  })

  it('should maintain provider when only one exists', () => {
    expect(integration.getActiveProvider()).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
  })

  it('should switch between available providers', async () => {
    const switchResult = await integration.switchProvider(STORAGE_PROVIDER_TYPES.LOCAL)
    expect(switchResult.currentProvider).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
    expect(switchResult.previousProvider).toBe(STORAGE_PROVIDER_TYPES.LOCAL)
  })
})

describe('Tenant Isolation Tests', () => {
  let storageService
  let tempDir

  before(async () => {
    tempDir = path.join(process.cwd(), 'temp-tenant-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })

    storageService = new StorageService({
      local: {
        rootPath: tempDir,
        baseUrl: 'http://localhost:3000/storage',
        enabled: true,
        tenantIsolation: true,
      },
    })

    await storageService.initialize()
  })

  after(async () => {
    await storageService.shutdown()

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should upload with tenant context', async () => {
    const result = await storageService.uploadAsset(
      {
        buffer: TEST_BUFFER,
        fileName: 'tenant-test.txt',
        mimeType: TEST_MIMETYPE,
      },
      { tenantId: 'tenant-123' }
    )

    expect(result.assetId).toBeDefined()
  })

  it('should isolate tenants by path', async () => {
    const result1 = await storageService.uploadAsset(
      {
        buffer: TEST_BUFFER,
        fileName: 'file1.txt',
        mimeType: TEST_MIMETYPE,
      },
      { tenantId: 'tenant-1' }
    )

    const result2 = await storageService.uploadAsset(
      {
        buffer: TEST_BUFFER,
        fileName: 'file2.txt',
        mimeType: TEST_MIMETYPE,
      },
      { tenantId: 'tenant-2' }
    )

    expect(result1.path).not.toBe(result2.path)
  })
})

describe('Performance Benchmarks', () => {
  let storageService
  let tempDir

  before(async () => {
    tempDir = path.join(process.cwd(), 'temp-perf-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })

    storageService = new StorageService({
      local: {
        rootPath: tempDir,
        baseUrl: 'http://localhost:3000/storage',
        enabled: true,
      },
    })

    await storageService.initialize()
  })

  after(async () => {
    await storageService.shutdown()

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should benchmark upload latency', async () => {
    const iterations = 10
    const latencies = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await storageService.uploadAsset({
        buffer: generateTestBuffer(1024 * 100),
        fileName: `perf-${i}.txt`,
        mimeType: TEST_MIMETYPE,
      })
      const end = performance.now()
      latencies.push(end - start)
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)

    console.log(`Upload Latency: avg=${avgLatency.toFixed(2)}ms min=${minLatency.toFixed(2)}ms max=${maxLatency.toFixed(2)}ms`)

    expect(avgLatency).toBeLessThan(1000)
  })

  it('should benchmark download latency', async () => {
    const uploadResult = await storageService.uploadAsset({
      buffer: generateTestBuffer(1024 * 100),
      fileName: 'download-perf.txt',
      mimeType: TEST_MIMETYPE,
    })

    const iterations = 10
    const latencies = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await storageService.downloadAsset(uploadResult.assetId)
      const end = performance.now()
      latencies.push(end - start)
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

    console.log(`Download Latency: avg=${avgLatency.toFixed(2)}ms`)

    expect(avgLatency).toBeLessThan(500)
  })

  it('should benchmark provider initialization', async () => {
    const start = performance.now()
    const tempDir2 = path.join(process.cwd(), 'temp-init-' + Date.now())
    fs.mkdirSync(tempDir2, { recursive: true })

    const service = new StorageService({
      local: {
        rootPath: tempDir2,
        baseUrl: 'http://localhost:3000/storage',
        enabled: true,
      },
    })

    await service.initialize()
    const end = performance.now()

    fs.rmSync(tempDir2, { recursive: true, force: true })

    const initLatency = end - start
    console.log(`Provider Init: ${initLatency.toFixed(2)}ms`)

    expect(initLatency).toBeLessThan(500)
  })
})
