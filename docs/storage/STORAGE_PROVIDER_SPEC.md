# Storage Provider Specification
## Valdi Platform v4.2 — Product Runtime

---

## Overview

This document defines the contract that all storage providers must implement.

---

## Provider Interface

```javascript
export class StorageProviderInterface {
  constructor(config = {}) {
    this.config = config
    this.type = null
  }

  async upload(assetData, options = {}) { }
  async download(assetId, options = {}) { }
  async delete(assetId, options = {}) { }
  async exists(assetId) { }
  async generateUrl(assetId, options = {}) { }
  async generateSignedUrl(assetId, options = {}) { }
  async copy(assetId, destPath, options = {}) { }
  async move(assetId, destPath, options = {}) { }
  async list(prefix, options = {}) { }
  async getMetadata(assetId) { }
  async healthCheck() { }
}
```

---

## Method Contracts

### upload(assetData, options)

**Parameters:**
```javascript
{
  buffer: Buffer,        // File content
  fileName: string,     // Original filename
  mimeType: string,      // MIME type
  path: string,          // Destination path (optional)
}
```

**Returns:**
```javascript
{
  provider: string,     // Provider type
  key: string,          // Storage key
  path: string,          // Storage path
  url: string,           // Public URL
  size: number,          // File size in bytes
  mimeType: string,      // MIME type
}
```

### download(assetId, options)

**Parameters:**
```javascript
{
  assetId: string,      // Storage key
}
```

**Returns:**
```javascript
{
  buffer: Buffer,        // File content
}
```

### delete(assetId, options)

**Parameters:**
```javascript
{
  assetId: string,      // Storage key
}
```

**Returns:**
```javascript
{
  deleted: boolean,     // Success flag
}
```

### exists(assetId)

**Parameters:**
```javascript
{
  assetId: string,      // Storage key
}
```

**Returns:**
```javascript
boolean  // true if exists
```

### generateUrl(assetId, options)

**Parameters:**
```javascript
{
  assetId: string,       // Storage key
}
```

**Returns:**
```javascript
string  // Public URL
```

### generateSignedUrl(assetId, options)

**Parameters:**
```javascript
{
  assetId: string,       // Storage key
  expiresIn: number,      // Expiration in ms (default: 3600000)
}
```

**Returns:**
```javascript
string  // Signed URL
```

### copy(assetId, destPath, options)

**Parameters:**
```javascript
{
  assetId: string,       // Source key
  destPath: string,       // Destination path
}
```

**Returns:**
```javascript
{
  path: string,          // New path
  url: string,           // New URL
}
```

### move(assetId, destPath, options)

**Parameters:**
```javascript
{
  assetId: string,       // Source key
  destPath: string,       // Destination path
}
```

**Returns:**
```javascript
{
  path: string,          // New path
  url: string,           // New URL
}
```

### list(prefix, options)

**Parameters:**
```javascript
{
  prefix: string,        // Path prefix
  maxKeys: number,       // Max results (default: 100)
  marker: string,        // Pagination marker
}
```

**Returns:**
```javascript
[
  {
    name: string,
    path: string,
    size: number,
    modified: Date,
  }
]
```

### getMetadata(assetId)

**Parameters:**
```javascript
{
  assetId: string,       // Storage key
}
```

**Returns:**
```javascript
{
  size: number,
  mimeType: string,
  created: Date,
  modified: Date,
  metadata: object,
}
```

### healthCheck()

**Returns:**
```javascript
{
  healthy: boolean,
  provider: string,
  bucket?: string,
  error?: string,
}
```

---

## Provider Types

### Local Provider
```javascript
{
  basePath: './uploads',
  baseUrl: '/uploads',
  secret: 'local-secret',  // For signed URLs
}
```

### S3 Provider
```javascript
{
  bucket: 'my-bucket',
  region: 'us-east-1',
  accessKeyId: '...',
  secretAccessKey: '...',
  endpoint: '...',  // Optional, for S3-compatible
  cdnUrl: 'https://cdn.example.com',  // Optional
}
```

### R2 Provider
```javascript
{
  accountId: '...',
  accessKeyId: '...',
  secretAccessKey: '...',
  bucket: 'my-bucket',
  publicUrl: 'https://assets.example.com',  // Optional
}
```
