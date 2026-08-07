# Valdi Platform Database Architecture — Entity Relationship Diagram

> **Version:** v4.1
> **Phase:** P12.3.1 — Database Connection & Migration
> **Type:** Design Validation (Before Migration)
> **Date:** 2026-08-06
> **Status:** ARCHITECTURE VALIDATED

---

## 1. Complete ERD Overview

### 1.1 Design Principle

```
Platform owns behavior.
Experience Engine composes experiences.
Products own identity.
Companies own content.
Users consume experiences.
```

The database schema reflects this hierarchy through foreign key relationships and ownership boundaries.

### 1.2 Entity Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: PLATFORM                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌────────┐            │
│  │ COUNTRY  │────▶│  REGION  │────▶│ DESTINATION  │────▶│ DOMAIN │            │
│  └──────────┘     └──────────┘     └──────────────┘     └────────┘            │
│       │                                       │                               │
│       │                                       │                               │
│       │                                       ▼                               │
│       │                              ┌──────────────┐     ┌──────────┐         │
│       └─────────────────────────────▶│    THEME     │◀────│ LANGUAGE │         │
│                                      └──────────────┘     └──────────┘         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 2: ECOSYSTEM                                     │
│  ┌───────────┐     ┌────────────┐     ┌─────────────┐     ┌────────────┐        │
│  │ ECOSYSTEM │────▶│  MODULE    │────▶│   CATEGORY  │────▶│ EXPERIENCE │        │
│  └───────────┘     └────────────┘     └─────────────┘     └────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 3: COMPANY                                      │
│  ┌───────────┐     ┌────────────────┐     ┌─────────────────┐                 │
│  │  COMPANY  │────▶│ COMPANY_PROFILE │     │ COMPANY_SETTING │                 │
│  └───────────┘     └────────────────┘     └─────────────────┘                 │
│       │                                                                    │
│       │               ┌─────────────────┐                                     │
│       └──────────────▶│  COMPANY_MODULE │                                     │
│                       └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 4: IDENTITY                                    │
│  ┌──────────┐     ┌──────────┐     ┌────────────────┐     ┌──────────┐        │
│  │   USER   │────▶│  SESSION │     │  USER_ROLE     │────▶│   ROLE   │        │
│  └──────────┘     └──────────┘     └────────────────┘     └──────────┘        │
│       │                                                               │        │
│       │             ┌──────────────┐                                  │        │
│       └────────────▶│  PERMISSION  │◀─────────────────────────────────┘        │
│                     └──────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 5: BUSINESS                                    │
│  ┌────────────────┐     ┌───────────────┐     ┌───────────────┐                 │
│  │ ACCOMMODATION  │────▶│   AVAILABLE  │     │   RESERVATION │                 │
│  └────────────────┘     └───────────────┘     └───────────────┘                 │
│       │                        │                      │                         │
│       │                        │                      │                         │
│       ▼                        ▼                      ▼                         │
│  ┌──────────────┐     ┌───────────────┐     ┌───────────────┐                 │
│  │ACCOMMODATION_│     │   PAYMENT     │     │    REVIEW     │                 │
│  │     UNIT     │     └───────────────┘     └───────────────┘                 │
│  └──────────────┘             │                                             │
│                                │                                             │
│                                ▼                                             │
│                         ┌───────────────┐     ┌───────────────┐                 │
│                         │   INVOICE    │     │ NOTIFICATION  │                 │
│                         └───────────────┘     └───────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity List

### 2.1 Layer 1 — Platform Entities

| Entity | Table Name | Description | Ownership |
|--------|------------|-------------|-----------|
| Country | `countries` | ISO 3166-1 country definitions | Platform |
| Region | `regions` | Country subdivisions (states, provinces) | Platform |
| Destination | `destinations` | Tourism destinations | Platform |
| Domain | `domains` | DNS domain management | Platform/Destination |
| Theme | `themes` | Visual customization | Destination |
| Language | `languages` | i18n support | Platform |

### 2.2 Layer 2 — Ecosystem Entities

| Entity | Table Name | Description | Ownership |
|--------|------------|-------------|-----------|
| Ecosystem | `ecosystems` | Experience ecosystem container | Destination |
| Module | `modules` | Feature modules (tourism, commerce, etc.) | Ecosystem |
| Category | `categories` | Business categories | Ecosystem |
| Experience | `experiences` | Experience configurations | Ecosystem |

### 2.3 Layer 3 — Company Entities

| Entity | Table Name | Description | Ownership |
|--------|------------|-------------|-----------|
| Company | `companies` | Business tenants | Destination |
| CompanyProfile | `company_profiles` | Business info (bio, story, mission) | Company |
| CompanyModule | `company_modules` | Module assignments | Company |
| CompanySetting | `company_settings` | Business configuration | Company |

### 2.4 Layer 4 — Identity Entities

| Entity | Table Name | Description | Ownership |
|--------|------------|-------------|-----------|
| User | `users` | User accounts | Tenant |
| Role | `roles` | RBAC roles | Tenant/Company |
| Permission | `permissions` | Granular permissions | Platform |
| UserRole | `user_roles` | Role assignments | User |
| UserSession | `user_sessions` | Active sessions | User |

### 2.5 Layer 5 — Business Entities

| Entity | Table Name | Description | Ownership |
|--------|------------|-------------|-----------|
| Accommodation | `accommodations` | Properties | Company |
| AccommodationUnit | `accommodation_units` | Room types | Accommodation |
| Availability | `availability` | Calendar data | Accommodation |
| AvailabilityRule | `availability_rules` | Booking rules | Accommodation |
| Reservation | `reservations` | Bookings | Company |
| ReservationActivity | `reservation_activities` | Audit trail | Reservation |
| Payment | `payments` | Transactions | Company |
| Invoice | `invoices` | Billing documents | Company |
| Review | `reviews` | Guest reviews | Company |
| ReviewHelpfulness | `review_helpfulness` | Helpful votes | Review |
| Notification | `business_notifications` | Notifications | Company/User |
| NotificationPreference | `notification_preferences` | User preferences | User |

---

## 3. Relationships

### 3.1 Platform Layer Relationships

```javascript
// Country → Region (one-to-many)
Country {
  id: uuid PK
  code: varchar(2) UNIQUE
  name: varchar
}
Region {
  id: uuid PK
  country_id: uuid FK → Country.id
  code: varchar
}
RELATIONSHIP: Country ||--o{ Region : "contains"

// Region → Destination (one-to-many)
Region ||--o{ Destination : "contains"

// Destination → Domain (one-to-many)
Destination ||--o{ Domain : "manages"

// Destination → Theme (one-to-many)
Destination ||--o{ Theme : "defines"

// Theme → Language (many-to-many via platform)
// Languages are shared across themes
```

### 3.2 Ecosystem Layer Relationships

```javascript
// Destination → Ecosystem (one-to-many)
Destination ||--o{ Ecosystem : "hosts"

// Ecosystem → Module (one-to-many)
Ecosystem ||--o{ Module : "contains"

// Ecosystem → Category (one-to-many, self-referential)
Ecosystem ||--o{ Category : "classifies"
Category }o--|| Category : "parent of"

// Ecosystem → Experience (one-to-many)
Ecosystem ||--o{ Experience : "composes"

// Category → Experience (one-to-many)
Category ||--o{ Experience : "categorizes"
```

### 3.3 Company Layer Relationships

```javascript
// Destination → Company (one-to-many)
Destination ||--o{ Company : "hosts"

// Company → CompanyProfile (one-to-one)
Company ||--|| CompanyProfile : "has"

// Company → CompanySetting (one-to-one)
Company ||--|| CompanySetting : "configures"

// Company → CompanyModule (one-to-many)
Company ||--o{ CompanyModule : "enables"

// Module → CompanyModule (one-to-many)
Module ||--o{ CompanyModule : "assigned to"
```

### 3.4 Identity Layer Relationships

```javascript
// Tenant → User (one-to-many)
Tenant ||--o{ User : "contains"

// Company → User (one-to-many)
Company ||--o{ User : "employs"

// User → UserRole (one-to-many)
User ||--o{ UserRole : "has"

// Role → UserRole (one-to-many)
Role ||--o{ UserRole : "assigned to"

// User → UserSession (one-to-many)
User ||--o{ UserSession : "maintains"

// Permission → Role (many-to-many via permissions JSONB)
// Permissions are stored as JSONB array in roles table
```

### 3.5 Business Layer Relationships

```javascript
// Company → Accommodation (one-to-many)
Company ||--o{ Accommodation : "owns"

// Accommodation → AccommodationUnit (one-to-many)
Accommodation ||--o{ AccommodationUnit : "contains"

// Accommodation → Availability (one-to-many)
Accommodation ||--o{ Availability : "defines"

// Accommodation → AvailabilityRule (one-to-many)
Accommodation ||--o{ AvailabilityRule : "configures"

// Accommodation → Review (one-to-many)
Accommodation ||--o{ Review : "receives"

// Company → Reservation (one-to-many)
Company ||--o{ Reservation : "manages"

// Accommodation → Reservation (one-to-many)
Accommodation ||--o{ Reservation : "books"

// User → Reservation (one-to-many, optional)
User ||--o{ Reservation : "creates"

// Reservation → ReservationActivity (one-to-many)
Reservation ||--o{ ReservationActivity : "tracks"

// Company → Payment (one-to-many)
Company ||--o{ Payment : "processes"

// Reservation → Payment (one-to-many)
Reservation ||--o{ Payment : "collects"

// Company → Invoice (one-to-many)
Company ||--o{ Invoice : "issues"

// User → Review (one-to-many)
User ||--o{ Review : "writes"

// User → Notification (one-to-many)
User ||--o{ Notification : "receives"

// Company → Notification (one-to-many)
Company ||--o{ Notification : "sends"
```

---

## 4. Ownership Boundaries

### 4.1 Platform Ownership (Layer 1)

```
Platform owns:
├── countries (ISO 3166-1 standard data)
├── regions (country subdivisions)
├── destinations (tourism destinations)
├── domains (DNS configuration)
├── themes (visual themes)
└── languages (i18n)
```

**Boundary:** Platform-level entities are shared across all tenants and are never tenant-isolated.

### 4.2 Ecosystem Ownership (Layer 2)

```
Ecosystem owns:
├── ecosystems (experience containers)
├── modules (feature definitions)
├── categories (classification)
└── experiences (configurations)
```

**Boundary:** Ecosystem entities belong to a Destination and inherit its configuration.

### 4.3 Company Ownership (Layer 3)

```
Company owns:
├── companies (business tenants)
├── company_profiles (business info)
├── company_settings (configuration)
└── company_modules (enabled features)
```

**Boundary:** Company entities belong to a Destination but are tenant-isolated.

### 4.4 Identity Ownership (Layer 4)

```
Identity owns:
├── users (accounts)
├── roles (RBAC)
├── permissions (granular)
├── user_roles (assignments)
└── user_sessions (sessions)
```

**Boundary:** Identity entities can span Tenant and/or Company scope.

### 4.5 Business Ownership (Layer 5)

```
Business owns:
├── accommodations (properties)
├── accommodation_units (rooms)
├── availability (calendar)
├── availability_rules (rules)
├── reservations (bookings)
├── reservation_activities (audit)
├── payments (transactions)
├── invoices (billing)
├── reviews (feedback)
├── review_helpfulness (voting)
├── notifications (messages)
└── notification_preferences (settings)
```

**Boundary:** Business entities belong to Company and are tenant-isolated.

---

## 5. Foreign Key Strategy

### 5.1 Foreign Key Rules

| Rule | Application |
|------|-------------|
| `ON DELETE RESTRICT` | Prevent deletion of parent when children exist |
| `ON DELETE CASCADE` | Delete children when parent is deleted |
| `ON DELETE SET NULL` | Set FK to NULL when parent is deleted |
| `ON DELETE SET DEFAULT` | Set FK to default when parent is deleted |

### 5.2 Foreign Key Matrix

| Child Table | Parent Table | FK Column | Delete Rule | Notes |
|-------------|--------------|-----------|-------------|-------|
| regions | countries | country_id | RESTRICT | Prevent orphan regions |
| destinations | regions | region_id | RESTRICT | Prevent orphan destinations |
| domains | destinations | destination_id | CASCADE | Domains die with destination |
| domains | tenants | tenant_id | CASCADE | Domains die with tenant |
| themes | destinations | destination_id | CASCADE | Themes die with destination |
| themes | tenants | tenant_id | CASCADE | Themes die with tenant |
| ecosystems | destinations | destination_id | CASCADE | Ecosystems die with destination |
| categories | ecosystems | ecosystem_id | CASCADE | Categories die with ecosystem |
| categories | categories | parent_id | SET NULL | Parent category deletion |
| modules | ecosystems | ecosystem_id | CASCADE | Modules die with ecosystem |
| experiences | ecosystems | ecosystem_id | CASCADE | Experiences die with ecosystem |
| experiences | categories | category_id | SET NULL | Category deletion |
| companies | tenants | tenant_id | CASCADE | Companies die with tenant |
| companies | destinations | destination_id | SET NULL | Destination optional |
| company_profiles | companies | company_id | CASCADE | Profiles die with company |
| company_settings | companies | company_id | CASCADE | Settings die with company |
| company_modules | companies | company_id | CASCADE | Module assignments die |
| users | tenants | tenant_id | SET NULL | User kept on tenant deletion |
| users | companies | company_id | SET NULL | User kept on company deletion |
| user_roles | users | user_id | CASCADE | Roles revoked on user delete |
| user_roles | roles | role_id | CASCADE | User loses role on delete |
| user_sessions | users | user_id | CASCADE | Sessions die with user |
| accommodations | tenants | tenant_id | RESTRICT | Prevent orphan accommodations |
| accommodations | companies | company_id | CASCADE | Accommodations die with company |
| accommodations | categories | category_id | SET NULL | Category deletion |
| accommodation_units | accommodations | accommodation_id | CASCADE | Units die with accommodation |
| availability | tenants | tenant_id | RESTRICT | Prevent orphan availability |
| availability | accommodations | accommodation_id | CASCADE | Availability dies with accommodation |
| availability_rules | tenants | tenant_id | RESTRICT | Prevent orphan rules |
| availability_rules | accommodations | accommodation_id | CASCADE | Rules die with accommodation |
| reservations | tenants | tenant_id | RESTRICT | Prevent orphan reservations |
| reservations | accommodations | accommodation_id | RESTRICT | Prevent orphan reservations |
| reservations | users | user_id | SET NULL | User kept on deletion |
| reservation_activities | reservations | reservation_id | CASCADE | Activities die with reservation |
| payments | tenants | tenant_id | RESTRICT | Prevent orphan payments |
| payments | reservations | reservation_id | SET NULL | Payment record kept |
| payments | users | user_id | SET NULL | User kept on deletion |
| invoices | tenants | tenant_id | RESTRICT | Prevent orphan invoices |
| invoices | reservations | reservation_id | SET NULL | Invoice record kept |
| reviews | tenants | tenant_id | RESTRICT | Prevent orphan reviews |
| reviews | accommodations | accommodation_id | CASCADE | Reviews die with accommodation |
| reviews | reservations | reservation_id | SET NULL | Review record kept |
| reviews | users | user_id | SET NULL | User kept on deletion |
| review_helpfulness | reviews | review_id | CASCADE | Votes die with review |
| review_helpfulness | users | user_id | SET NULL | User kept on deletion |
| notifications | tenants | tenant_id | SET NULL | Notification kept |
| notifications | users | user_id | SET NULL | Notification kept |
| notifications | reservations | reservation_id | SET NULL | Notification kept |
| notification_preferences | users | user_id | CASCADE | Preferences die with user |

---

## 6. Tenant Isolation Strategy

### 6.1 Multi-Tenancy Model

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM (shared)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │Tenant 1 │  │Tenant 2 │  │Tenant 3 │  │Tenant N │      │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
│       │            │            │            │              │
│       ▼            ▼            ▼            ▼              │
│  ┌─────────────────────────────────────────────────┐       │
│  │              TENANT-ISOLATED DATA               │       │
│  │  companies, users, accommodations, reservations  │       │
│  │  payments, reviews, notifications               │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Tenant Isolation Rules

| Entity Type | Tenant Isolation | Notes |
|-------------|-----------------|-------|
| Platform entities | NONE | Shared across all tenants |
| Ecosystem entities | BY DESTINATION | Inherited from destination |
| Company entities | BY TENANT | Strict tenant isolation |
| Identity entities | BY TENANT/COMPANY | Dual scope support |
| Business entities | BY TENANT | Strict tenant isolation |

### 6.3 Tenant ID Columns

```javascript
// Tenant-isolated tables MUST have tenant_id
const TENANT_ISOLATED_TABLES = [
  'companies',
  'users',           // tenant_id + company_id
  'user_roles',      // tenant_id + company_id
  'accommodations',
  'accommodation_units',
  'availability',
  'availability_rules',
  'reservations',
  'reservation_activities',
  'payments',
  'invoices',
  'reviews',
  'business_notifications',
]

// NOT tenant-isolated (platform-shared)
const PLATFORM_TABLES = [
  'countries',
  'regions',
  'destinations',
  'domains',
  'themes',
  'languages',
  'ecosystems',
  'modules',
  'categories',
  'experiences',
  'roles',
  'permissions',
]
```

### 6.4 Query Isolation Pattern

```javascript
// All tenant-isolated queries MUST include tenant_id
async function findReservations(tenantId, filters) {
  return db.query.reservations.findMany({
    where: and(
      eq(reservations.tenantId, tenantId),  // MANDATORY
      filters.status ? eq(reservations.status, filters.status) : undefined,
    ),
  })
}

// Cross-tenant queries are forbidden for business data
```

---

## 7. Configuration Inheritance Model

### 7.1 Inheritance Hierarchy

```
PLATFORM CONFIG
    │
    ├── Default timezone: UTC
    ├── Default locale: en
    ├── Default currency: USD
    │
    ▼
DESTINATION CONFIG
    │
    ├── Inherits platform defaults
    ├── Overrides with destination-specific
    ├── timezone: Europe/Madrid (for Spain)
    ├── locale: es-ES
    ├── currency: EUR
    │
    ▼
COMPANY CONFIG
    │
    ├── Inherits destination config
    ├── Overrides with company-specific
    ├── timezone: Europe/Madrid
    ├── locale: es
    ├── currency: EUR
    │
    ▼
USER PREFERENCES
    │
    ├── Inherits company config
    ├── Overrides with user preference
    ├── timezone: Europe/Paris (user preference)
```

### 7.2 Configuration Storage

```javascript
// company_settings stores effective configuration
{
  timezone: 'Europe/Madrid',      // Inherited + overridden
  locale: 'es',                  // Inherited + overridden
  currency: 'EUR',               // Inherited + overridden
  date_format: 'DD/MM/YYYY',     // Company-specific
  time_format: 'HH:mm',          // Company-specific
  business_rules: {},             // Company-specific
  booking_rules: {},              // Company-specific
}

// User preferences override company settings
{
  timezone: 'Europe/Paris',       // User override
  locale: 'fr',                   // User override
}
```

---

## 8. Experience Engine Data Flow

### 8.1 Configuration → Rendering Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPERIENCE ENGINE FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐
  │    CODE     │
  │   (git)     │
  └──────┬──────┘
         │ deploy
         ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   EXPERIENCE │────▶│   MODULES   │────▶│ CAPABILITIES │
  │  (database)  │     │ (database)  │     │ (code)       │
  └─────────────┘     └─────────────┘     └─────────────┘
         │                                       │
         │ config                                │ implements
         ▼                                       ▼
  ┌─────────────┐                       ┌─────────────┐
  │  RESOLVER   │──────────────────────▶│  RENDERING  │
  │ (database)  │       data           │   (PWA)     │
  └─────────────┘                       └─────────────┘
```

### 8.2 Experience Configuration Entity

```javascript
Experience {
  id: uuid
  ecosystem_id: uuid FK
  category_id: uuid FK (optional)
  name: varchar
  slug: varchar UNIQUE
  type: enum('tourism', 'commerce', 'gastronomy', 'services', ...)

  // Configuration-driven fields
  navigation: jsonb      // Menu structure
  layouts: jsonb         // Page layouts
  workflows: jsonb       // Business workflows
  permissions: jsonb      // Access control
  i18n: jsonb           // Translations

  // Status
  status: enum('draft', 'active', 'archived')
  published_at: timestamptz

  // Relationships
  ecosystem: belongsTo
  category: belongsTo
}
```

### 8.3 Module Definition Entity

```javascript
Module {
  id: uuid
  ecosystem_id: uuid FK
  code: varchar           // 'tourism', 'commerce', 'gastronomy'
  name: varchar
  slug: varchar UNIQUE

  // Module definition
  type: enum('feature', 'integration', 'addon')
  version: varchar       // '1.0.0'

  // Module capabilities
  capabilities: jsonb     // ['availability', 'reservation', 'payment']
  permissions: jsonb     // Module-specific permissions
  dependencies: jsonb     // Required modules

  // Module configuration
  configuration: jsonb   // Default config
  settings: jsonb         // Runtime settings

  // Status
  is_enabled: boolean
  is_built_in: boolean
}
```

### 8.4 Ecosystem Container Entity

```javascript
Ecosystem {
  id: uuid
  destination_id: uuid FK
  name: varchar
  slug: varchar UNIQUE

  // Ecosystem type determines available modules
  type: enum('tourism', 'commerce', 'gastronomy', 'services', ...)

  // Branding
  branding: jsonb        // Colors, logos

  // Features
  features: jsonb        // Enabled features

  // Relationships
  destination: belongsTo
  modules: hasMany
  categories: hasMany
  experiences: hasMany
}
```

### 8.5 Configuration-Driven Entities

The following entities are **configuration-driven** (data in database, logic in code):

| Entity | Config Field | Drives |
|--------|-------------|--------|
| Experience | `navigation` | Menu structure |
| Experience | `layouts` | Page composition |
| Experience | `workflows` | Business flow |
| Experience | `i18n` | Translations |
| Module | `capabilities` | Feature availability |
| Module | `permissions` | Access control |
| Ecosystem | `features` | Enabled features |
| Company | `branding` | Visual identity |

---

## 9. Migration Dependency Order

### 9.1 Layer-by-Layer Migration

Migrations MUST execute in strict layer order to respect foreign key dependencies:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MIGRATION ORDER                              │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: LAYER 1 — PLATFORM
  1.1 tenants
  1.2 countries
  1.3 regions
  1.4 destinations
  1.5 domains
  1.6 themes
  1.7 languages

STEP 2: LAYER 2 — ECOSYSTEM
  2.1 ecosystems
  2.2 modules
  2.3 categories
  2.4 experiences

STEP 3: LAYER 3 — COMPANY
  3.1 companies
  3.2 company_profiles
  3.3 company_settings
  3.4 company_modules

STEP 4: LAYER 4 — IDENTITY
  4.1 users
  4.2 roles
  4.3 permissions
  4.4 user_roles
  4.5 user_sessions

STEP 5: LAYER 5 — BUSINESS
  5.1 accommodations
  5.2 accommodation_units
  5.3 availability
  5.4 availability_rules
  5.5 reservations
  5.6 reservation_activities
  5.7 payments
  5.8 invoices
  5.9 reviews
  5.10 review_helpfulness
  5.11 business_notifications
  5.12 notification_preferences
```

### 9.2 Migration Dependencies Graph

```
tenants ──────────┬──────────────────────────────────────────────────┐
                  │                                                     │
                  ▼                                                     │
countries ────▶ regions ────▶ destinations ────▶ domains                 │
                                      │                                │
                                      │         ▼                       │
                                      ├────────▶ themes                │
                                      │                                │
                                      │         ▼                       │
                                      └────────▶ languages             │
                                                                     │
                        ┌─────────────────────────────────────────────┘
                        │
                        ▼
                   ecosystems ────▶ modules ────▶ categories ────▶ experiences
                                                                     │
                        ┌─────────────────────────────────────────────┘
                        │
                        ▼
                   companies ────▶ company_profiles
                        │                    │
                        │                    └───▶ company_settings
                        │
                        └──────────────────▶ company_modules
                                                  │
                                                  ▼
                                             users
                                                  │
                            ┌─────────────────────┼─────────────────────┐
                            │                     │                     │
                            ▼                     ▼                     ▼
                        roles               permissions            user_roles
                                                                          │
                            ┌─────────────────────────────────────────────┘
                            │
                            ▼
                      user_sessions
                            │
┌─────────────────────────────────────────────────────────────────────┐
                            │
                            ▼
                     accommodations ────▶ accommodation_units
                            │
                            ▼
                       availability
                            │
                            ▼
                    availability_rules
                            │
                            ▼
                      reservations ────▶ reservation_activities
                            │
                            ▼
                        payments ────▶ invoices
                            │
                            ▼
                       reviews ────▶ review_helpfulness
                            │
                            ▼
                    business_notifications
                            │
                            ▼
              notification_preferences
```

---

## 10. Future Scalability Considerations

### 10.1 Adding New Destinations

```javascript
// No code changes required
// Just insert new destination data
await db.insert(destinations).values({
  region_id: existingRegionId,
  code: 'CHILOE',
  name: 'Chiloé',
  slug: 'chiloe',
  type: 'tourism',
})
```

### 10.2 Adding New Countries

```javascript
// No schema migration required
// Just insert new country data
await db.insert(countries).values({
  code: 'CL',
  name: 'Chile',
  timezone: 'America/Santiago',
  locale: 'es-CL',
  currency: 'CLP',
})
```

### 10.3 Adding New Module Types

```javascript
// No schema migration required
// Modules are defined in code but configured in database
await db.insert(modules).values({
  ecosystem_id: existingEcosystemId,
  code: 'REAL_ESTATE',
  name: 'Real Estate',
  type: 'feature',
  capabilities: ['listings', 'visits', 'mortgage_calc'],
})
```

### 10.4 Schema Extension Points

| Extension Point | Method | Example |
|-----------------|--------|---------|
| Entity attributes | JSONB columns | `accommodations.metadata` |
| Module config | JSONB columns | `modules.configuration` |
| Business rules | JSONB columns | `company_settings.booking_rules` |
| Custom fields | JSONB columns | `users.profile.custom` |
| Settings | JSONB columns | `destinations.settings` |

### 10.5 Partitioning Strategy (Future)

For high-volume tables, consider:

```javascript
// availability - partition by date range
CREATE TABLE availability (
  ...
) PARTITION BY RANGE (date);

// reservations - partition by month
CREATE TABLE reservations (
  ...
) PARTITION BY RANGE (check_in_date);
```

---

## 11. Validation Checklist

| Check | Status |
|-------|--------|
| Matches PLATFORM_MANIFEST.md | ✓ VALIDATED |
| Matches VALDI_PLATFORM_VISION.md | ✓ VALIDATED |
| Matches MULTI_ECOSYSTEM_ARCHITECTURE.md | ✓ VALIDATED |
| Matches PLATFORM_FREEZES.md | ✓ VALIDATED |
| P13.8 Platform Core Freeze respected | ✓ NOT VIOLATED |
| P15.0 Platform Vision Freeze respected | ✓ NOT VIOLATED |
| Repository boundary preserved | ✓ PRESERVED |
| BusinessService persistence independent | ✓ INDEPENDENT |
| Multi-tenancy supported | ✓ SUPPORTED |
| Multi-destination supported | ✓ SUPPORTED |
| Experience Engine integration | ✓ DESIGNED |
| Foreign key strategy defined | ✓ DEFINED |
| Migration order defined | ✓ DEFINED |

---

## 12. Final Verdict

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                     DATABASE ARCHITECTURE VALIDATION                       ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                     │  ║
║  │  DATABASE ARCHITECTURE:                                            │  ║
║  │                                                                     │  ║
║  │       ██  ██████   ██████  ███████  ██████  ██    ██  ██████      │  ║
║  │       ██  ██   ██ ██       ██      ██    ██ ██    ██ ██   ██     │  ║
║  │       ██  ██████  ██   ███ █████   ██    ██  ██  ██  ██████      │  ║
║  │       ██  ██   ██ ██    ██ ██      ██    ██   ████   ██         │  ║
║  │       ██  ██████   ██████  ███████  ██████     ██    ██         │  ║
║  │                                                                     │  ║
║  │                           PASS ✓                                    │  ║
║  │                                                                     │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                     │  ║
║  │  ERD DESIGN:                                                        │  ║
║  │                                                                     │  ║
║  │       ███████╗ ██████╗ ██████╗  ██████╗                           │  ║
║  │       ██     ██╔═══██╗██╔════╝ ██╔════╝                           │  ║
║  │       ███████║║   ██║██║  ███╗██║                                 │  ║
║  │       ██     ║║   ██║██║   ██║██║                                 │  ║
║  │       ██     ║╚██████╔╝╚██████╔╝╚██████╗                          │  ║
║  │       ╚═     ║ ╚═════╝  ╚═════╝  ╚═════╝                          │  ║
║  │                                                                     │  ║
║  │                         APPROVED ✓                                  │  ║
║  │                                                                     │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                     │  ║
║  │  READY FOR:                                                        │  ║
║  │                                                                     │  ║
║  │     P12.3.1 Step 2 — Drizzle Schema Implementation                 │  ║
║  │                                                                     │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```
