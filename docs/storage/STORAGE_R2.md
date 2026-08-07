# R2StorageProvider Implementation

## Overview

`R2StorageProvider` provides Cloudflare R2 storage for cost-effective S3-compatible object storage.

## Class

```javascript
import { R2StorageProvider } from './r2.provider.js'

const provider = new R2StorageProvider({
  accountId: 'my-account-id',
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: 'my-bucket',
  cdnUrl: null,
  signedUrlExpiry: 3600,
  maxFileSize: 104857600
})
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accountId` | string | required | Cloudflare account ID |
| `accessKeyId` | string | required | R2 access key |
| `secretAccessKey` | string | required | R2 secret key |
| `bucket` | string | required | R2 bucket name |
| `cdnUrl` | string | null | Custom domain/CDN URL |
| `signedUrlExpiry` | number | 3600 | Signed URL expiry in seconds |
| `maxFileSize` | number | 100MB | Maximum file size |

## S3-Compatible API

R2 uses the S3-compatible API, so this provider mirrors `S3StorageProvider`:

```javascript
async createClient() {
  const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`

  return new S3Client({
    region: 'auto',
    credentials: {
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    },
    endpoint,
  })
}
```

## AWS SDK Usage

Same SDK as S3 provider:

```javascript
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
```

## Differences from S3

| Aspect | S3 | R2 |
|--------|----|----|
| Endpoint | `s3.{region}.amazonaws.com` | `{accountId}.r2.cloudflarestorage.com` |
| Region | Required | `auto` |
| Storage Classes | STANDARD, REDUCED_REDUNDANCY, etc. | Only STANDARD |
| Multipart Upload | Native support | Supported |
| SDK | `@aws-sdk/client-s3` | `@aws-sdk/client-s3` |

## Methods Implemented

Identical to S3StorageProvider:

- `initialize()` - Creates R2 client connection
- `health()` - HeadBucket check
- `upload()` - PutObjectCommand
- `download()` - GetObjectCommand
- `stream()` - Direct stream
- `delete()` - DeleteObjectCommand
- `exists()` - HeadObjectCommand
- `move()` - Copy + Delete
- `copy()` - CopyObjectCommand
- `list()` - ListObjectsV2Command
- `createFolder()` - Empty object with directory marker
- `deleteFolder()` - Batch delete with prefix
- `generatePublicUrl()` - R2 public URL
- `generateSignedUrl()` - Presigned URL
- `getMetadata()` - HeadObjectCommand
- `setMetadata()` - CopyObjectCommand with REPLACE
- `getChecksum()` - ETag

## R2 Public URL Format

```javascript
getObjectUrl(key) {
  return `https://${this.bucket}.${this.accountId}.r2.cloudflarestorage.com/${key}`
}
```

## Signed URL Support

R2 supports presigned URLs like S3:

```javascript
async generateSignedUrl(assetId, options = {}) {
  const url = await getSignedUrl(
    this.client,
    new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    { expiresIn: expiresIn / 1000 }
  )
  return url
}
```

## Guardian Validation

StorageGuardian verifies:
- `@aws-sdk/client-s3` import is present (R2 uses S3 API)
- No `fs` imports (no local filesystem)
- No `@azure` or `@google-cloud` imports
- All 17 interface methods implemented
- R2-specific account ID configuration present
