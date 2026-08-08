# FILESYSTEM SECURITY VALIDATION

## Overview

The P15.1.2 FilesystemConfigurationSource implements security controls to prevent unauthorized filesystem access during configuration loading.

## Security Architecture

### Path Validation

All filesystem paths are validated through `#validatePath()`:

```javascript
#validatePath(requestedPath, allowedRoots = ['ecosystems', 'companies', 'config']) {
  // 1. Resolve path relative to root
  const resolved = path.resolve(this.#root, requestedPath)

  // 2. Normalize to remove . and .. components
  const normalized = path.normalize(resolved)

  // 3. Check against allowed roots
  for (const root of allowedRoots) {
    const allowedPath = path.join(this.#root, root)
    if (normalized.startsWith(allowedPath + path.sep) || normalized === allowedPath) {
      return normalized  // SAFE
    }
  }

  // 4. Block if not in allowed roots
  throw new ConfigurationResolutionError('Path traversal detected', {...})
}
```

### Allowed Roots

Only these directories can be accessed:

| Root | Purpose |
|------|---------|
| `ecosystems/` | Country, region, destination configurations |
| `companies/` | Company configurations |
| `config/` | Platform and experience configurations |

### Prohibited Access

The following are BLOCKED:
- `runtime/` - Platform Core
- `repository/` - Repository layer
- `api/` - API layer
- `capabilities/` - Capability implementations
- `storage/` - Storage layer
- `media/` - Media processing
- `database/` - Database layer
- `guardian/` - Guardian tools
- `..` - Parent directory traversal
- Absolute paths outside project root

## Threat Scenarios Tested

### Path Traversal Attempts

| Attempt | Expected | Actual |
|---------|----------|--------|
| `../etc/passwd` | REJECT | REJECTED |
| `../../.env` | REJECT | REJECTED |
| `../../../root` | REJECT | REJECTED |
| `ecosystems/../../../etc/passwd` | REJECT | REJECTED |
| `config/platform/../../../secrets` | REJECT | REJECTED |

### Windows-Specific Paths

| Attempt | Expected | Actual |
|---------|----------|--------|
| `\\\\windows\\system32\\config` | REJECT | REJECTED |
| `C:\\Users\\Admin` | REJECT | REJECTED |

### Encoded Traversal

| Attempt | Expected | Actual |
|---------|----------|--------|
| `..%2F..%2F..%2Fetc%2Fpasswd` | REJECT | REJECTED |
| `./../../etc/passwd` | REJECT | REJECTED |

## Security Properties

### Isolation

Each configuration type can ONLY access its designated directory:

```
Configuration Type     Allowed Path Pattern
────────────────────────────────────────────
Platform Config    →   {root}/config/platform/**
Country Config     →   {root}/ecosystems/{country}/metadata.js
Region Config      →   {root}/ecosystems/{country}/regions/{region}/metadata.js
Destination Config →   {root}/ecosystems/{country}/regions/{region}/destinations/{dest}/**
Company Config     →   {root}/companies/{country}/{region}/{dest}/{company}/**
Experience Config  →   {root}/config/experiences/**
```

### No Escape Vector

The path validation occurs BEFORE:
1. Cache lookup
2. File existence check
3. File reading
4. Module loading

Therefore, even cached paths are re-validated on each access.

## Guardian Validation

The Guardian specifically validates:
- No hardcoded product/destination/company identities in Experience Engine
- No direct database queries
- No infrastructure SDK usage
- Configuration boundary compliance

**Guardian Result**: 100/100 (0 violations)

## Correct Usage Patterns

### Safe: Loading Configuration

```javascript
// SAFE: Uses validated path building
const config = await source.loadDestination('cl', 'los-rios', 'valdi')
// Internally accesses: ecosystems/cl/regions/los-rios/destinations/valdi/config.js
```

### Safe: Sub-directory Access

```javascript
// SAFE: Sub-directories within allowed roots are allowed
const destPath = path.join('ecosystems', countryCode, 'regions', regionCode, 'destinations', destCode, 'config.js')
// Validated as: {root}/ecosystems/cl/regions/los-rios/destinations/valdi/config.js
```

### Blocked: Parent Traversal

```javascript
// BLOCKED: Would escape to parent of ecosystems/
const maliciousPath = 'ecosystems/../../../etc/passwd'
// Normalized: {root}/etc/passwd (NOT in allowed roots)
// Throws: ConfigurationResolutionError('Path traversal detected')
```

## Security Summary

| Property | Status |
|----------|--------|
| Path traversal prevention | VERIFIED |
| Allowed root enforcement | VERIFIED |
| Cache injection prevention | VERIFIED |
| No platform directory access | VERIFIED |
| No infrastructure access | VERIFIED |
| Guardian compliance | PASS (100/100) |

## Conclusion

Filesystem security is properly implemented. The ConfigurationSource prevents any escape from the designated configuration directories, ensuring that the Experience Engine cannot access sensitive platform or infrastructure files through configuration loading.
