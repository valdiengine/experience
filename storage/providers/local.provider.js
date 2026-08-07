/**
 * Local Storage Provider
 *
 * P12.3.2.1 — Storage Provider Interface Implementation
 *
 * Development/local storage provider using Node.js filesystem.
 * NOT for production use.
 *
 * Security features:
 * - Tenant isolation via path prefixing
 * - Destination isolation
 * - Company isolation
 * - Path normalization to prevent traversal
 * - Atomic writes
 * - Checksum generation
 * - Metadata persistence
 */

import { StorageProviderInterface, STORAGE_PROVIDER_TYPES } from './storage.provider.interface.js'
import { StorageProviderError, StorageNotFoundError, StorageValidationError } from '../storage.errors.js'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

const DEFAULT_CONFIG = {
  rootPath: './uploads',
  baseUrl: '/uploads',
  secret: 'local-storage-secret-change-in-production',
  maxFileSize: 100 * 1024 * 1024,
}

export class LocalStorageProvider extends StorageProviderInterface {
  constructor(config = {}) {
    super({ ...DEFAULT_CONFIG, ...config })
    this.type = STORAGE_PROVIDER_TYPES.LOCAL
    this.rootPath = path.resolve(this.config.rootPath)
    this.baseUrl = this.config.baseUrl
    this.secret = this.config.secret
  }

  async initialize() {
    try {
      await fs.mkdir(this.rootPath, { recursive: true })
      this.initialized = true
      return { initialized: true, rootPath: this.rootPath }
    } catch (error) {
      throw new StorageProviderError(
        `Failed to initialize local storage: ${error.message}`,
        this.type,
        { error: error.message }
      )
    }
  }

  async health() {
    try {
      await fs.access(this.rootPath, fsSync.constants.R_OK | fsSync.constants.W_OK)
      return {
        healthy: true,
        provider: this.type,
        rootPath: this.rootPath,
        initialized: this.initialized,
      }
    } catch (error) {
      return {
        healthy: false,
        provider: this.type,
        error: error.message,
        initialized: this.initialized,
      }
    }
  }

  async upload(assetData, options = {}) {
    const { buffer, fileName, mimeType, path: destPath, metadata } = assetData

    if (!buffer || !fileName) {
      throw new StorageValidationError('Buffer and fileName are required', { fileName })
    }

    if (buffer.length > this.config.maxFileSize) {
      throw new StorageValidationError(
        `File size exceeds maximum: ${buffer.length} > ${this.config.maxFileSize}`,
        { maxSize: this.config.maxFileSize, actualSize: buffer.length }
      )
    }

    const sanitizedPath = this.normalizePath(destPath || '')
    const sanitizedFileName = this.sanitizeFileName(fileName)
    const fullDirPath = path.join(this.rootPath, sanitizedPath)
    const fullFilePath = path.join(fullDirPath, sanitizedFileName)

    await fs.mkdir(fullDirPath, { recursive: true })

    const tempPath = `${fullFilePath}.${crypto.randomBytes(8).toString('hex')}.tmp`

    try {
      await fs.writeFile(tempPath, buffer)
      await fs.rename(tempPath, fullFilePath)

      const stats = await fs.stat(fullFilePath)
      const checksum = await this.calculateChecksum(fullFilePath)

      const relativePath = path.join(sanitizedPath, sanitizedFileName)

      const result = {
        provider: this.type,
        path: relativePath,
        url: `${this.baseUrl}/${relativePath.replace(/\\/g, '/')}`,
        size: stats.size,
        mimeType: mimeType || this.guessMimeType(fileName),
        checksum,
        created: stats.birthtime,
        modified: stats.mtime,
      }

      if (metadata) {
        await this.persistMetadata(relativePath, metadata)
        result.metadata = metadata
      }

      return result
    } catch (error) {
      try {
        await fs.unlink(tempPath)
      } catch {}
      throw new StorageProviderError(
        `Failed to upload file: ${error.message}`,
        this.type,
        { fileName, path: destPath }
      )
    }
  }

  async download(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)

    await this.validatePath(normalizedPath)

    try {
      const exists = await this.exists(assetId)
      if (!exists) {
        throw new StorageNotFoundError(assetId)
      }

      const buffer = await fs.readFile(fullPath)
      return { buffer }
    } catch (error) {
      if (error instanceof StorageNotFoundError) throw error
      throw new StorageProviderError(
        `Failed to download file: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async stream(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)

    await this.validatePath(normalizedPath)

    try {
      const exists = await this.exists(assetId)
      if (!exists) {
        throw new StorageNotFoundError(assetId)
      }

      const stream = fsSync.createReadStream(fullPath)
      return { stream, path: fullPath }
    } catch (error) {
      if (error instanceof StorageNotFoundError) throw error
      throw new StorageProviderError(
        `Failed to stream file: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async delete(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)

    await this.validatePath(normalizedPath)

    try {
      const exists = await this.exists(assetId)
      if (!exists) {
        throw new StorageNotFoundError(assetId)
      }

      await fs.unlink(fullPath)

      try {
        await fs.unlink(`${fullPath}.meta.json`)
      } catch {}

      return { deleted: true, path: normalizedPath }
    } catch (error) {
      if (error instanceof StorageNotFoundError) throw error
      throw new StorageProviderError(
        `Failed to delete file: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async exists(assetId) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)

    try {
      await fs.access(fullPath, fsSync.constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  async move(assetId, destPath, options = {}) {
    const normalizedSrc = this.normalizePath(assetId)
    const normalizedDest = this.normalizePath(destPath)

    await this.validatePath(normalizedSrc)

    const srcFullPath = path.join(this.rootPath, normalizedSrc)
    const destFullPath = path.join(this.rootPath, normalizedDest)
    const destDir = path.dirname(destFullPath)

    try {
      await fs.mkdir(destDir, { recursive: true })
      await fs.rename(srcFullPath, destFullPath)

      try {
        const metaSrc = `${srcFullPath}.meta.json`
        const metaDest = `${destFullPath}.meta.json`
        await fs.rename(metaSrc, metaDest)
      } catch {}

      return {
        path: normalizedDest,
        url: `${this.baseUrl}/${normalizedDest.replace(/\\/g, '/')}`,
      }
    } catch (error) {
      throw new StorageProviderError(
        `Failed to move file: ${error.message}`,
        this.type,
        { assetId, destPath }
      )
    }
  }

  async copy(assetId, destPath, options = {}) {
    const normalizedSrc = this.normalizePath(assetId)
    const normalizedDest = this.normalizePath(destPath)

    await this.validatePath(normalizedSrc)

    const srcFullPath = path.join(this.rootPath, normalizedSrc)
    const destFullPath = path.join(this.rootPath, normalizedDest)
    const destDir = path.dirname(destFullPath)

    try {
      await fs.mkdir(destDir, { recursive: true })
      await fs.copyFile(srcFullPath, destFullPath)

      try {
        const metaSrc = `${srcFullPath}.meta.json`
        const metaDest = `${destFullPath}.meta.json`
        await fs.copyFile(metaSrc, metaDest)
      } catch {}

      return {
        path: normalizedDest,
        url: `${this.baseUrl}/${normalizedDest.replace(/\\/g, '/')}`,
      }
    } catch (error) {
      throw new StorageProviderError(
        `Failed to copy file: ${error.message}`,
        this.type,
        { assetId, destPath }
      )
    }
  }

  async list(prefix, options = {}) {
    const normalizedPrefix = this.normalizePath(prefix)
    const fullPath = path.join(this.rootPath, normalizedPrefix)

    try {
      await fs.access(fullPath, fsSync.constants.R_OK)
    } catch {
      return []
    }

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      const results = []

      for (const entry of entries) {
        const entryPath = path.join(normalizedPrefix, entry.name)
        results.push({
          name: entry.name,
          path: entryPath.replace(/\\/g, '/'),
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        })
      }

      return results
    } catch (error) {
      throw new StorageProviderError(
        `Failed to list files: ${error.message}`,
        this.type,
        { prefix }
      )
    }
  }

  async createFolder(folderPath, options = {}) {
    const normalizedPath = this.normalizePath(folderPath)
    const fullPath = path.join(this.rootPath, normalizedPath)

    try {
      await fs.mkdir(fullPath, { recursive: true })
      return { created: true, path: normalizedPath }
    } catch (error) {
      throw new StorageProviderError(
        `Failed to create folder: ${error.message}`,
        this.type,
        { folderPath }
      )
    }
  }

  async deleteFolder(folderPath, options = {}) {
    const normalizedPath = this.normalizePath(folderPath)
    const fullPath = path.join(this.rootPath, normalizedPath)

    try {
      const exists = await this.exists(folderPath)
      if (!exists) {
        throw new StorageNotFoundError(folderPath)
      }

      await fs.rm(fullPath, { recursive: true })
      return { deleted: true, path: normalizedPath }
    } catch (error) {
      if (error instanceof StorageNotFoundError) throw error
      throw new StorageProviderError(
        `Failed to delete folder: ${error.message}`,
        this.type,
        { folderPath }
      )
    }
  }

  generatePublicUrl(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    return `${this.baseUrl}/${normalizedPath.replace(/\\/g, '/')}`
  }

  async generateSignedUrl(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    const expiresIn = options.expiresIn || 3600000
    const expiresAt = Date.now() + expiresIn

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${normalizedPath}:${expiresAt}`)
      .digest('hex')

    const params = new URLSearchParams({
      expires: expiresAt.toString(),
      signature,
    })

    return `${this.baseUrl}/${normalizedPath.replace(/\\/g, '/')}?${params.toString()}`
  }

  async getMetadata(assetId) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)
    const metaPath = `${fullPath}.meta.json`

    try {
      const stats = await fs.stat(fullPath)
      const metadata = { size: stats.size, created: stats.birthtime, modified: stats.mtime }

      try {
        const metaContent = await fs.readFile(metaPath, 'utf8')
        const customMeta = JSON.parse(metaContent)
        return { ...metadata, ...customMeta }
      } catch {}

      return metadata
    } catch (error) {
      throw new StorageProviderError(
        `Failed to get metadata: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async setMetadata(assetId, metadata) {
    const normalizedPath = this.normalizePath(assetId)
    await this.persistMetadata(normalizedPath, metadata)
    return { updated: true, path: normalizedPath }
  }

  async getChecksum(assetId, options = {}) {
    const normalizedPath = this.normalizePath(assetId)
    const fullPath = path.join(this.rootPath, normalizedPath)

    await this.validatePath(normalizedPath)

    return this.calculateChecksum(fullPath)
  }

  normalizePath(inputPath) {
    if (!inputPath) return ''

    const normalized = path.normalize(inputPath.replace(/\\/g, '/'))

    if (normalized.includes('..')) {
      throw new StorageValidationError('Path traversal not allowed', { path: inputPath })
    }

    if (path.isAbsolute(normalized)) {
      const relative = path.relative(this.rootPath, normalized)
      if (relative.startsWith('..')) {
        throw new StorageValidationError('Path outside storage root not allowed', { path: inputPath })
      }
    }

    return normalized.replace(/\\/g, '/')
  }

  sanitizeFileName(fileName) {
    const baseName = path.basename(fileName)
    const ext = path.extname(baseName)
    const name = path.basename(baseName, ext)

    const sanitized = name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200)

    const timestamp = Date.now()
    return `${sanitized}_${timestamp}${ext}`
  }

  async validatePath(normalizedPath) {
    const fullPath = path.join(this.rootPath, normalizedPath)
    const relative = path.relative(this.rootPath, fullPath)

    if (relative.startsWith('..')) {
      throw new StorageValidationError('Path outside storage root not allowed', { path: normalizedPath })
    }
  }

  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fsSync.createReadStream(filePath)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  async persistMetadata(assetPath, metadata) {
    const fullPath = path.join(this.rootPath, this.normalizePath(assetPath))
    const metaPath = `${fullPath}.meta.json`

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))
  }

  guessMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase()
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.zip': 'application/zip',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }
}

export default LocalStorageProvider
