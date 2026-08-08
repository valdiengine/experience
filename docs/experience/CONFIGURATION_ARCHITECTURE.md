# Configuration Architecture

The Experience Engine uses a hierarchical configuration system that loads and merges configurations from multiple sources following a well-defined inheritance model.

## Configuration Hierarchy

Configurations are loaded in the following order (later levels override earlier ones):

```
Platform → Country → Region → Destination → Company
```

### Platform Configuration (`config/platform/index.js`)
- **Purpose**: Global platform defaults
- **Loaded by**: `FilesystemConfigurationSource`
- **Contains**: Theme defaults, i18n settings, storage config, capability defaults

### Country Configuration (`ecosystems/{country}/metadata.js`)
- **Purpose**: Country-specific settings
- **Contains**: Currency, timezone, locale, enabled categories, region list

### Region Configuration (`ecosystems/{country}/regions/{region}/metadata.js`)
- **Purpose**: Regional settings within a country
- **Contains**: Regional categories, destination list, module overrides

### Destination Configuration (`ecosystems/{country}/regions/{region}/destinations/{dest}/config.js`)
- **Purpose**: Destination-specific branding and features
- **Contains**: Branding (colors, logos), domain, navigation, maps config, SEO

### Company Configuration (`companies/{country}/{region}/{destination}/{company}/config.js`)
- **Purpose**: Company-specific customizations
- **Contains**: Company branding overrides, contact info, team, catalog paths

## Configuration Source Abstraction

The `ConfigurationSource` abstract class defines the interface for loading configurations:

```javascript
class ConfigurationSource {
  async initialize(options) { ... }
  async loadPlatform() { ... }
  async loadCountry(countryCode) { ... }
  async loadRegion(countryCode, regionCode) { ... }
  async loadDestination(countryCode, regionCode, destinationCode) { ... }
  async loadCompany(countryCode, regionCode, destinationCode, companyCode) { ... }
  async loadExperience(experienceId) { ... }
  async loadModule(moduleId) { ... }
}
```

### FilesystemConfigurationSource

The `FilesystemConfigurationSource` loads configurations from the filesystem with:

- **Path traversal prevention**: All paths are validated against allowed roots
- **Caching**: Configs are cached after first load
- **ESM support**: Uses dynamic `import()` for `.js` files

#### Allowed Roots
- `ecosystems/` - Country, region, destination configs
- `companies/` - Company configs
- `config/` - Platform and experience configs

#### Path Structure

```
ecosystems/
  {country}/
    metadata.js              # Country config
    regions/
      {region}/
        metadata.js          # Region config
        destinations/
          {destination}/
            config.js         # Destination config

companies/
  {country}/
    {region}/
      {destination}/
        {company}/
          config.js           # Company config

config/
  platform/
    index.js                  # Platform defaults
  experiences/
    {experienceId}.js         # Experience config
  modules/
    {moduleId}.js            # Module config
```

## Configuration Merging

Configurations are merged using deep merge with array union:

- Objects are recursively merged
- Arrays are combined (union) rather than replaced
- Later levels override earlier levels

## Using ConfigurationLoader

```javascript
import { ConfigurationLoader } from './experience/loader/configuration.loader.js'

const loader = new ConfigurationLoader()
await loader.initialize({ useFilesystem: true })

const context = {
  country: 'cl',
  region: 'los-rios',
  destination: 'valdi',
  company: 'albasie'
}

const loaded = await loader.load(context)
// loaded contains merged config from all levels
```

## Validation

Configuration schemas are defined in `config/schemas/configuration.schemas.js`:

- `validatePlatformConfig(config)`
- `validateCountryConfig(config)`
- `validateRegionConfig(config)`
- `validateDestinationConfig(config)`
- `validateCompanyConfig(config)`

Use `validateConfigurationHierarchy(configs)` to validate the entire hierarchy.
