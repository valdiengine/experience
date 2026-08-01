# PROJECT-TEMPLATES.md — Valdi Project Templates

## Overview

Project templates compose capabilities, providers, configurations, and documentation into complete working projects. Each template is tailored for a specific use case.

## Template Philosophy

Templates do NOT copy code. They compose capabilities from the platform's capability registry. A tourism template isn't a different codebase — it's the same Valdi Engine with specific capabilities activated and configured.

## Available Templates

### 1. Tourism Destination
```bash
valdi new tourism
```
**Capabilities:** booking, availability, reservation, communication, engagement, intelligence, cms, pwa, public, seo-intelligence, community, exploration, ecology, economy, governance, operations, identity
**Providers:** json (default), wordpress (optional)
**Theme:** cinematic
**Use case:** Complete tourism destination platform

### 2. Municipality
```bash
valdi new municipality
```
**Capabilities:** cms, public, communication, notifications, governance, admin, observability
**Providers:** json
**Theme:** minimal
**Use case:** Government municipality website with services

### 3. Company
```bash
valdi new company
```
**Capabilities:** cms, public, communication, booking, notifications, seo-intelligence, pwa
**Providers:** json
**Theme:** corporate
**Use case:** Business website with booking capabilities

### 4. Region
```bash
valdi new region
```
**Capabilities:** All destination ecosystem capabilities + multi-destination support
**Providers:** json
**Theme:** cinematic
**Use case:** Regional tourism board managing multiple destinations

### 5. Single Destination
```bash
valdi new destination
```
**Capabilities:** booking, availability, reservation, communication, cms, public, community, exploration
**Providers:** json
**Theme:** nature
**Use case:** Individual hotel, resort, or attraction

### 6. Marine Tourism
```bash
valdi new marine
```
**Capabilities:** booking, availability, reservation, communication, exploration, ecology, cms, public, weather (custom)
**Providers:** json
**Theme:** ocean
**Use case:** Diving, snorkeling, whale watching, fishing

### 7. Adventure Tourism
```bash
valdi new adventure
```
**Capabilities:** booking, availability, reservation, communication, exploration, gamification, cms, public, sports (custom)
**Providers:** json
**Theme:** adventure
**Use case:** Hiking, climbing, rafting, zip-lining

### 8. Smart City
```bash
valdi new smartcity
```
**Capabilities:** cms, public, communication, notifications, governance, observability, intelligence, admin
**Providers:** json
**Theme:** tech
**Use case:** Smart city services platform

### 9. Education
```bash
valdi new education
```
**Capabilities:** cms, public, communication, notifications, community, admin
**Providers:** json
**Theme:** academic
**Use case:** Educational institution platform

### 10. Events
```bash
valdi new events
```
**Capabilities:** booking, availability, reservation, communication, cms, public, engagement, notifications
**Providers:** json
**Theme:** vibrant
**Use case:** Event management and ticketing

### 11. Marketplace
```bash
valdi new marketplace
```
**Capabilities:** booking, billing, saas, cms, public, communication, engagement, admin
**Providers:** json
**Theme:** commerce
**Use case:** Multi-vendor marketplace

### 12. Sport Community
```bash
valdi new sport
```
**Capabilities:** community, exploration, gamification, cms, public, communication, engagement
**Providers:** json
**Theme:** energetic
**Use case:** Sports club and community platform

### 13. Photography
```bash
valdi new photography
```
**Capabilities:** cms, public, gallery (custom), community, seo-intelligence, pwa
**Providers:** json
**Theme:** gallery
**Use case:** Photography portfolio and community

### 14. Camping
```bash
valdi new camping
```
**Capabilities:** booking, availability, reservation, communication, exploration, ecology, cms, public
**Providers:** json
**Theme:** nature
**Use case:** Campsite booking and outdoor activities

## Template Structure

Each template generates:

```
project-name/
  capabilities/          # Activated capabilities
  shared/                # Shared utilities
  engine/                # Engine core
  providers/             # Data providers
  src/                   # Application source
  docs/                  # Documentation
  public/                # Static assets
  .valdi/                # SDK configuration
  package.json           # Dependencies
  valdi.config.js        # Platform configuration
  README.md              # Project documentation
  .gitignore             # Git ignore rules
```

## Configuration File

```javascript
// valdi.config.js
export default {
  name: 'My Destination',
  id: 'my-destination',
  version: '1.0.0',
  template: 'tourism',
  theme: 'cinematic',
  locale: 'es-MX',
  capabilities: [
    'booking',
    'availability',
    'reservation',
    'communication',
    'cms',
    'public',
    'community',
    'exploration',
    'intelligence',
    'notifications',
    'pwa',
    'seo-intelligence'
  ],
  providers: {
    default: 'json',
    cms: 'wordpress'
  },
  tenant: {
    id: 'my-destination',
    name: 'My Destination',
    domain: 'mydestination.com'
  }
};
```

## Custom Templates

Create custom templates by placing them in `.valdi/templates/`:

```
.valdi/
  templates/
    my-template/
      template.json        # Template configuration
      capabilities/        # Custom capability configurations
      theme/               # Custom theme overrides
```

### template.json
```json
{
  "name": "my-template",
  "description": "Custom template for specific use case",
  "capabilities": ["booking", "cms", "public"],
  "theme": "cinematic",
  "providers": ["json"],
  "overrides": {
    "booking": {
      "version": "2.0.0",
      "customField": true
    }
  }
}
```
