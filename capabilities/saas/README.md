# SaaS Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** none

## Purpose

SaaS Product & Subscription Architecture Layer — manages commercial products, plans, subscriptions, feature entitlements, capability access, usage limits, and upgrade paths.

## Architecture

```
saas.capability.js
├── ProductCatalog          → Commercial product registry
├── PlanManager             → Plan CRUD, assignment, comparison
├── SubscriptionManager     → Tenant subscription lifecycle
├── EntitlementManager      → Central access control
├── FeatureFlagManager      → Dynamic feature activation
├── LimitsManager           → Resource consumption control
└── UpgradeManager          → Growth detection, upgrade paths
```

## Product Categories

| Category | Description | Products |
|----------|-------------|----------|
| Digital Presence | Online visibility | Free Directory, Basic Business, Intermediate Business, Advanced Website, Premium Landing Page |
| Web Applications | Functional apps | Accommodation Web App |
| SaaS Platform | Full automation | Magnum SaaS |
| Ecosystem Partner | Partial participation | Accommodation Partner |

## Plans

### Free Directory
- Capabilities: cms, public, pwa
- Limits: 1 page, 10 images, 0 reservations, 0 notifications

### Basic Business
- Capabilities: cms, communication, public, pwa
- Limits: 5 pages, 50 images, 0 reservations, 50 notifications

### Intermediate Business
- Capabilities: cms, communication, seo-intelligence, public, pwa
- Limits: 15 pages, 200 images, 0 reservations, 100 notifications

### Advanced Website
- Capabilities: cms, public, seo-intelligence, communication, pwa
- Limits: 30 pages, 500 images, 0 reservations, 200 notifications

### Premium Landing Page
- Capabilities: cms, public, seo-intelligence, analytics, communication, pwa
- Limits: 10 pages, 300 images, 0 reservations, 150 notifications

### Accommodation Web App
- Capabilities: cms, communication, pwa, booking
- Limits: 20 pages, 500 images, 50 reservations, 200 notifications

### Magnum SaaS
- Capabilities: all 15 capabilities
- Limits: unlimited

### Accommodation Partner
- Capabilities: availability, communication, reservation, owner
- Limits: 30 reservations, 100 notifications

## Subscription Lifecycle

```
create(tenantId, productId, planId)
  → status: active

suspend(tenantId)
  → status: suspended

reactivate(tenantId)
  → status: active

cancel(tenantId)
  → status: cancelled

expire(tenantId) [automatic]
  → status: expired
```

## Entitlement Flow

```
Tenant
  ↓
Subscription (active plan)
  ↓
EntitlementManager
  ↓ canAccessCapability(tenantId, capability)
  ↓ hasFeature(tenantId, feature)
Capability Access (true/false)
```

## Feature Flags

| Flag | Default Free | Default Magnum |
|------|-------------|---------------|
| booking.enabled | false | true |
| reservation.enabled | false | true |
| notifications.enabled | false | true |
| pwa.enabled | true | true |
| seo.intelligence.enabled | false | true |
| owner.portal.enabled | false | true |
| automation.enabled | false | true |
| analytics.enabled | false | true |

## Usage

```javascript
const saas = context.capabilities.get('saas')

// Get product
const product = saas.getProduct('magnum_saas')

// Assign plan
saas.assignPlan('tenant_123', 'magnum_saas')

// Check access
saas.canAccessCapability('tenant_123', 'booking') // true
saas.hasFeature('tenant_123', 'booking.enabled') // true

// Check limits
const limit = saas.checkLimit('tenant_123', 'pages')
// { allowed: true, used: 5, max: -1, remaining: -1, unlimited: true }

// Increase usage
saas.increaseUsage('tenant_123', 'pages')

// Get upgrade recommendation
const upgrade = saas.recommendUpgrade('tenant_123')
// { currentPlanName, recommendedPlanName, reasons, additionalCapabilities }

// Analyze growth
const analysis = saas.analyzeGrowth('tenant_123')
// { planName, usage, bottlenecks, needsUpgrade, hasUpgradePath }
```
