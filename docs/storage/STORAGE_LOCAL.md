# LocalStorageProvider Implementation

## Overview

`LocalStorageProvider` provides filesystem-based storage for development, testing, and self-hosted deployments.

## Class

```javascript
import { LocalStorageProvider } from './local.provider.js'

const provider = new LocalStorageProvider({
  rootPath: '/data/storage',
  baseUrl: 'http://localhost:3000/storage',
  maxFileSize: 104857600,
  allowedMimeTypes: ['image/*', 'video/*'],
  tenantIsolation: true
})
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rootPath` | string | required | Root directory for storage |
| `baseUrl` | string | required | Base URL for public access |
| `maxFileSize` | number | 100MB | Maximum file size |
| `allowedMimeTypes` | array | null | Allowed MIME types (null = all) |
| `tenantIsolation` | boolean | true | Enable tenant isolation |
| `checksumAlgorithm` | string | 'md5' | Checksum algorithm |

## Security Features

### Path Normalization

All paths are normalized to prevent traversal attacks:

```javascript
normalizeKey(key) {
  return key.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\//, '')
}
```

### Tenant Isolation

When enabled, all paths are prefixed with tenant ID:

```javascript
buildKey(destPath, fileName, tenantId) {
  const basePath = tenantId ? `tenants/${tenantId}` : ''
  // ... combine with destPath and fileName
}
```

### Atomic Writes

Files are written to temporary location first, then renamed:

```javascript
async writeFileAtomic(filePath, data) {
  const tmpPath = filePath + '.tmp.' + Date.now()
  await fs.promises.writeFile(tmpPath, data)
  await fs.promises.rename(tmpPath, filePath)
}
```

## Methods Implemented

All 17 methods from `StorageProviderInterface` are implemented:

- `initialize()` - Creates root directory if needed
- `health()` - Checks directory accessibility
- `upload()` - Atomic write with metadata
- `download()` - Read and return buffer
- `stream()` - Return read stream
- `delete()` - Unlink file and metadata
- `exists()` - Access check
- `move()` - Rename operation
- `copy()` - Copy file and metadata
- `list()` - Read directory contents
- `createFolder()` - Create .folder marker
- `deleteFolder()` - Recursive delete
- `generatePublicUrl()` - Construct public URL
- `generateSignedUrl()` - Not applicable (returns public URL)
- `getMetadata()` - Read metadata file
- `setMetadata()` - Write metadata file
- `getChecksum()` - Calculate MD5

## Metadata Storage

Metadata is stored alongside files as `.meta.json`:

```
/data/storage/tenants/123/documents/report.pdf
/data/storage/tenants/123/documents/.report.pdf.meta.json
```

## Guardian Validation

StorageGuardian verifies:
- No `@aws-sdk` imports in local.provider.js
- No `@google-cloud` imports in local.provider.js
- No `@azure` imports in local.provider.js
- Only `fs`, `path`, `crypto` imports are allowed
