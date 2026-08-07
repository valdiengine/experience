# Database Schema Reference

> Valdi Platform v4.1 — P12.3.1 Database Connection & Migration
> Generated from actual Drizzle ORM schema definitions

---

## Entity Relationship Overview

```
Platform Hierarchy
├── PLATFORM LAYER (Order 1)
│   └── Multi-tenant infrastructure
│       ├── tenants (platform root tenant)
│       ├── countries (ISO 3166-1)
│       ├── regions (country subdivisions)
│       ├── destinations (tourism destinations)
│       ├── domains (DNS management)
│       ├── themes (visual customization)
│       └── languages (i18n)
│
├── ECOSYSTEM LAYER (Order 2)
│   └── Destination ecosystem
│       ├── ecosystems (experience ecosystem)
│       ├── categories (business categories)
│       ├── modules (feature modules)
│       └── experiences (experience configurations)
│
├── COMPANY LAYER (Order 3)
│   └── Business tenants
│       ├── companies (business entities)
│       ├── companyProfiles (business info)
│       ├── companyModules (module assignments)
│       └── companySettings (configuration)
│
├── IDENTITY LAYER (Order 4)
│   └── Authentication & authorization
│       ├── users (user accounts)
│       ├── roles (RBAC roles)
│       ├── permissions (granular permissions)
│       ├── userRoles (role assignments)
│       └── userSessions (active sessions)
│
└── BUSINESS LAYER (Order 5)
    └── Accommodation business
        ├── accommodations (properties)
        ├── accommodationUnits (room types)
        ├── availability (calendar data)
        ├── availabilityRules (booking rules)
        ├── reservations (bookings)
        ├── reservationActivities (audit trail)
        ├── payments (transactions)
        ├── invoices (billing)
        ├── reviews (guest reviews)
        ├── reviewHelpfulness (voting)
        ├── businessNotifications (notifications)
        └── notificationPreferences (user prefs)
```

---

## Migration Order

Schemas must be migrated in strict order to respect foreign key dependencies:

| Order | Layer | Tables |
|-------|-------|--------|
| 1 | Platform | tenants → countries → regions → destinations → domains → themes → languages |
| 2 | Ecosystem | ecosystems → categories → modules → experiences |
| 3 | Company | companies → companyProfiles → companyModules → companySettings |
| 4 | Identity | users → roles → permissions → userRoles → userSessions |
| 5 | Business | accommodations → accommodationUnits → availability → availabilityRules → reservations → reservationActivities → payments → invoices → reviews → reviewHelpfulness → businessNotifications → notificationPreferences |

---

## Table Ownership

### Platform Layer (L1)

#### `tenants`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'company' |
| status | varchar(50) | DEFAULT 'active' |
| domain | varchar(255) | |
| logo | varchar(500) | |
| config | jsonb | DEFAULT {} |
| plan | varchar(50) | DEFAULT 'free' |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() |
| updated_at | timestamptz | NOT NULL, DEFAULT NOW() |

**Indexes:** idx_tenant_slug (UNIQUE), idx_tenant_domain (UNIQUE), idx_tenant_type, idx_tenant_status

#### `countries`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| code | varchar(2) | UNIQUE, NOT NULL (ISO 3166-1 alpha-2) |
| name | varchar(255) | NOT NULL |
| currency | varchar(3) | |
| timezone | varchar(100) | |
| locale | varchar(10) | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_country_code (UNIQUE), idx_country_currency, idx_country_timezone

#### `regions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| country_id | uuid | FK → countries.id, NOT NULL |
| code | varchar(20) | NOT NULL |
| name | varchar(255) | NOT NULL |
| coordinates | jsonb | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_region_country_id, idx_region_code (composite), idx_region_sort_order

#### `destinations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| region_id | uuid | FK → regions.id, NOT NULL |
| code | varchar(50) | NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'tourism' |
| branding | jsonb | |
| seo | jsonb | |
| status | varchar(50) | DEFAULT 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_destination_slug (UNIQUE), idx_destination_region_id, idx_destination_type, idx_destination_status

#### `domains`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| destination_id | uuid | FK → destinations.id |
| tenant_id | uuid | FK → tenants.id |
| name | varchar(255) | NOT NULL |
| is_primary | boolean | DEFAULT false |
| is_verified | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_domain_name (UNIQUE), idx_domain_destination_id, idx_domain_tenant_id

#### `themes`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| destination_id | uuid | FK → destinations.id |
| tenant_id | uuid | FK → tenants.id |
| name | varchar(100) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| colors | jsonb | |
| typography | jsonb | |
| is_default | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_theme_slug (UNIQUE), idx_theme_destination_id, idx_theme_tenant_id, idx_theme_is_default

#### `languages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| code | varchar(10) | UNIQUE, NOT NULL |
| name | varchar(100) | NOT NULL |
| rtl | boolean | DEFAULT false |
| is_default | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_language_code (UNIQUE), idx_language_is_default

---

### Ecosystem Layer (L2)

#### `ecosystems`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| destination_id | uuid | FK → destinations.id, NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'tourism' |
| branding | jsonb | |
| features | jsonb | |
| status | varchar(50) | DEFAULT 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_ecosystem_slug (UNIQUE), idx_ecosystem_destination_id, idx_ecosystem_type

#### `categories`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| ecosystem_id | uuid | FK → ecosystems.id, NOT NULL |
| parent_id | uuid | self-referential |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'general' |
| icon | varchar(100) | |
| sort_order | integer | DEFAULT 0 |
| status | varchar(50) | DEFAULT 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_category_slug (UNIQUE), idx_category_ecosystem_id, idx_category_parent_id, idx_category_type

#### `modules`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| ecosystem_id | uuid | FK → ecosystems.id, NOT NULL |
| code | varchar(100) | NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'feature' |
| version | varchar(20) | DEFAULT '1.0.0' |
| configuration | jsonb | |
| capabilities | jsonb | |
| permissions | jsonb | |
| is_enabled | boolean | DEFAULT false |
| is_built_in | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_module_slug (UNIQUE), idx_module_code (composite), idx_module_ecosystem_id, idx_module_type

#### `experiences`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| ecosystem_id | uuid | FK → ecosystems.id, NOT NULL |
| category_id | uuid | FK → categories.id |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'tourism' |
| description | text | |
| navigation | jsonb | |
| layouts | jsonb | |
| workflows | jsonb | |
| i18n | jsonb | |
| status | varchar(50) | DEFAULT 'draft' |
| published_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_experience_slug (UNIQUE), idx_experience_ecosystem_id, idx_experience_category_id, idx_experience_status

---

### Company Layer (L3)

#### `companies`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| destination_id | uuid | FK → destinations.id |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'business' |
| status | varchar(50) | DEFAULT 'active' |
| logo | varchar(500) | |
| contact | jsonb | |
| location | jsonb | |
| branding | jsonb | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_company_slug (UNIQUE), idx_company_tenant_id, idx_company_destination_id, idx_company_type

#### `company_profiles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies.id, UNIQUE |
| bio | text | |
| story | text | |
| mission | text | |
| vision | text | |
| values | jsonb | |
| team | jsonb | |
| is_published | boolean | DEFAULT false |
| published_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `company_modules`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies.id, NOT NULL |
| module_code | varchar(100) | NOT NULL |
| module_name | varchar(255) | |
| status | varchar(50) | DEFAULT 'active' |
| configuration | jsonb | |
| is_enabled | boolean | DEFAULT false |
| enabled_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_company_module_company_module (UNIQUE), idx_company_module_status

#### `company_settings`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies.id, UNIQUE |
| timezone | varchar(100) | DEFAULT 'UTC' |
| locale | varchar(10) | DEFAULT 'en' |
| currency | varchar(3) | DEFAULT 'USD' |
| date_format | varchar(50) | DEFAULT 'YYYY-MM-DD' |
| time_format | varchar(20) | DEFAULT 'HH:mm' |
| business_rules | jsonb | |
| booking_rules | jsonb | |
| payment_settings | jsonb | |
| notification_settings | jsonb | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

---

### Identity Layer (L4)

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id |
| company_id | uuid | FK → companies.id |
| email | varchar(255) | NOT NULL, UNIQUE |
| username | varchar(100) | UNIQUE |
| password_hash | varchar(255) | |
| first_name | varchar(100) | |
| last_name | varchar(100) | |
| display_name | varchar(255) | |
| type | varchar(50) | DEFAULT 'user' |
| status | varchar(50) | DEFAULT 'active' |
| email_verified | boolean | DEFAULT false |
| phone | varchar(50) | |
| profile | jsonb | |
| preferences | jsonb | |
| mfa_enabled | boolean | DEFAULT false |
| last_login_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |

**Indexes:** idx_user_email (UNIQUE), idx_user_username (UNIQUE), idx_user_tenant_id, idx_user_company_id, idx_user_deleted_at

#### `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id |
| company_id | uuid | FK → companies.id |
| name | varchar(100) | NOT NULL |
| slug | varchar(100) | NOT NULL |
| type | varchar(50) | DEFAULT 'custom' |
| description | text | |
| permissions | jsonb | |
| is_system | boolean | DEFAULT false |
| is_default | boolean | DEFAULT false |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_role_tenant_company_slug (UNIQUE), idx_role_type, idx_role_is_system

#### `permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| name | varchar(100) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| resource | varchar(100) | NOT NULL |
| action | varchar(50) | NOT NULL |
| description | text | |
| attributes | jsonb | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_permission_slug (UNIQUE), idx_permission_resource_action (UNIQUE)

#### `user_roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users.id, NOT NULL |
| role_id | uuid | FK → roles.id, NOT NULL |
| tenant_id | uuid | FK → tenants.id |
| company_id | uuid | FK → companies.id |
| is_active | boolean | DEFAULT true |
| granted_by | uuid | FK → users.id |
| granted_at | timestamptz | NOT NULL |
| expires_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_user_role_user_role (UNIQUE), idx_user_role_user_id, idx_user_role_role_id

#### `user_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users.id, NOT NULL |
| token_hash | varchar(255) | NOT NULL |
| device_info | jsonb | |
| ip_address | varchar(45) | |
| type | varchar(50) | DEFAULT 'web' |
| status | varchar(50) | DEFAULT 'active' |
| expires_at | timestamptz | |
| last_activity_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_user_session_token_hash (UNIQUE), idx_user_session_user_id, idx_user_session_status

---

### Business Layer (L5)

#### `accommodations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| company_id | uuid | FK → companies.id, NOT NULL |
| category_id | uuid | FK → categories.id |
| owner_id | uuid | |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'hotel' |
| status | varchar(50) | DEFAULT 'draft' |
| description | text | |
| images | jsonb | |
| gallery | jsonb | |
| location | jsonb | |
| amenities | jsonb | |
| pricing | jsonb | |
| rating | decimal(3,2) | |
| review_count | integer | DEFAULT 0 |
| published_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |
| created_by | uuid | |
| updated_by | uuid | |

**Indexes:** idx_accommodation_slug (UNIQUE), idx_accommodation_tenant_id, idx_accommodation_company_id, idx_accommodation_status, idx_accommodation_deleted_at

#### `accommodation_units`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| accommodation_id | uuid | FK → accommodations.id, NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| type | varchar(50) | DEFAULT 'room' |
| max_guests | integer | DEFAULT 2 |
| bedrooms | integer | DEFAULT 1 |
| bathrooms | integer | DEFAULT 1 |
| beds | jsonb | |
| amenities | jsonb | |
| pricing | jsonb | |
| status | varchar(50) | DEFAULT 'active' |
| sort_order | integer | DEFAULT 0 |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_accommodation_unit_slug (UNIQUE), idx_accommodation_unit_accommodation_id

#### `availability`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| accommodation_id | uuid | FK → accommodations.id, NOT NULL |
| date | varchar(20) | NOT NULL |
| status | varchar(50) | DEFAULT 'available' |
| is_blocked | boolean | DEFAULT false |
| is_reserved | boolean | DEFAULT false |
| min_stay | integer | |
| max_stay | integer | |
| price | jsonb | |
| inventory | integer | DEFAULT 1 |
| reserved_count | integer | DEFAULT 0 |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_availability_accommodation_date (UNIQUE), idx_availability_tenant_id, idx_availability_status

#### `availability_rules`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| accommodation_id | uuid | FK → accommodations.id |
| name | varchar(255) | NOT NULL |
| type | varchar(50) | NOT NULL |
| config | jsonb | |
| priority | integer | DEFAULT 0 |
| start_date | varchar(20) | |
| end_date | varchar(20) | |
| days_of_week | jsonb | |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_availability_rule_tenant_id, idx_availability_rule_accommodation_id, idx_availability_rule_type

#### `reservations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| accommodation_id | uuid | FK → accommodations.id, NOT NULL |
| user_id | uuid | FK → users.id |
| visitor_id | uuid | |
| status | varchar(50) | NOT NULL, DEFAULT 'pending' |
| confirmation_code | varchar(50) | UNIQUE, NOT NULL |
| check_in_date | varchar(20) | NOT NULL |
| check_out_date | varchar(20) | NOT NULL |
| guest_count | integer | DEFAULT 1 |
| adults | integer | DEFAULT 1 |
| children | integer | DEFAULT 0 |
| subtotal | decimal(12,2) | |
| taxes | decimal(12,2) | |
| fees | decimal(12,2) | |
| discount | decimal(12,2) | |
| total_price | decimal(12,2) | |
| currency | varchar(3) | DEFAULT 'USD' |
| channel | varchar(50) | |
| customer | jsonb | |
| special_requests | text | |
| confirmed_at | timestamptz | |
| cancelled_at | timestamptz | |
| checked_in_at | timestamptz | |
| checked_out_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |

**Indexes:** idx_reservation_confirmation_code (UNIQUE), idx_reservation_tenant_id, idx_reservation_accommodation_id, idx_reservation_status, idx_reservation_check_in_date

#### `reservation_activities`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| reservation_id | uuid | FK → reservations.id, NOT NULL |
| activity_type | varchar(50) | NOT NULL |
| description | text | |
| actor_id | uuid | |
| actor_type | varchar(50) | |
| old_status | varchar(50) | |
| new_status | varchar(50) | |
| metadata | jsonb | |
| created_at | timestamptz | NOT NULL |

**Indexes:** idx_reservation_activity_reservation_id, idx_reservation_activity_type

#### `payments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| reservation_id | uuid | FK → reservations.id |
| user_id | uuid | FK → users.id |
| amount | decimal(12,2) | NOT NULL |
| currency | varchar(3) | NOT NULL |
| status | varchar(50) | NOT NULL, DEFAULT 'pending' |
| type | varchar(50) | DEFAULT 'payment' |
| method | varchar(50) | |
| provider | varchar(50) | |
| provider_reference | varchar(255) | UNIQUE |
| gateway_response | jsonb | |
| refunded_amount | decimal(12,2) | DEFAULT '0' |
| refunded_at | timestamptz | |
| processed_at | timestamptz | |
| failed_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |

**Indexes:** idx_payment_provider_reference (UNIQUE), idx_payment_tenant_id, idx_payment_reservation_id, idx_payment_status

#### `invoices`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| invoice_number | varchar(50) | UNIQUE, NOT NULL |
| reservation_id | uuid | FK → reservations.id |
| status | varchar(50) | DEFAULT 'draft' |
| issue_date | timestamptz | |
| due_date | timestamptz | |
| subtotal | decimal(12,2) | |
| tax | decimal(12,2) | |
| total | decimal(12,2) | |
| currency | varchar(3) | DEFAULT 'USD' |
| items | jsonb | |
| paid_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** idx_invoice_number (UNIQUE), idx_invoice_tenant_id, idx_invoice_status

#### `reviews`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id, NOT NULL |
| accommodation_id | uuid | FK → accommodations.id, NOT NULL |
| reservation_id | uuid | FK → reservations.id |
| user_id | uuid | FK → users.id |
| rating | decimal(3,2) | NOT NULL |
| title | varchar(255) | |
| content | text | |
| categories | jsonb | |
| pros | jsonb | |
| cons | jsonb | |
| images | jsonb | |
| status | varchar(50) | DEFAULT 'pending' |
| is_verified | boolean | DEFAULT false |
| is_featured | boolean | DEFAULT false |
| helpful_count | integer | DEFAULT 0 |
| response | jsonb | |
| published_at | timestamptz | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |

**Indexes:** idx_review_accommodation_id, idx_review_user_id, idx_review_status, idx_review_rating

#### `review_helpfulness`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| review_id | uuid | FK → reviews.id, NOT NULL |
| user_id | uuid | FK → users.id |
| is_helpful | boolean | NOT NULL |
| created_at | timestamptz | NOT NULL |

**Indexes:** idx_review_helpfulness_review_user (UNIQUE), idx_review_helpfulness_review_id

#### `business_notifications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants.id |
| user_id | uuid | FK → users.id |
| reservation_id | uuid | FK → reservations.id |
| recipient_id | uuid | |
| recipient_type | varchar(50) | |
| type | varchar(100) | NOT NULL |
| channel | varchar(50) | DEFAULT 'in_app' |
| priority | varchar(20) | DEFAULT 'normal' |
| subject | varchar(255) | |
| title | varchar(255) | |
| content | jsonb | |
| body | text | |
| status | varchar(50) | NOT NULL, DEFAULT 'pending' |
| scheduled_at | timestamptz | |
| sent_at | timestamptz | |
| delivered_at | timestamptz | |
| read_at | timestamptz | |
| failed_at | timestamptz | |
| retry_count | integer | DEFAULT 0 |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |
| deleted_at | timestamptz | |

**Indexes:** idx_business_notification_user_id, idx_business_notification_type, idx_business_notification_status, idx_business_notification_scheduled_at

#### `notification_preferences`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users.id, UNIQUE |
| email | boolean | DEFAULT true |
| sms | boolean | DEFAULT false |
| push | boolean | DEFAULT true |
| whatsapp | boolean | DEFAULT false |
| in_app | boolean | DEFAULT true |
| reservation_confirmations | boolean | DEFAULT true |
| reservation_reminders | boolean | DEFAULT true |
| reservation_cancellations | boolean | DEFAULT true |
| marketing | boolean | DEFAULT false |
| frequency | varchar(20) | DEFAULT 'instant' |
| quiet_hours_start | varchar(10) | |
| quiet_hours_end | varchar(10) | |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

---

## Future Extension Rules

1. **No direct table modifications** — All schema changes must go through architecture review
2. **Soft deletes preferred** — Use `deleted_at` column instead of hard deletes where appropriate
3. **JSONB for flexibility** — Use JSONB columns for extensible attributes rather than adding columns
4. **Tenant isolation** — Always include `tenant_id` foreign key for multi-tenant tables
5. **Audit trail** — Use `reservation_activities` pattern for important entity changes
6. **Migration order** — Respect the layer order when creating migrations

---

## File Structure

```
database/schema/
├── index.js              # Main exports and registry
├── platform/
│   └── index.js          # Platform layer schemas (L1)
├── ecosystem/
│   └── index.js          # Ecosystem layer schemas (L2)
├── company/
│   └── index.js          # Company layer schemas (L3)
├── identity/
│   └── index.js          # Identity layer schemas (L4)
└── business/
    └── index.js          # Business layer schemas (L5)
```
