# Database Schema Reference

## Schema Registry

All schemas are defined in `database/schema/index.js` and organized into groups.

## Entity Schemas

### Platform Entities

#### tenant
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE, NOT NULL |
| domain | varchar(255) | |
| type | varchar(50) | platform, ecosystem, company |
| status | varchar(50) | active, inactive, suspended |
| metadata | jsonb | |
| config | jsonb | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

**Indexes:**
- `idx_tenant_slug` UNIQUE
- `idx_tenant_domain`
- `idx_tenant_status`

#### configuration
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, NOT NULL |
| tenant_id | uuid | FK → tenants.id |
| category | varchar(100) | platform, ecosystem, destination, company |
| key | varchar(255) | NOT NULL |
| value | jsonb | |
| version | integer | DEFAULT 1 |

**Indexes:**
- `idx_config_tenant_category_key` UNIQUE (tenant_id, category, key)

#### audit_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | |
| user_id | uuid | |
| action | varchar(100) | NOT NULL |
| entity_type | varchar(100) | |
| entity_id | uuid | |
| changes | jsonb | |
| ip_address | varchar(45) | |
| user_agent | text | |

**Indexes:**
- `idx_audit_tenant`
- `idx_audit_entity`
- `idx_audit_action`
- `idx_audit_created`

---

### Ecosystem Entities

#### country
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| code | varchar(2) | UNIQUE, NOT NULL (ISO 3166-1 alpha-2) |
| name | varchar(255) | NOT NULL |
| flag | varchar(10) | |
| currency | varchar(3) | |
| timezone | varchar(100) | |
| locale | varchar(10) | |
| metadata | jsonb | |

**Indexes:**
- `idx_country_code` UNIQUE

#### region
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| country_id | uuid | FK → countries.id, NOT NULL |
| code | varchar(50) | NOT NULL |
| name | varchar(255) | NOT NULL |
| coordinates | jsonb | { lat, lng } |
| bounding_box | jsonb | |

**Indexes:**
- `idx_region_country`
- `idx_region_code` UNIQUE (country_id, code)

#### destination
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| region_id | uuid | FK → regions.id |
| code | varchar(100) | NOT NULL |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE |
| domain | varchar(255) | |
| subdomain | varchar(100) | |
| description | text | |
| coordinates | jsonb | |
| branding | jsonb | { primary, secondary } |
| seo | jsonb | |
| maps | jsonb | |
| analytics | jsonb | |
| enabled_categories | jsonb | |
| enabled_modules | jsonb | |
| status | varchar(50) | |

**Indexes:**
- `idx_dest_region`
- `idx_dest_slug` UNIQUE
- `idx_dest_domain`

#### experience
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| destination_id | uuid | FK → destinations.id |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE |
| type | varchar(50) | tourism, commerce, government |
| navigation | jsonb | |
| layouts | jsonb | |
| workflows | jsonb | |
| permissions | jsonb | |
| i18n | jsonb | |
| status | varchar(50) | |

**Indexes:**
- `idx_exp_destination`
- `idx_exp_slug` UNIQUE

#### category
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| destination_id | uuid | FK → destinations.id |
| parent_id | uuid | FK → categories.id (self) |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE |
| type | varchar(50) | tourism, accommodation, restaurant |
| icon | varchar(100) | |
| sort_order | integer | DEFAULT 0 |
| status | varchar(50) | |

**Indexes:**
- `idx_cat_destination`
- `idx_cat_slug` UNIQUE

---

### Company Entities

#### business
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies.id |
| category_id | uuid | FK → categories.id |
| name | varchar(255) | NOT NULL |
| slug | varchar(100) | UNIQUE |
| type | varchar(100) | |
| description | text | |
| logo | varchar(500) | |
| cover_image | varchar(500) | |
| contact | jsonb | |
| location | jsonb | |
| hours | jsonb | |
| social | jsonb | |
| branding | jsonb | |
| settings | jsonb | |
| status | varchar(50) | |

**Indexes:**
- `idx_biz_company`
- `idx_biz_category`
- `idx_biz_slug` UNIQUE
- `idx_biz_status`

---

### Module Entities

#### reservation
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| business_id | uuid | FK → businesses.id |
| visitor_id | uuid | FK → visitors.id |
| service_id | uuid | |
| status | varchar(50) | NOT NULL |
| date | date | NOT NULL |
| time | time | |
| guests | integer | |
| notes | text | |
| customer | jsonb | |
| metadata | jsonb | |

**Indexes:**
- `idx_res_business`
- `idx_res_visitor`
- `idx_res_date`
- `idx_res_status`

#### payment
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| business_id | uuid | FK → businesses.id |
| reservation_id | uuid | FK → reservations.id |
| visitor_id | uuid | |
| amount | decimal | NOT NULL |
| currency | varchar(3) | NOT NULL |
| status | varchar(50) | NOT NULL |
| method | varchar(50) | |
| provider | varchar(50) | |
| provider_reference | varchar(255) | |
| metadata | jsonb | |

**Indexes:**
- `idx_pay_business`
- `idx_pay_reservation`
- `idx_pay_status`
- `idx_pay_provider_ref`

#### notification
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| recipient_id | uuid | NOT NULL |
| recipient_type | varchar(50) | visitor, business, admin |
| type | varchar(100) | NOT NULL |
| channel | varchar(50) | email, sms, push, whatsapp |
| status | varchar(50) | pending, sent, delivered, read, failed |
| subject | varchar(255) | |
| content | jsonb | |
| sent_at | timestamptz | |
| delivered_at | timestamptz | |
| read_at | timestamptz | |
| metadata | jsonb | |

**Indexes:**
- `idx_notif_recipient` (recipient_id, recipient_type)
- `idx_notif_type`
- `idx_notif_status`
- `idx_notif_created`
