# Admin Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** onboarding, reservation, availability, cms, seo-intelligence, pwa-engine, observability

## Purpose

Complete multi-tenant administration platform for managing tenants, users, roles, plans, capabilities, reservations, availability, content, SEO, PWA, and analytics.

## Architecture

```
admin.capability.js → AdminManager
                       ├── UserManager → RoleManager
                       ├── TenantDashboard → TenantSettings
                       ├── PlanManager → SubscriptionManager
                       ├── ReservationAdmin → ReservationCapability
                       ├── AvailabilityAdmin → AvailabilityCapability
                       ├── ContentAdmin → CMSCapability
                       ├── SEOAdmin → SEOIntelligenceCapability
                       ├── PWAAdmin → PWAEngineCapability
                       └── AnalyticsAdmin → ObservabilityCapability
```

## Modules

### UserManager
- User CRUD (create, read, update, delete)
- Role assignment (super_admin, tenant_owner, manager, staff, customer_support)
- Permission checking (18 permissions across 6 categories)
- Authentication (simplified)
- Tenant-scoped operations

### RoleManager
- 5 predefined roles with hierarchical levels
- Custom role creation
- Permission grouping by category
- Role comparison and management capabilities

### TenantDashboard
- Tenant overview (name, slug, status, plan, capabilities)
- Business profile
- Branding configuration
- Domain configuration
- PWA configuration
- Usage metrics

### TenantSettings
- Update branding (logo, favicon, colors, fonts)
- Update PWA configuration
- Enable/disable capabilities
- Change plans
- Update domain configuration
- Update business profile

### PlanManager
- 3 plans: Free, Business, SaaS
- Plan limits and features
- Capability access per plan
- Usage limit checking
- Plan comparison and recommendations

### SubscriptionManager
- Subscription tracking per tenant
- Usage tracking and limits
- Subscription status management
- Usage percentage calculation

### ReservationAdmin
- Reservation dashboard (pending, confirmed, cancelled, expired)
- Confirm, reject, cancel reservations
- Reservation search and filtering
- Statistics calculation

### AvailabilityAdmin
- Calendar view
- Block/open dates
- Availability requests
- Natural language response processing
- Availability statistics

### ContentAdmin
- Page management (get, update, publish, unpublish)
- Section management
- SEO metadata management
- Image management
- Publishing state tracking
- Content statistics

### SEOAdmin
- SEO dashboard with score, issues, opportunities, recommendations
- Page-level SEO analysis
- Content quality reports
- Metadata updates

### PWAAdmin
- PWA configuration management
- Installation statistics
- Push permission management
- Cache management
- Service worker updates

### AnalyticsAdmin
- Business metrics (reservations, conversion, occupancy, communication, retention)
- System metrics (health, performance, capabilities)
- Health status checks
- Alert management

## Events

| Event | Description |
|-------|-------------|
| `admin:user_created` | User created |
| `admin:user_updated` | User updated |
| `admin:tenant_updated` | Tenant updated |
| `admin:plan_changed` | Plan changed |
| `admin:capability_enabled` | Capability enabled |
| `admin:capability_disabled` | Capability disabled |
| `admin:reservation_confirmed` | Reservation confirmed |
| `admin:reservation_rejected` | Reservation rejected |

## Usage

```javascript
// Login
const user = admin.login('admin@example.com', 'tenant_123')

// Check permissions
admin.hasPermission('reservation.write') // true

// Get dashboard
const dashboard = await admin.getDashboard('tenant_123')

// Manage users
admin.createUser({ email: 'user@example.com', name: 'John', role: 'manager', tenantId: 'tenant_123' })

// Manage tenant
await admin.changePlan('tenant_123', 'saas')
await admin.enableCapability('tenant_123', 'seo-intelligence')

// Manage reservations
const reservations = await admin.getReservationDashboard('tenant_123')
await admin.confirmReservation('tenant_123', 'res_123')

// Get analytics
const analytics = await admin.getAnalyticsDashboard('tenant_123')
```
