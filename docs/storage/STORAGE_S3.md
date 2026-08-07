# S3StorageProvider Implementation

## Overview

`S3StorageProvider` provides AWS S3 storage for production deployments.

## Class

```javascript
import { S3StorageProvider } from './s3.provider.js'

const provider = new S3StorageProvider({
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: null,
  cdnUrl: null,
  signedUrlExpiry: 3600,
  maxFileSize: 104857600
})
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `region` | string | 'us-east-1' | AWS region |
| `bucket` | string | required | S3 bucket name |
| `accessKeyId` | string | required | AWS access key |
| `secretAccessKey` | string | required | AWS secret key |
| `endpoint` | string | null | Custom endpoint (for MinIO, etc.) |
| `cdnUrl` | string | null | CDN base URL |
| `signedUrlExpiry` | number | 3600 | Signed URL expiry in seconds |
| `maxFileSize` | number | 100MB | Maximum file size |

## AWS SDK Usage

Uses `@aws-sdk/client-s3` for S3 operations:

```javascript
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
```

## Methods Implemented

### upload(assetData, options)

Uses `PutObjectCommand` for single-part upload.

### download(assetId, options)

Uses `GetObjectCommand` and accumulates stream chunks.

### stream(assetId, options)

Returns the S3 stream directly for large file handling.

### delete(assetId, options)

Uses `DeleteObjectCommand`.

### exists(assetId)

Uses `HeadObjectCommand` - returns true/false.

### move(assetId, destPath, options)

Copy + Delete pattern (S3 doesn't have native move).

### copy(assetId, destPath, options)

Uses `CopyObjectCommand`.

### list(prefix, options)

Uses `ListObjectsV2Command` with pagination support.

### createFolder(folderPath, options)

Uploads empty object with `application/x-directory` content type.

### deleteFolder(folderPath, options)

Lists all objects with prefix, then batch deletes using `DeleteObjectsCommand`.

### generateSignedUrl(assetId, options)

Uses `@aws-sdk/s3-request-presigner` with configurable expiry.

### getMetadata(assetId)

Uses `HeadObjectCommand` to retrieve metadata.

### setMetadata(assetId, metadata)

Uses `CopyObjectCommand` with `MetadataDirective: 'REPLACE'`.

### getChecksum(assetId, options)

Returns ETag from `HeadObjectCommand`.

## Custom Endpoint Support

For MinIO or S3-compatible services:

```javascript
const provider = new S3StorageProvider({
  region: 'us-east-1',
  bucket: 'my-bucket',
  endpoint: 'http://minio.local:9000',
  forcePathStyle: true
})
```

## CDN Integration

When `cdnUrl` is configured:

```javascript
generatePublicUrl(assetId) {
  return `${this.cdnUrl}/${key}`
}
```

## Guardian Validation

StorageGuardian verifies:
- `@aws-sdk/client-s3` import is present
- No `fs` imports (filesystem not used)
- No `@azure` or `@google-cloud` imports
- All 17 interface methods implemented
