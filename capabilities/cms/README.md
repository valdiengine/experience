## CMS Bridge Capability

Hybrid CMS bridge that connects WordPress content to the Engine.

### Structure

```
cms/
├── cms.capability.js      — Main capability (extends BaseCapability)
├── cms.schema.js          — Data schemas & validation
├── cms.events.js          — Event definitions
├── wordpress.provider.js  — WordPress REST API provider
├── cms.mapper.js          — Maps WordPress data to Engine format
└── README.md              — This file
```

### Architecture

```
WordPress REST API
    ↓
WordPressProvider (load, get, search, filter, cache)
    ↓
CMSMapper (mapPage, mapPost, mapMedia)
    ↓
CMSCapability (getAll, getById, getBySlug, search)
    ↓
DataManager (via context.dataManager)
```

### Configuration

```js
{
  cms: {
    wordpress: {
      baseUrl: 'https://example.com',
      apiPrefix: '/wp-json/wp/v2',
    }
  }
}
```

### Business-agnostic

- Only handles: pages, posts, media, metadata
- Does NOT know about: tourism, drones, restaurants, etc.
- Mapper transforms generic CMS content to Engine entities

### Future providers

- RESTProvider (custom backend)
- GraphQLProvider
- DatabaseProvider
