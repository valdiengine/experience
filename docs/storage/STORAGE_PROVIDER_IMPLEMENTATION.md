# Storage Provider Implementation

## Overview

P12.3.2.1 implements the Storage Provider Interface for Valdi Platform v4.2. All providers expose the same public API contract, ensuring the platform remains 100% provider-agnostic.

## Provider Types

### LocalStorageProvider

Local filesystem storage for development and testing.

**Configuration:**
```javascript
{
  type: 'local',
  rootPath: '/path/to/storage',
  baseUrl: 'http://localhost:3000/storage',
  maxFileSize: 104857600, // 100MB
  allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
  tenantIsolation: true
}
```

**Security Features:**
- Path normalization to prevent traversal attacks
- Tenant isolation via path prefix
- Atomic writes with temporary files
- Metadata persistence alongside files
- Checksum generation (MD5)

### S3StorageProvider

AWS S3 storage for production workloads.

**Configuration:**
```javascript
{
  type: 's3',
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: null, // Optional custom endpoint
  cdnUrl: null, // Optional CDN URL
  signedUrlExpiry: 3600,
  maxFileSize: 104857600
}
```

### R2StorageProvider

Cloudflare R2 storage for cost-effective S3-compatible storage.

**Configuration:**
```javascript
{
  type: 'r2',
  accountId: 'my-account-id',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: 'my-bucket',
  cdnUrl: null,
  signedUrlExpiry: 3600,
  maxFileSize: 104857600
}
```

## Provider Interface

All providers implement `StorageProviderInterface` with these methods:

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize provider connection |
| `health()` | Health check |
| `upload(assetData, options)` | Upload file |
| `download(assetId, options)` | Download file |
| `stream(assetId, options)` | Stream file |
| `delete(assetId, options)` | Delete file |
| `exists(assetId)` | Check file exists |
| `move(assetId, destPath, options)` | Move file |
| `copy(assetId, destPath, options)` | Copy file |
| `list(prefix, options)` | List files |
| `createFolder(folderPath, options)` | Create folder |
| `deleteFolder(folderPath, options)` | Delete folder |
| `generatePublicUrl(assetId, options)` | Generate public URL |
| `generateSignedUrl(assetId, options)` | Generate signed URL |
| `getMetadata(assetId)` | Get file metadata |
| `setMetadata(assetId, metadata)` | Set file metadata |
| `getChecksum(assetId, options)` | Get file checksum |

## Factory Pattern

`StorageProviderFactory` creates providers based on configuration. StorageService must use the factory - NO direct provider imports.

```javascript
import StorageProviderFactory from './storage/providers/storage.provider.factory.js'

const provider = await StorageProviderFactory.create(type, config)
await provider.initialize()
```

## Architecture Boundaries

**Design Freeze P13.8:**
- Platform Core, Runtime, API, BusinessService are frozen
- Storage is platform infrastructure accessed only through Storage Capability

**SDK Isolation:**
- `fs` module: LocalStorageProvider ONLY
- `@aws-sdk/client-s3`: S3StorageProvider ONLY
- R2 uses S3-compatible API via `@aws-sdk/client-s3`

## Database Schema

Providers store metadata in the storage database:
- `storage_assets` - Asset metadata
- `storage_folders` - Folder structure
- `storage_permissions` - Access control
- `storage_versions` - Version history
- `storage_uploads` - Upload tracking
- `storage_provider_config` - Provider configuration
