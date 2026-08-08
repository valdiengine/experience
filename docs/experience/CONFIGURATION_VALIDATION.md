# CONFIGURATION VALIDATION

## Validation Scope

Configuration loading, inheritance, and validation for the P15.1.2 implementation.

## Configuration Hierarchy

```
Platform (config/platform/index.js)
    ↓
Country (ecosystems/{country}/metadata.js)
    ↓
Region (ecosystems/{country}/regions/{region}/metadata.js)
    ↓
Destination (ecosystems/{country}/regions/{region}/destinations/{dest}/config.js)
    ↓
Company (companies/{country}/{region}/{destination}/{company}/config.js)
```

## Inheritance Test Results

### Platform Defaults Inheritance

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| i18n.defaultLocale | es-CL | es-CL | PASS |
| storage.prefix | valdi_ | valdi_ | PASS |

### Country Overrides

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| country.code | cl | cl | PASS |
| country.timezone | America/Santiago | America/Santiago | PASS |
| country.currency | CLP | CLP | PASS |

### Destination Configuration

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| destination.slug | valdi | valdi | PASS |
| destination.domain | valdi.app | valdi.app | PASS |
| destination.branding.colors.primary | #c8a55c | #c8a55c | PASS |
| destination.navigation.header.items | 5 items | 5 items | PASS |

### Company Configuration

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| company.slug | albasie | albasie | PASS |
| company.destination | valdivia | valdivia | PASS |
| company.branding.colors.primary | #2d5a27 | #2d5a27 | PASS |

## Configuration Source Implementation

### FilesystemConfigurationSource

**File**: `experience/source/filesystem.configuration.source.js`

**Features**:
- ESM-compatible using dynamic `import()`
- Path traversal prevention via `#validatePath()`
- Caching support with Map-based cache
- Normalizers for all configuration levels

**Allowed Roots**:
- `ecosystems/` - Country, region, destination configs
- `companies/` - Company configs
- `config/` - Platform and experience configs

### Path Traversal Protection

The `#validatePath()` method prevents path traversal:

```javascript
#validatePath(requestedPath, allowedRoots = ['ecosystems', 'companies', 'config']) {
  const resolved = path.resolve(this.#root, requestedPath)
  const normalized = path.normalize(resolved)

  for (const root of allowedRoots) {
    const allowedPath = path.join(this.#root, root)
    if (normalized.startsWith(allowedPath + path.sep) || normalized === allowedPath) {
      return normalized
    }
  }

  throw new ConfigurationResolutionError('Path traversal detected', {...})
}
```

## Validation Schemas

**File**: `config/schemas/configuration.schemas.js`

Schemas defined for:
- `validatePlatformConfig(config)`
- `validateCountryConfig(config)`
- `validateRegionConfig(config)`
- `validateDestinationConfig(config)`
- `validateCompanyConfig(config)`
- `validateConfigurationHierarchy(configs)`

## Cache Isolation

**Status**: PASS

Cache key includes destination identity:

| Test | Result |
|------|--------|
| First load (cache miss) | 4ms |
| Second load (cache hit) | 0ms |
| Different destination | Separate cache entry |
| valdivia config in natales request | NOT returned |

## Company Isolation

**Status**: PASS

Companies loaded from `companies/{country}/{region}/{destination}/{company}/config.js`:
- Albasie at `companies/cl/los-rios/valdivia/albasie/config.js`
- Correctly resolves to destination 'valdivia'
- Does NOT leak to other destinations

## Corrective Change Applied

During validation, company loading from filesystem was not implemented in `loadConfigurationsFromSource()`. This was fixed by adding:

```javascript
const companies = await this.#source.loadAllCompanies(cc, regionCode, destCode)
for (const [companyCode, company] of Object.entries(companies)) {
  const companyKey = `${cc}-${regionCode}-${destCode}-${companyCode}`
  this.#companyConfigs.set(companyKey, company)
}
```
