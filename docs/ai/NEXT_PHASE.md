# NEXT_PHASE.md

> What comes next. **Platform v4.0 — PLATFORM CERTIFIED.**

---

## Current Status

**PLATFORM v4.0 — PLATFORM CERTIFIED**

- **Platform Version:** 4.0
- **Platform Status:** CERTIFIED
- **Product Development:** ACTIVE
- **Design Freeze:** ACTIVE (P13.8)
- **Architecture Score:** 98/100
- **API Layer:** CLOSED (P14.FINAL: 97/100)

**Decision:** Platform is certified. Product development is now active. P12.3.1 is the next product milestone.

---

## Priority 0: P13.6 — Payment Capability (COMPLETED)

**Status:** Completed (P13.6 — Payment Capability implementation)
- Payment capability implemented in `capabilities/payment/` (14 files)
- Architecture document: `docs/architecture/PAYMENT-CAPABILITY.md`
- Zero gateway knowledge (no Stripe, MercadoPago, Transbank)
- Registered in `capabilities/core/register.js`

## Priority 0: P13.7 — Business Payment Manager

**Why:** Continues the established orchestration pattern (P13.3 → P13.3.1, P13.4 → P13.4.1, P13.5 → P13.5.1). Business becomes the orchestration entry point for the payment lifecycle from the business perspective.

- Create `capabilities/business/manager/business-payment.manager.js` (orchestration only, zero imports from `capabilities/payment/*`)
- Add `BUSINESS_PAYMENT_EVENTS` to `business.events.js`
- Add payment search fields to `business.search.js`
- Wire cascade into BusinessManager archive/restore/delete
- Add delegate methods to BusinessService
- `BusinessPaymentManager` stub already reserved in `capabilities/business/manager/README.md`
- **Effort:** 1 phase

### P13.8 — Business Notification Manager
- Same pattern, reserved for `BusinessNotificationManager`
- **Effort:** 1 phase

---

## Priority 1: P12.3.x — Real Provider Connections

**Why:** The bootstrap pipeline exists and works. Now wire it to real infrastructure.

### P12.3.1 — Database Connection & Migration
- Configure real PostgreSQL connection string in `.env`
- Run `PostgresProvider` against real PG instance
- Execute `DrizzleMigrationRunner` to create schema
- Validate `RepositoryEngine` operations against real data
- **Effort:** 1-2 days

### P12.3.2 — Storage Provider (LocalFS)
- Implement `StorageRuntime` contract for local filesystem
- File upload/download/delete/list
- Media upload for Accommodation images
- Wire into bootstrap as `storage` provider slot
- **Effort:** 1 day

### P12.3.3 — Email Provider (SendGrid)
- Implement `MailRuntime` contract
- Dev: Mailtrap sandbox
- Prod: SendGrid API
- Confirmation email templates
- Wire into bootstrap as `mail` provider slot
- **Effort:** 1-2 days

### P12.3.4 — Payment Provider (Stripe)
- Implement `PaymentRuntime` contract
- Checkout session creation
- Charge + refund + webhook handling
- Wire into bootstrap as `payment` provider slot
- **Effort:** 3-5 days

### P12.3.5 — Persistent Auth Store
- Connect JWT identity store to PostgreSQL
- User CRUD via IdentityRepository
- Persistent sessions and refresh tokens
- Wire into JwtProvider via AuthRuntimeIntegration
- **Effort:** 2-3 days

---

## Priority 2: Event Wiring

**Why:** Events are defined but not wired to infrastructure. Core flows need automation.

### P12.3.6 — Event → CMS Sync Wiring
- Connect accommodation:created → SyncEngine push
- Connect accommodation:updated → SyncEngine push
- Connect content webhooks → SyncEngine pull
- **Effort:** 2 days

### P12.3.7 — Event → Email Wiring
- Connect reservation:created → email confirmation
- Connect reservation:cancelled → email notification
- **Effort:** 1 day

---

## Priority 3: MVP Accommodation Features

**Why:** Once infrastructure and event wiring are done, build the actual accommodation reservation product.

### P12.3.8 — Accommodation Management API
- CRUD for Accommodation entities
- Unit management (room types, inventory)
- Calendar and availability management
- Pricing and season configuration
- Media upload via Storage provider

### P12.3.9 — Reservation API
- Booking flow (check availability → create reservation → process payment → confirm)
- Status management (pending → confirmed → completed → cancelled)
- Owner approval workflow
- Cancellation with refund

### P12.3.10 — Owner Portal API
- Dashboard metrics
- Reservation management
- Availability calendar
- Payment history

### P12.3.11 — Visitor Experience API
- Search accommodations (PostgreSQL FTS)
- Detail page data (accommodation + CMS content)
- Reservation flow (dates → payment → confirmation)

---

## Priority 4: Testing Foundation

**Why:** Zero automated tests. Critical for production reliability.

### P12.3.12 — Testing Setup
- Set up Vitest
- Core unit tests for providers (database, auth, storage, email, payment)
- Repository integration tests (with real PG)
- API endpoint tests

### P15.2 — WordPress Deployment
- WordPress hosting setup
- Plugin deployment
- Theme deployment
- Content migration
- SEO preservation

---

## Priority 5: Missing Architecture Specs

**Why:** Some destination ecosystem layers need code implementation.

### P11.3.10 — Implement Ecology & Conservation Code
- Architecture spec exists (36KB, 18 sections)
- Need: Flora/fauna registry, citizen science, habitat monitoring
- Estimated: 10+ code files

### P11.3.11 — Implement Destination Data Foundation Code
- Architecture spec exists
- Need: Destination, Locality, Place, Experience, Business schemas and managers
- Estimated: 12+ code files

### P11.3.12 — Implement Economy & Partner Ecosystem Code
- Architecture spec exists (23KB, 16 sections)
- Need: Partner management, contextual discovery, eco economy
- Estimated: 10+ code files

### P11.3.13 — Implement Experience Journey Code
- Architecture spec exists (25KB, 16 sections)
- Need: Visitor evolution, PWA hierarchy, discovery flow, completion system
- Estimated: 12+ code files

---

## Priority 6: Developer Experience

**Why:** Improve development workflow and documentation.

### P16 — Documentation Site
- API documentation for all capabilities
- Architecture diagrams
- Developer guides
- Capability development tutorial
- Event reference
- Deployment guide

### P16.1 — Developer Tools
- CLI for capability scaffolding
- Event debugger
- Capability health checker
- Schema validator
- Migration tools

---

## Recommended Next Step

**Platform v4.0 — PLATFORM CERTIFIED.** P14 is CLOSED and Design Freeze protected.

**Next: P12.3.1 — Database Connection & Migration.** This is the single dependency that unblocks everything:
- Configure a real PostgreSQL connection string in `.env`
- Start the engine with `FEATURE_DATABASE=true` to wire PostgresProvider
- Run `DrizzleMigrationRunner` to create the initial schema
- Validate that `RepositoryEngine` operations work against real data
- Once database is live, storage, email, payment, and auth providers follow naturally

The API Layer is complete and frozen (P14). The bootstrap pipeline is fully implemented (P12.3.0). What remains is connecting to real infrastructure (P12.3.1).
