# PRODUCT_DEVELOPMENT_GUIDE.md

> **Purpose:** Guide for transitioning from architecture work to product feature work.

---

## Overview

Valdi Platform Version 4.0 marks the official transition from **Platform Development** to **Product Development**.

**Platform Development:** Building the foundation (COMPLETE)
**Product Development:** Building features on the foundation (STARTING)

---

## From Architecture to Product

### What Changed

| Before (Architecture) | After (Product) |
|----------------------|-----------------|
| Building capabilities | Using capabilities |
| Implementing managers | Implementing features |
| Creating API structure | Consuming API |
| Defining patterns | Following patterns |
| Establishing architecture | Adding functionality |

### What Stays the Same

| Item | Status |
|------|--------|
| Architecture | FROZEN |
| API Layer | CLOSED |
| Design Freeze | ACTIVE |
| Guardian | BLOCKING violations |
| Entry Point | BusinessService ONLY |

---

## New Work Organization

### Feature Branch Structure

All new work should be organized in feature branches:

```bash
feature/authentication
feature/database
feature/payment-provider
feature/notification-provider
feature/flutter-app
feature/pwa
feature/search
feature/maps
feature/reviews
feature/admin
feature/notifications
feature/social-login
feature/analytics
```

### Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<name>` | `feature/authentication` |
| Bug Fix | `fix/<issue>` | `fix/password-reset` |
| Hotfix | `hotfix/<issue>` | `hotfix/security-patch` |
| Documentation | `docs/<name>` | `docs/api-guide` |

---

## Product Feature Development

### Development Pattern

```
1. Create feature branch from release/design-freeze-p13.8
2. Implement feature using existing architecture
3. Test locally
4. Submit PR for review
5. Merge after approval
```

### What You Can Do

| Category | Examples |
|---------|----------|
| **Authentication** | Social login, MFA, Password recovery, Session management |
| **Payments** | Stripe integration, Subscriptions, Refunds, Webhooks |
| **Notifications** | Email templates, Push notifications, SMS, In-app |
| **Search** | Full-text search, Filters, Geolocation, Autocomplete |
| **Maps** | Property locations, Directions, Area views |
| **Reviews** | Star ratings, Photo uploads, Moderation, Responses |
| **Admin** | User management, Analytics, Reports, Audit logs |
| **Flutter** | iOS app, Android app, Cross-platform UI |
| **PWA** | Offline support, Service workers, Push notifications |

### What You Cannot Do

| Prohibited | Reason |
|-----------|--------|
| Modify Business Aggregate | Design Freeze |
| Change BusinessService | Design Freeze |
| Alter Business Managers | Design Freeze |
| Modify Repository Engine | Design Freeze |
| Change Runtime Engine | Design Freeze |
| Add API endpoints | API Layer closed |
| Change capability boundaries | Design Freeze |
| Modify API Layer structure | Design Freeze |

---

## Architecture Changes

### When Architecture Changes Are Allowed

Architecture changes should be **extremely rare**. They require:

1. **Architecture Proposal** — Document the problem and solution
2. **Architecture Audit** — Guardian review of impact
3. **Design Freeze Approval** — Explicit permission

### Valid Reasons for Architecture Changes

| Reason | Example |
|---------|---------|
| Critical security issue | Authentication bypass vulnerability |
| Fundamental performance issue | Database query cannot be optimized |
| New business requirement | Regulatory compliance requiring changes |
| Limitation discovered | Core assumption proven incorrect |

### Invalid Reasons for Architecture Changes

| Reason | Why Not Valid |
|--------|--------------|
| Convenience | "It would be easier to..." |
| Preference | "I prefer a different pattern" |
| Speed | "This would be faster to implement" |
| Ignorance | "I didn't know it was frozen" |

---

## Using the Architecture

### API Integration

```javascript
// CORRECT — Use BusinessService
const service = capability?.service;
await service.createReservation(data, identity);

// INCORRECT — Direct capability access
const reservationService = capability.getReservationService();
```

### Repository Access

```javascript
// CORRECT — Through capability context
const repo = context.repositories.reservation;
await repo.findById(id);

// INCORRECT — Direct import
import { ReservationRepository } from '...';
```

### Event Communication

```javascript
// CORRECT — Through event bus
eventBus.emit('reservation:created', payload);

// INCORRECT — Direct capability import
import { ReservationCapability } from '...';
```

---

## Feature Development Examples

### Example: Adding Stripe Payment

```
feature/payment-provider/
├── stripe.client.js       # Stripe SDK wrapper
├── stripe.webhooks.js     # Webhook handlers
├── stripe.checkout.js     # Checkout session
├── stripe.refund.js       # Refund logic
├── tests/
│   ├── stripe.client.test.js
│   └── stripe.webhooks.test.js
└── README.md
```

### Example: Adding Email Notifications

```
feature/notification-provider/
├── email.service.js        # Email sending
├── email.templates.js     # Email templates
├── email.queue.js         # Queue processing
├── providers/
│   ├── sendgrid.js       # SendGrid integration
│   └── mailtrap.js        # Dev environment
├── tests/
└── README.md
```

### Example: Adding Flutter App

```
flutter/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── home/
│   │   ├── search/
│   │   ├── booking/
│   │   └── profile/
│   └── services/
│       ├── api.service.dart
│       └── auth.service.dart
├── ios/
├── android/
└── pubspec.yaml
```

---

## Testing

### Testing Strategy

| Level | What | When Ready |
|-------|------|------------|
| Unit | Individual functions | P12.3.12 |
| Integration | Repository operations | P12.3.1 |
| API | Endpoint functionality | NOW |
| E2E | Full flows | After P12.3 |

### Current Testing Status

| Type | Status | Notes |
|------|--------|-------|
| Smoke Tests | ✅ PASS | Runtime + API |
| Unit Tests | ❌ PENDING | P12.3.12 |
| Integration Tests | ❌ PENDING | P12.3.1 |

---

## Code Review Guidelines

### For Product Features

| Check | Requirement |
|------|------------|
| Business logic | Contained in feature module |
| API usage | Through BusinessService |
| No architecture changes | Uses existing patterns |
| Tests | Added for new functionality |
| Documentation | Updated for new features |

### For Architecture Changes

| Check | Requirement |
|------|------------|
| Proposal document | Created |
| Impact analysis | Completed |
| Design Freeze approval | Obtained |
| Migration plan | Documented |
| Rollback plan | Documented |

---

## Common Patterns

### Product Feature Pattern

```javascript
// features/example/feature.service.js
export class ExampleService {
  constructor(context) {
    this.capability = context.capabilities.get('business');
    this.repository = context.repositories.example;
  }

  async createFeature(data, identity) {
    // 1. Validate input
    // 2. Use BusinessService for operations
    // 3. Emit events for cross-cutting concerns
    // 4. Return result
  }
}
```

### Provider Implementation Pattern

```javascript
// providers/stripe/stripe.provider.js
export class StripeProvider {
  async initialize(config) {
    this.client = new Stripe(config.apiKey);
  }

  async createCheckoutSession(data) {
    return await this.client.checkout.sessions.create(data);
  }

  async processWebhook(payload) {
    // Handle Stripe webhook
  }
}
```

---

## Repository Structure

### Product Features

```
features/                    # NEW: Product features
├── authentication/          # Auth implementation
├── payment-provider/       # Stripe integration
├── notification-provider/  # Email/SMS integration
├── flutter-app/            # Mobile application
├── pwa/                   # Progressive web app
├── search/                 # Search implementation
├── maps/                   # Maps integration
├── reviews/                # Review system
└── admin/                 # Admin dashboard
```

### Existing Structure (Do Not Modify)

```
capabilities/               # Architecture (FROZEN)
runtime/                    # Runtime (FROZEN)
api/                        # API Layer (FROZEN)
persistence/                # Repository (FROZEN)
docs/                      # Documentation
```

---

## Next Steps

### Immediate (P12.3)

1. **P12.3.1** — Database Connection & Migration
2. **P12.3.2** — Storage Provider (LocalFS)
3. **P12.3.3** — Email Provider (SendGrid)
4. **P12.3.4** — Payment Provider (Stripe)
5. **P12.3.5** — Persistent Auth Store

### Short Term

1. Add automated tests (P12.3.12)
2. Implement Flutter app
3. Add search functionality
4. Implement maps integration

### Medium Term

1. Review and moderation system
2. Analytics dashboard
3. Social login
4. Multi-language support

---

## Resources

| Resource | Location |
|----------|----------|
| Architecture | `docs/architecture/` |
| API Documentation | `docs/architecture/API_LAYER.md` |
| Design Freeze | `docs/architecture/DESIGN_FREEZE.md` |
| Platform Certificate | `docs/architecture/PLATFORM_CERTIFICATE.md` |
| Product Mode | `docs/architecture/PRODUCT_MODE.md` |

---

## Summary

| Item | Status |
|------|--------|
| Platform Development | COMPLETE |
| Architecture | FROZEN |
| Product Development | STARTING |
| Architecture Changes | EXCEPTIONAL |
| Product Features | PRIORITY |

---

**Platform Status:** PRODUCT DEVELOPMENT MODE
**Transition Date:** 2026-08-02

