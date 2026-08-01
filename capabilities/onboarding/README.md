# Onboarding Capability

Business Registration and SaaS Registration Layer for the multi-tenant platform.

## Structure

```
onboarding/
├── onboarding.capability.js   — Capability entry point
├── onboarding.manager.js      — Business registration and tenant creation
├── onboarding.schema.js       — Business profile and tenant config schemas
├── onboarding.events.js       — Event definitions
├── business.registry.js       — Business type registry
├── business.types.js          — Business type definitions
├── plans.js                   — SaaS plan definitions
└── README.md
```

## Business Types

| Type | Capabilities | Default Plan |
|------|-------------|--------------|
| Accommodation | cms, booking, availability, reservation, communication, notifications, pwa, intelligence | saas |
| Tourism | cms, booking, availability, reservation, communication, notifications, pwa, intelligence | saas |
| Restaurant | cms, booking, availability, communication, notifications, pwa | business |
| Service | cms, communication, pwa | business |
| Directory | cms, pwa | free |

## Plans

| Plan | Capabilities |
|------|-------------|
| Free | cms, pwa |
| Business | cms, communication, pwa |
| SaaS | cms, booking, availability, reservation, communication, notifications, pwa, intelligence, observability |

## Usage

```js
const onboarding = context.capabilities.get('onboarding')

// Register a business
const result = await onboarding.registerBusiness({
  name: 'Cabañas Patagonia',
  type: 'accommodation',
  plan: 'saas',
  ownerEmail: 'owner@example.com',
  ownerName: 'John Doe',
  location: { country: 'Argentina', region: 'Patagonia' },
})

// Get business profile
const business = onboarding.getBusiness('cabanas-patagonia')

// Update plan
onboarding.updatePlan('cabanas-patagonia', 'business')
```

## Rules

- Every company is a Tenant
- Business type determines default capabilities
- Plans only enable capabilities
- Onboarding never contains reservation logic
- TenantManager owns tenant resolution
- Capabilities remain independent
