# Storage Security Model
## Valdi Platform v4.2 — Product Runtime

---

## Overview

This document defines the security rules for the storage layer.

---

## Access Control Model

### Access Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `public` | Anyone can access | Public images, marketing assets |
| `private` | Signed URL required | User documents, private data |
| `company` | Company members only | Business assets |
| `user` | Owner only | Personal files, drafts |

### Ownership Chain

```
Platform (tenantId)
  └── Destination (destinationId)
        └── Company (companyId)
              └── User (userId)
                    └── Asset
```

Every asset MUST have `tenantId`. All other ownership is optional.

---

## Tenant Isolation

**Rule:** All storage operations MUST include tenant context.

```javascript
// Correct
const assets = await db.select().from(assetsTable).where(
  eq(assetsTable.tenantId, tenantId)
)

// Incorrect — missing tenant filter
const assets = await db.select().from(assetsTable)
```

---

## Upload Security

### Validation Rules

| Rule | Value | Error |
|------|-------|-------|
| Max file size | 100MB | `StorageValidationError` |
| Allowed MIME types | Whitelist | `StorageValidationError` |
| File name sanitization | Required | Sanitize special chars |

### Allowed MIME Types (Default)

```javascript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/zip',
]
```

---

## Signed URLs

### Generation

```javascript
const signedUrl = await storageService.getAssetUrl(assetId, {
  signed: true,
  expiresIn: 3600000, // 1 hour
})
```

### Validation

Signed URLs contain:
- Expiration timestamp
- Signature

```javascript
const isValid = verifySignature(url, secret)
const isExpired = Date.now() > url.expires
```

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `admin` | All operations |
| `company_owner` | Company assets + user assets |
| `company_member` | Company assets (read), user assets (full) |
| `user` | Own assets only |
| `guest` | Public assets only |

---

## Configuration Security

### Environment Variables (Required)

```bash
STORAGE_PROVIDER=local|s3|r2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
STORAGE_SECRET=...  # For signed URLs
```

### Never Commit

- [ ] Real credentials
- [ ] Access keys
- [ ] Secrets

---

## Malware Scanning

**Status:** Ready for integration

```javascript
// Future integration point
const scanResult = await malwareScanner.scan(buffer)
if (scanResult.infected) {
  throw new StorageValidationError('File rejected: malware detected')
}
```

---

## Audit Trail

All operations logged:

| Event | Data |
|-------|------|
| `asset.uploaded` | assetId, userId, companyId, size |
| `asset.downloaded` | assetId, userId, timestamp |
| `asset.deleted` | assetId, userId, timestamp |
| `asset.access_denied` | assetId, userId, reason |

---

## Compliance

### GDPR

- R2 provider recommended for EU data
- User consent required for personal data
- Deletion on user request

### Data Residency

| Region | Provider | Use Case |
|--------|----------|----------|
| EU | R2 (EU region) | EU user data |
| SA | S3 (São Paulo) | South America |
| US | S3 (N. Virginia) | Global CDN |

---

## Security Checklist

- [ ] Tenant isolation enforced
- [ ] Upload validation configured
- [ ] Signed URLs implemented
- [ ] Role-based access defined
- [ ] Secrets in environment
- [ ] Audit logging enabled
- [ ] Malware scanning ready
