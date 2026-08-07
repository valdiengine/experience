# Storage Provider Interface Contract

## Purpose

This document defines the contract that all storage providers MUST implement. The contract ensures 100% provider-agnostic behavior throughout the Valdi Platform.

## Contract Version

- Version: 1.0.0
- Status: Active
- Last Updated: P12.3.2.1

## Provider Types

```javascript
export const STORAGE_PROVIDER_TYPES = {
  LOCAL: 'local',
  S3: 's3',
  R2: 'r2',
  AZURE: 'azure',
  GCS: 'gcs',
}
```

## Interface Definition

### constructor(config)

**Parameters:**
- `config` (Object): Provider-specific configuration

**Returns:** StorageProviderInterface instance

### async initialize()

Initializes the provider connection.

**Returns:** `{ initialized: true, ...providerInfo }`

**Throws:**
- `StorageProviderError` if required configuration is missing

### async health()

Returns provider health status.

**Returns:**
```javascript
{
  healthy: true,
  provider: 'local|s3|r2',
  bucket: 'bucket-name', // provider-specific
  region: 'region', // provider-specific
  initialized: true
}
```

### async upload(assetData, options)

Uploads a file to storage.

**Parameters:**
```javascript
assetData = {
  buffer: Buffer, // File content
  fileName: string, // Original filename
  mimeType: string, // MIME type
  path: string, // Destination path
  metadata: object // Optional metadata
}
```

**Returns:**
```javascript
{
  provider: 'local|s3|r2',
  key: 'path/to/file.jpg',
  path: 'path/to/file.jpg',
  url: 'https://...',
  size: 1024,
  mimeType: 'image/jpeg',
  etag: 'checksum',
  metadata: {}
}
```

**Throws:**
- `StorageProviderError` if validation fails

### async download(assetId, options)

Downloads a file from storage.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{
  buffer: Buffer,
  metadata: {},
  contentType: 'image/jpeg'
}
```

**Throws:**
- `StorageNotFoundError` if file not found

### async stream(assetId, options)

Returns a stream for the file.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{
  stream: ReadableStream,
  metadata: {},
  contentType: 'image/jpeg'
}
```

**Throws:**
- `StorageNotFoundError` if file not found

### async delete(assetId, options)

Deletes a file from storage.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{ deleted: true, key: 'path/to/file.jpg' }
```

### async exists(assetId)

Checks if a file exists.

**Parameters:**
- `assetId` (string): File key/path

**Returns:** `boolean`

### async move(assetId, destPath, options)

Moves a file to a new location.

**Parameters:**
- `assetId` (string): Source file key/path
- `destPath` (string): Destination path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{
  path: 'new/path/file.jpg',
  url: 'https://...'
}
```

### async copy(assetId, destPath, options)

Copies a file to a new location.

**Parameters:**
- `assetId` (string): Source file key/path
- `destPath` (string): Destination path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{
  path: 'new/path/file.jpg',
  url: 'https://...'
}
```

### async list(prefix, options)

Lists files in a prefix.

**Parameters:**
- `prefix` (string): Path prefix
- `options` (object): `{ maxKeys: 100, continuationToken: null }`

**Returns:**
```javascript
[{
  name: 'file.jpg',
  path: 'path/to/file.jpg',
  size: 1024,
  modified: Date,
  etag: 'checksum',
  isFile: true,
  isDirectory: false
}]
```

### async createFolder(folderPath, options)

Creates a folder/directory marker.

**Parameters:**
- `folderPath` (string): Folder path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{ created: true, path: 'path/to/folder/' }
```

### async deleteFolder(folderPath, options)

Deletes a folder and all contents.

**Parameters:**
- `folderPath` (string): Folder path
- `options` (object): Provider-specific options

**Returns:**
```javascript
{ deleted: true, path: 'path/to/folder/' }
```

### generatePublicUrl(assetId, options)

Generates a public URL for a file.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): Provider-specific options

**Returns:** `string` (URL)

### async generateSignedUrl(assetId, options)

Generates a signed URL for private access.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): `{ expiresIn: 3600 }`

**Returns:** `string` (Signed URL)

### async getMetadata(assetId)

Gets file metadata.

**Parameters:**
- `assetId` (string): File key/path

**Returns:**
```javascript
{
  size: 1024,
  mimeType: 'image/jpeg',
  created: Date,
  modified: Date,
  etag: 'checksum',
  metadata: {},
  storageClass: 'STANDARD' // provider-specific
}
```

**Throws:**
- `StorageNotFoundError` if file not found

### async setMetadata(assetId, metadata)

Sets file metadata.

**Parameters:**
- `assetId` (string): File key/path
- `metadata` (object): Metadata to set

**Returns:**
```javascript
{ updated: true, path: 'path/to/file.jpg' }
```

### async getChecksum(assetId, options)

Gets file checksum/etag.

**Parameters:**
- `assetId` (string): File key/path
- `options` (object): Provider-specific options

**Returns:** `string` (checksum/etag) or `null`

## Error Handling

All providers MUST throw appropriate error types:

```javascript
import {
  StorageProviderError,
  StorageNotFoundError,
  StorageAccessDeniedError,
  StorageValidationError,
  StorageConfigurationError
} from '../storage.errors.js'
```

## Provider Isolation

Providers MUST NOT import from other providers:

| Provider | Allowed Imports |
|----------|---------------|
| LocalStorageProvider | `fs`, `path`, `crypto` |
| S3StorageProvider | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| R2StorageProvider | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |

## Compliance

Providers are verified by `StorageGuardian` which checks:
- All required methods are implemented
- SDK usage is isolated to correct providers
- No forbidden imports outside provider layer
- Factory pattern is used by StorageService
