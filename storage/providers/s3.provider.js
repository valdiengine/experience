/**
 * S3 Storage Provider
 *
 * P12.3.2.1 — Storage Provider Interface Implementation
 *
 * AWS S3 storage provider for production use.
 * All methods follow the provider interface contract.
 *
 * No direct S3 SDK access outside this provider.
 */

import { StorageProviderInterface, STORAGE_PROVIDER_TYPES } from './storage.provider.interface.js'
import { StorageProviderError, StorageNotFoundError } from '../storage.errors.js'

const DEFAULT_CONFIG = {
  region: 'us-east-1',
  bucket: null,
  accessKeyId: null,
  secretAccessKey: null,
  endpoint: null,
  cdnUrl: null,
  signedUrlExpiry: 3600,
  maxFileSize: 100 * 1024 * 1024,
}

export class S3StorageProvider extends StorageProviderInterface {
  constructor(config = {}) {
    super({ ...DEFAULT_CONFIG, ...config })
    this.type = STORAGE_PROVIDER_TYPES.S3
    this.region = this.config.region
    this.bucket = this.config.bucket
    this.accessKeyId = this.config.accessKeyId
    this.secretAccessKey = this.config.secretAccessKey
    this.endpoint = this.config.endpoint
    this.cdnUrl = this.config.cdnUrl
    this.signedUrlExpiry = this.config.signedUrlExpiry
    this.client = null
  }

  async initialize() {
    if (!this.bucket) {
      throw new StorageProviderError('S3 bucket is required', this.type)
    }

    this.client = await this.createClient()
    this.initialized = true

    return { initialized: true, bucket: this.bucket, region: this.region }
  }

  async createClient() {
    const { S3Client } = await import('@aws-sdk/client-s3')
    const { defaultProvider } = await import('@smithy/property-provider')

    const clientConfig = {
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    }

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint
      clientConfig.forcePathStyle = true
    }

    return new S3Client(clientConfig)
  }

  async health() {
    try {
      if (!this.client) {
        return { healthy: false, provider: this.type, error: 'Client not initialized' }
      }

      const { HeadBucketCommand } = await import('@aws-sdk/client-s3')
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))

      return {
        healthy: true,
        provider: this.type,
        bucket: this.bucket,
        region: this.region,
        initialized: this.initialized,
      }
    } catch (error) {
      return {
        healthy: false,
        provider: this.type,
        bucket: this.bucket,
        error: error.message,
        initialized: this.initialized,
      }
    }
  }

  async upload(assetData, options = {}) {
    const { buffer, fileName, mimeType, path: destPath, metadata } = assetData

    if (!buffer || !fileName) {
      throw new StorageProviderError('Buffer and fileName are required', this.type, { fileName })
    }

    if (buffer.length > this.config.maxFileSize) {
      throw new StorageProviderError(
        `File size exceeds maximum: ${buffer.length} > ${this.config.maxFileSize}`,
        this.type,
        { maxSize: this.config.maxFileSize, actualSize: buffer.length }
      )
    }

    const key = this.buildKey(destPath, fileName)

    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3')

      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      }

      if (metadata) {
        uploadParams.Metadata = this.flattenMetadata(metadata)
      }

      await this.client.send(new PutObjectCommand(uploadParams))

      const url = this.cdnUrl ? `${this.cdnUrl}/${key}` : await this.getObjectUrl(key)

      return {
        provider: this.type,
        key,
        path: key,
        url,
        size: buffer.length,
        mimeType: mimeType || 'application/octet-stream',
        etag: await this.getEtag(key),
        metadata,
      }
    } catch (error) {
      throw new StorageProviderError(
        `S3 upload failed: ${error.message}`,
        this.type,
        { fileName, key }
      )
    }
  }

  async download(assetId, options = {}) {
    const key = this.normalizeKey(assetId)

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      const chunks = []
      const stream = response.Body

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)

      return { buffer, metadata: response.Metadata, contentType: response.ContentType }
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new StorageNotFoundError(assetId)
      }
      throw new StorageProviderError(
        `S3 download failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async stream(assetId, options = {}) {
    const key = this.normalizeKey(assetId)

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return {
        stream: response.Body,
        metadata: response.Metadata,
        contentType: response.ContentType,
      }
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new StorageNotFoundError(assetId)
      }
      throw new StorageProviderError(
        `S3 stream failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async delete(assetId, options = {}) {
    const key = this.normalizeKey(assetId)

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return { deleted: true, key }
    } catch (error) {
      throw new StorageProviderError(
        `S3 delete failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async exists(assetId) {
    const key = this.normalizeKey(assetId)

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')

      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return true
    } catch {
      return false
    }
  }

  async move(assetId, destPath, options = {}) {
    const srcKey = this.normalizeKey(assetId)
    const destKey = this.buildKey(destPath, path.basename(srcKey))

    try {
      const { CopyObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3')

      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${srcKey}`,
          Key: destKey,
        })
      )

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: srcKey,
        })
      )

      return {
        path: destKey,
        url: this.cdnUrl ? `${this.cdnUrl}/${destKey}` : await this.getObjectUrl(destKey),
      }
    } catch (error) {
      throw new StorageProviderError(
        `S3 move failed: ${error.message}`,
        this.type,
        { assetId, destPath }
      )
    }
  }

  async copy(assetId, destPath, options = {}) {
    const srcKey = this.normalizeKey(assetId)
    const destKey = this.buildKey(destPath, path.basename(srcKey))

    try {
      const { CopyObjectCommand } = await import('@aws-sdk/client-s3')

      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${srcKey}`,
          Key: destKey,
        })
      )

      return {
        path: destKey,
        url: this.cdnUrl ? `${this.cdnUrl}/${destKey}` : await this.getObjectUrl(destKey),
      }
    } catch (error) {
      throw new StorageProviderError(
        `S3 copy failed: ${error.message}`,
        this.type,
        { assetId, destPath }
      )
    }
  }

  async list(prefix, options = {}) {
    const normalizedPrefix = this.normalizeKey(prefix)

    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: normalizedPrefix,
          MaxKeys: options.maxKeys || 100,
          ContinuationToken: options.continuationToken,
        })
      )

      return (response.Contents || []).map((item) => ({
        name: path.basename(item.Key),
        path: item.Key,
        size: item.Size,
        modified: item.LastModified,
        etag: item.ETag,
        isFile: true,
        isDirectory: false,
      }))
    } catch (error) {
      throw new StorageProviderError(
        `S3 list failed: ${error.message}`,
        this.type,
        { prefix }
      )
    }
  }

  async createFolder(folderPath, options = {}) {
    const key = this.normalizeKey(folderPath)

    if (!key.endsWith('/')) {
      return this.upload(
        { buffer: Buffer.from(''), fileName: '.folder', path: folderPath },
        options
      )
    }

    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3')

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: '',
          ContentType: 'application/x-directory',
        })
      )

      return { created: true, path: key }
    } catch (error) {
      throw new StorageProviderError(
        `S3 createFolder failed: ${error.message}`,
        this.type,
        { folderPath }
      )
    }
  }

  async deleteFolder(folderPath, options = {}) {
    const prefix = this.normalizeKey(folderPath)

    try {
      const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3')

      const listResponse = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        })
      )

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const objectsToDelete = listResponse.Contents.map((obj) => ({ Key: obj.Key }))

        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objectsToDelete },
          })
        )
      }

      return { deleted: true, path: prefix }
    } catch (error) {
      throw new StorageProviderError(
        `S3 deleteFolder failed: ${error.message}`,
        this.type,
        { folderPath }
      )
    }
  }

  generatePublicUrl(assetId, options = {}) {
    const key = this.normalizeKey(assetId)

    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }

  async generateSignedUrl(assetId, options = {}) {
    const key = this.normalizeKey(assetId)
    const expiresIn = options.expiresIn || this.signedUrlExpiry

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expiresIn / 1000 }
      )

      return url
    } catch (error) {
      throw new StorageProviderError(
        `S3 signed URL failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async getMetadata(assetId) {
    const key = this.normalizeKey(assetId)

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return {
        size: response.ContentLength,
        mimeType: response.ContentType,
        created: response.LastModified,
        modified: response.LastModified,
        etag: response.ETag,
        metadata: this.unflattenMetadata(response.Metadata),
        storageClass: response.StorageClass,
      }
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new StorageNotFoundError(assetId)
      }
      throw new StorageProviderError(
        `S3 getMetadata failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async setMetadata(assetId, metadata) {
    const key = this.normalizeKey(assetId)

    try {
      const { CopyObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3')

      const headResponse = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${key}`,
          Key: key,
          Metadata: this.flattenMetadata(metadata),
          MetadataDirective: 'REPLACE',
          ContentType: headResponse.ContentType,
        })
      )

      return { updated: true, path: key }
    } catch (error) {
      throw new StorageProviderError(
        `S3 setMetadata failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  async getChecksum(assetId, options = {}) {
    const key = this.normalizeKey(assetId)

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return response.ETag?.replace(/"/g, '') || null
    } catch (error) {
      throw new StorageProviderError(
        `S3 getChecksum failed: ${error.message}`,
        this.type,
        { assetId }
      )
    }
  }

  normalizeKey(key) {
    if (!key) return ''
    return key.replace(/\\/g, '/').replace(/^\//, '')
  }

  buildKey(destPath, fileName) {
    const normalizedDest = destPath ? this.normalizeKey(destPath) : ''
    const normalizedFile = this.normalizeKey(fileName)

    if (normalizedDest) {
      return normalizedDest.endsWith('/')
        ? `${normalizedDest}${normalizedFile}`
        : `${normalizedDest}/${normalizedFile}`
    }

    return normalizedFile
  }

  async getObjectUrl(key) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }

  async getEtag(key) {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')

      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return response.ETag?.replace(/"/g, '') || null
    } catch {
      return null
    }
  }

  flattenMetadata(metadata) {
    const flattened = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'object') {
        flattened[key] = JSON.stringify(value)
      } else {
        flattened[key] = String(value)
      }
    }
    return flattened
  }

  unflattenMetadata(metadata) {
    if (!metadata) return {}
    const unflattened = {}
    for (const [key, value] of Object.entries(metadata)) {
      try {
        unflattened[key] = JSON.parse(value)
      } catch {
        unflattened[key] = value
      }
    }
    return unflattened
  }
}

export default S3StorageProvider
