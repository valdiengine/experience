# Storage Providers

> Purpose: File and object storage for media assets.

## Future Responsibilities

- File upload/download
- Object storage management
- Signed URL generation
- CDN integration
- File type validation
- Thumbnail/image processing triggers

## Expected Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| Local Storage | Future (P12.0.4+) | Development. File system storage. |
| S3 | Future (P12.1+) | AWS S3 or compatible (MinIO, DigitalOcean Spaces). |
| Cloudflare R2 | Future (P12.1+) | S3-compatible, no egress fees. |
| Azure Blob | Future (P12.1+) | Azure cloud storage. |

## Integration with Repository Engine

Storage providers implement a `StorageAdapter` that extends `RepositoryAdapter`.
The MediaRepository uses the storage adapter for file operations.
