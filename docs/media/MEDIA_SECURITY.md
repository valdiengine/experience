# Media Security Model

## Overview

Security model for media processing engine.

## Security Principles

1. **No Direct Library Access**
   - Media processors must NOT import Sharp, FFmpeg directly
   - Libraries loaded conditionally in processor implementation
   - Media Guardian validates no forbidden imports outside media layer

2. **Storage Platform Isolation**
   - MediaEngine never communicates directly with storage providers
   - All storage goes through StoragePlatform (Storage Capability)
   - BusinessService remains storage-agnostic

3. **CDN Abstraction**
   - CDN layer abstracts provider details
   - MediaManager never imports CDN SDKs
   - Supported: Cloudflare, CloudFront, R2 Public

4. **Tenant Isolation**
   - All operations filter by tenantId
   - Media relationships respect tenant boundaries
   - Permissions scoped to tenant

## Validation Rules

### Upload Validation

```javascript
validateUpload(assetData) {
  // Buffer or URL required
  if (!assetData.buffer && !assetData.url) {
    throw new MediaValidationError('Buffer or URL is required')
  }

  // File name required
  if (!assetData.fileName) {
    throw new MediaValidationError('File name is required')
  }

  // MIME type required
  if (!assetData.mimeType) {
    throw new MediaValidationError('MIME type is required')
  }

  // Allowed types check
  const allowedTypes = this.context.config?.media?.allowedMimeTypes
  if (allowedTypes && !allowedTypes.includes(assetData.mimeType)) {
    throw new MediaValidationError(`MIME type not allowed: ${assetData.mimeType}`)
  }

  // Size check
  const maxSize = this.context.config?.media?.maxFileSize || 100MB
  if (assetData.buffer?.length > maxSize) {
    throw new MediaValidationError(`File size exceeds maximum`)
  }
}
```

### Access Validation

```javascript
validateAccess(media, operation) {
  const tenantId = this.context.tenant?.id

  if (media.tenantId !== tenantId) {
    throw new MediaError('Access denied: media belongs to different tenant')
  }

  return true
}
```

## Forbidden Patterns

MediaGuardian checks for these forbidden patterns outside media layer:

| Library | Forbidden Pattern |
|--------|----------------|
| Sharp | `from 'sharp'` |
| FFmpeg | `from 'fluent-ffmpeg'` |
| pdf-parse | `from 'pdf-parse'` |
| Canvas | `from 'canvas'` |
| Cloudflare | `from 'cloudflare'` |

## Vulnerability Mitigations

### Path Traversal
- File names sanitized before storage
- No user-controlled paths

### Malicious Files
- MIME type validation
- File size limits
- Content-type verification

### Data Leakage
- EXIF stripping option
- Metadata cleanup
- Signed URLs for private assets
