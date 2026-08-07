# Valdi Platform Database ERD — Mermaid Diagram

> **Version:** v4.1
> **Phase:** P12.3.1 — Database Connection & Migration
> **Type:** Entity Relationship Diagram (Visual)
> **Date:** 2026-08-06

---

## How to View

Copy the code blocks below into any Mermaid-compatible viewer:
- [Mermaid Live Editor](https://mermaid.live)
- VS Code with Mermaid extension
- GitHub/GitLab Markdown preview
- Notion, Obsidian, etc.

---

## LAYER 1: PLATFORM

```mermaid
erDiagram
    TENANT ||--o{ USER : "contains"
    TENANT ||--o{ COMPANY : "owns"
    TENANT ||--o{ DOMAIN : "manages"
    TENANT ||--o{ THEME : "defines"

    COUNTRY ||--o{ REGION : "contains"
    REGION ||--o{ DESTINATION : "contains"
    DESTINATION ||--o{ ECOSYSTEM : "hosts"
    DESTINATION ||--o{ COMPANY : "hosts"
    DESTINATION ||--o{ DOMAIN : "manages"
    DESTINATION ||--o{ THEME : "defines"

    LANGUAGE ||..|| THEME : "applies to"

    TENANT {
        uuid id PK
        varchar name
        varchar slug UK
        varchar type
        varchar status
        varchar domain
        jsonb config
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    COUNTRY {
        uuid id PK
        varchar code UK
        varchar name
        varchar currency
        varchar timezone
        varchar locale
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    REGION {
        uuid id PK
        uuid country_id FK
        varchar code
        varchar name
        jsonb coordinates
        integer sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    DESTINATION {
        uuid id PK
        uuid region_id FK
        varchar code
        varchar name
        varchar slug UK
        varchar type
        jsonb branding
        jsonb seo
        jsonb settings
        varchar status
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    DOMAIN {
        uuid id PK
        uuid destination_id FK
        uuid tenant_id FK
        varchar name UK
        varchar type
        boolean is_primary
        boolean is_verified
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    THEME {
        uuid id PK
        uuid destination_id FK
        uuid tenant_id FK
        varchar name
        varchar slug UK
        jsonb colors
        jsonb typography
        boolean is_default
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    LANGUAGE {
        uuid id PK
        varchar code UK
        varchar name
        boolean rtl
        boolean is_default
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
```

---

## LAYER 2: ECOSYSTEM

```mermaid
erDiagram
    DESTINATION ||--o{ ECOSYSTEM : "hosts"
    ECOSYSTEM ||--o{ MODULE : "contains"
    ECOSYSTEM ||--o{ CATEGORY : "classifies"
    ECOSYSTEM ||--o{ EXPERIENCE : "composes"

    CATEGORY ||--o{ CATEGORY : "parent of"
    CATEGORY ||--o{ EXPERIENCE : "categorizes"
    MODULE ||--o{ COMPANY_MODULE : "assigned to"

    ECOSYSTEM {
        uuid id PK
        uuid destination_id FK
        varchar name
        varchar slug UK
        varchar type
        jsonb branding
        jsonb features
        varchar status
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    MODULE {
        uuid id PK
        uuid ecosystem_id FK
        varchar code
        varchar name
        varchar slug UK
        varchar type
        varchar version
        jsonb configuration
        jsonb capabilities
        jsonb permissions
        jsonb dependencies
        boolean is_enabled
        boolean is_built_in
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    CATEGORY {
        uuid id PK
        uuid ecosystem_id FK
        uuid parent_id FK
        varchar name
        varchar slug UK
        varchar type
        varchar icon
        jsonb metadata
        integer sort_order
        varchar status
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    EXPERIENCE {
        uuid id PK
        uuid ecosystem_id FK
        uuid category_id FK
        varchar name
        varchar slug UK
        varchar type
        text description
        jsonb navigation
        jsonb layouts
        jsonb workflows
        jsonb permissions
        jsonb i18n
        varchar status
        timestamp published_at
        timestamp created_at
        timestamp updated_at
    }
```

---

## LAYER 3: COMPANY

```mermaid
erDiagram
    DESTINATION ||--o{ COMPANY : "hosts"
    TENANT ||--o{ COMPANY : "owns"
    COMPANY ||--|| COMPANY_PROFILE : "has"
    COMPANY ||--|| COMPANY_SETTING : "configures"
    COMPANY ||--o{ COMPANY_MODULE : "enables"
    COMPANY ||--o{ USER : "employs"
    COMPANY ||--o{ ACCOMMODATION : "owns"
    COMPANY ||--o{ RESERVATION : "manages"
    COMPANY ||--o{ PAYMENT : "processes"
    COMPANY ||--o{ INVOICE : "issues"
    COMPANY ||--o{ REVIEW : "receives"
    COMPANY ||--o{ NOTIFICATION : "sends"

    MODULE ||--o{ COMPANY_MODULE : "assigned to"

    COMPANY {
        uuid id PK
        uuid tenant_id FK
        uuid destination_id FK
        varchar name
        varchar slug UK
        varchar type
        varchar status
        jsonb contact
        jsonb location
        jsonb branding
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    COMPANY_PROFILE {
        uuid id PK
        uuid company_id FK UK
        text bio
        text story
        text mission
        text vision
        jsonb values
        jsonb team
        boolean is_published
        timestamp published_at
        timestamp created_at
        timestamp updated_at
    }

    COMPANY_SETTING {
        uuid id PK
        uuid company_id FK UK
        varchar timezone
        varchar locale
        varchar currency
        varchar date_format
        varchar time_format
        jsonb business_rules
        jsonb booking_rules
        jsonb payment_settings
        jsonb notification_settings
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    COMPANY_MODULE {
        uuid id PK
        uuid company_id FK
        varchar module_code
        varchar module_name
        varchar status
        jsonb configuration
        jsonb permissions
        boolean is_enabled
        timestamp enabled_at
        timestamp created_at
        timestamp updated_at
    }
```

---

## LAYER 4: IDENTITY

```mermaid
erDiagram
    TENANT ||--o{ USER : "contains"
    COMPANY ||--o{ USER : "employs"
    USER ||--o{ USER_ROLE : "has"
    USER ||--o{ USER_SESSION : "maintains"
    USER ||--o{ NOTIFICATION_PREFERENCE : "configures"

    ROLE ||--o{ USER_ROLE : "assigned to"
    ROLE }o--|| PERMISSION : "contains"

    USER ||--o{ RESERVATION : "creates"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ PAYMENT : "makes"

    USER {
        uuid id PK
        uuid tenant_id FK
        uuid company_id FK
        varchar email UK
        varchar username UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar display_name
        varchar type
        varchar status
        boolean email_verified
        boolean mfa_enabled
        jsonb profile
        jsonb preferences
        timestamp last_login_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    ROLE {
        uuid id PK
        uuid tenant_id FK
        uuid company_id FK
        varchar name
        varchar slug
        varchar type
        text description
        jsonb permissions
        boolean is_system
        boolean is_default
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PERMISSION {
        uuid id PK
        varchar name
        varchar slug UK
        varchar resource
        varchar action
        text description
        jsonb attributes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USER_ROLE {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        uuid tenant_id FK
        uuid company_id FK
        boolean is_active
        uuid granted_by
        timestamp granted_at
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    USER_SESSION {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar refresh_token_hash
        jsonb device_info
        varchar ip_address
        varchar type
        varchar status
        timestamp expires_at
        timestamp last_activity_at
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATION_PREFERENCE {
        uuid id PK
        uuid user_id FK UK
        boolean email
        boolean sms
        boolean push
        boolean whatsapp
        boolean in_app
        boolean reservation_confirmations
        boolean reservation_reminders
        boolean reservation_cancellations
        boolean marketing
        varchar frequency
        varchar quiet_hours_start
        varchar quiet_hours_end
        timestamp created_at
        timestamp updated_at
    }
```

---

## LAYER 5: BUSINESS

```mermaid
erDiagram
    COMPANY ||--o{ ACCOMMODATION : "owns"
    ACCOMMODATION ||--o{ ACCOMMODATION_UNIT : "contains"
    ACCOMMODATION ||--o{ AVAILABILITY : "defines"
    ACCOMMODATION ||--o{ AVAILABILITY_RULE : "configures"
    ACCOMMODATION ||--o{ REVIEW : "receives"

    CATEGORY ||--o{ ACCOMMODATION : "categorizes"

    COMPANY ||--o{ RESERVATION : "manages"
    ACCOMMODATION ||--o{ RESERVATION : "books"
    USER ||--o{ RESERVATION : "creates"
    RESERVATION ||--o{ RESERVATION_ACTIVITY : "tracks"

    COMPANY ||--o{ PAYMENT : "processes"
    RESERVATION ||--o{ PAYMENT : "collects"
    USER ||--o{ PAYMENT : "makes"

    COMPANY ||--o{ INVOICE : "issues"
    RESERVATION ||--o{ INVOICE : "generates"

    USER ||--o{ REVIEW : "writes"
    RESERVATION ||--o{ REVIEW : "generates"
    REVIEW ||--o{ REVIEW_HELPFULNESS : "voted on"

    USER ||--o{ NOTIFICATION : "receives"
    COMPANY ||--o{ NOTIFICATION : "sends"
    RESERVATION ||--o{ NOTIFICATION : "triggers"

    ACCOMMODATION {
        uuid id PK
        uuid tenant_id FK
        uuid company_id FK
        uuid category_id FK
        uuid owner_id
        varchar name
        varchar slug UK
        varchar type
        varchar status
        text description
        jsonb images
        jsonb location
        jsonb amenities
        jsonb pricing
        decimal rating
        integer review_count
        timestamp published_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    ACCOMMODATION_UNIT {
        uuid id PK
        uuid accommodation_id FK
        varchar name
        varchar slug UK
        varchar type
        integer max_guests
        integer bedrooms
        integer bathrooms
        jsonb beds
        jsonb amenities
        jsonb pricing
        varchar status
        integer sort_order
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    AVAILABILITY {
        uuid id PK
        uuid tenant_id FK
        uuid accommodation_id FK
        varchar date
        varchar status
        boolean is_blocked
        boolean is_reserved
        integer min_stay
        integer max_stay
        jsonb price
        integer inventory
        integer reserved_count
        timestamp created_at
        timestamp updated_at
    }

    AVAILABILITY_RULE {
        uuid id PK
        uuid tenant_id FK
        uuid accommodation_id FK
        varchar name
        varchar type
        jsonb config
        integer priority
        varchar start_date
        varchar end_date
        jsonb days_of_week
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    RESERVATION {
        uuid id PK
        uuid tenant_id FK
        uuid accommodation_id FK
        uuid user_id FK
        uuid visitor_id
        varchar status
        varchar confirmation_code UK
        varchar check_in_date
        varchar check_out_date
        integer guest_count
        integer adults
        integer children
        decimal subtotal
        decimal taxes
        decimal fees
        decimal discount
        decimal total_price
        varchar currency
        varchar channel
        jsonb customer
        text special_requests
        timestamp expires_at
        timestamp confirmed_at
        timestamp cancelled_at
        timestamp checked_in_at
        timestamp checked_out_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    RESERVATION_ACTIVITY {
        uuid id PK
        uuid reservation_id FK
        varchar activity_type
        text description
        uuid actor_id
        varchar actor_type
        varchar old_status
        varchar new_status
        jsonb metadata
        timestamp created_at
    }

    PAYMENT {
        uuid id PK
        uuid tenant_id FK
        uuid reservation_id FK
        uuid user_id FK
        decimal amount
        varchar currency
        varchar status
        varchar type
        varchar method
        varchar provider
        varchar provider_reference UK
        jsonb gateway_response
        decimal refunded_amount
        timestamp refunded_at
        timestamp processed_at
        timestamp failed_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    INVOICE {
        uuid id PK
        uuid tenant_id FK
        varchar invoice_number UK
        uuid reservation_id FK
        uuid customer_id
        varchar status
        timestamp issue_date
        timestamp due_date
        decimal subtotal
        decimal tax
        decimal total
        varchar currency
        jsonb items
        timestamp paid_at
        timestamp created_at
        timestamp updated_at
    }

    REVIEW {
        uuid id PK
        uuid tenant_id FK
        uuid accommodation_id FK
        uuid reservation_id FK
        uuid user_id FK
        uuid visitor_id
        decimal rating
        varchar title
        text content
        jsonb categories
        jsonb pros
        jsonb cons
        jsonb images
        varchar status
        boolean is_verified
        boolean is_featured
        integer helpful_count
        jsonb response
        timestamp published_at
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    REVIEW_HELPFULNESS {
        uuid id PK
        uuid review_id FK
        uuid user_id FK
        boolean is_helpful
        timestamp created_at
    }

    NOTIFICATION {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid reservation_id FK
        uuid recipient_id
        varchar recipient_type
        varchar type
        varchar channel
        varchar priority
        varchar subject
        varchar title
        jsonb content
        text body
        varchar status
        timestamp scheduled_at
        timestamp sent_at
        timestamp delivered_at
        timestamp read_at
        timestamp failed_at
        integer retry_count
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }
```

---

## COMPLETE PLATFORM ERD (Single Diagram)

```mermaid
erDiagram
    %% LAYER 1: PLATFORM
    TENANT ||--o{ COMPANY : "owns"
    TENANT ||--o{ USER : "contains"
    TENANT ||--o{ DOMAIN : "manages"

    COUNTRY ||--o{ REGION : "contains"
    REGION ||--o{ DESTINATION : "contains"

    DESTINATION ||--o{ ECOSYSTEM : "hosts"
    DESTINATION ||--o{ COMPANY : "hosts"
    DESTINATION ||--o{ DOMAIN : "manages"
    DESTINATION ||--o{ THEME : "defines"

    THEME ||--o| LANGUAGE : "applies"

    %% LAYER 2: ECOSYSTEM
    ECOSYSTEM ||--o{ MODULE : "contains"
    ECOSYSTEM ||--o{ CATEGORY : "classifies"
    ECOSYSTEM ||--o{ EXPERIENCE : "composes"

    CATEGORY ||--o{ CATEGORY : "parent of"
    CATEGORY ||--o{ EXPERIENCE : "categorizes"

    %% LAYER 3: COMPANY
    COMPANY ||--|| COMPANY_PROFILE : "has"
    COMPANY ||--|| COMPANY_SETTING : "configures"
    COMPANY ||--o{ COMPANY_MODULE : "enables"

    MODULE ||--o{ COMPANY_MODULE : "assigned to"

    %% LAYER 4: IDENTITY
    USER ||--o{ USER_ROLE : "has"
    USER ||--o{ USER_SESSION : "maintains"
    USER ||--o{ NOTIFICATION_PREFERENCE : "configures"

    ROLE ||--o{ USER_ROLE : "assigned to"

    %% LAYER 5: BUSINESS
    COMPANY ||--o{ ACCOMMODATION : "owns"
    COMPANY ||--o{ RESERVATION : "manages"
    COMPANY ||--o{ PAYMENT : "processes"
    COMPANY ||--o{ INVOICE : "issues"
    COMPANY ||--o{ REVIEW : "receives"
    COMPANY ||--o{ NOTIFICATION : "sends"

    ACCOMMODATION ||--o{ ACCOMMODATION_UNIT : "contains"
    ACCOMMODATION ||--o{ AVAILABILITY : "defines"
    ACCOMMODATION ||--o{ AVAILABILITY_RULE : "configures"

    CATEGORY ||--o{ ACCOMMODATION : "categorizes"

    ACCOMMODATION ||--o{ RESERVATION : "books"
    ACCOMMODATION ||--o{ REVIEW : "receives"

    USER ||--o{ RESERVATION : "creates"
    USER ||--o{ PAYMENT : "makes"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ NOTIFICATION : "receives"

    RESERVATION ||--o{ RESERVATION_ACTIVITY : "tracks"
    RESERVATION ||--o{ PAYMENT : "collects"
    RESERVATION ||--o{ INVOICE : "generates"
    RESERVATION ||--o{ REVIEW : "generates"
    RESERVATION ||--o{ NOTIFICATION : "triggers"

    REVIEW ||--o{ REVIEW_HELPFULNESS : "voted on"
```

---

## EXPERIENCE ENGINE DATA FLOW

```mermaid
flowchart TB
    subgraph CONFIG["CONFIGURATION LAYER"]
        E[Experience] --> M[Modules]
        M --> C[Capabilities]
        C --> R[Rendering]
    end

    subgraph DATABASE["DATABASE ENTITIES"]
        EC[Ecosystem] --> EX[Experience]
        EC --> MOD[Module]
        EX --> CAT[Category]
        MOD --> CAP[Capabilities JSON]
    end

    subgraph CODE["CODE LAYER"]
        CAPA[Accommodation Capability]
        RES[Reservation Capability]
        PAY[Payment Capability]
    end

    DATABASE --> CONFIG
    C --> CAPA
    C --> RES
    C --> PAY

    style DATABASE fill:#f9f,stroke:#333
    style CONFIG fill:#bbf,stroke:#333
    style CODE fill:#bfb,stroke:#333
```

---

## MULTI-TENANT ISOLATION

```mermaid
erDiagram
    %% Platform-shared
    COUNTRY ||--o{ REGION : "contains"
    REGION ||--o{ DESTINATION : "contains"

    %% Tenant-isolated
    TENANT ||--o{ COMPANY : "owns"
    TENANT ||--o{ USER : "contains"
    TENANT ||--o{ ACCOMMODATION : "owns"
    TENANT ||--o{ RESERVATION : "owns"
    TENANT ||--o{ PAYMENT : "owns"

    COMPANY ||--o{ ACCOMMODATION : "owns"
    COMPANY ||--o{ RESERVATION : "manages"
    COMPANY ||--o{ PAYMENT : "processes"

    USER ||--o{ RESERVATION : "creates"
    USER ||--o{ PAYMENT : "makes"
    USER ||--o{ REVIEW : "writes"

    DESTINATION ||--o{ COMPANY : "hosts"

    %% Note: Countries, Regions, Destinations are NOT tenant-isolated
    %% They are platform-shared across all tenants

    style TENANT fill:#ff9,stroke:#333
    style COUNTRY fill:#9f9,stroke:#333
    style REGION fill:#9f9,stroke:#333
    style DESTINATION fill:#9f9,stroke:#333
```

---

## VALIDATION STATUS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERD VALIDATION CHECKS                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ✓ PLATFORM_MANIFEST.md ....................... MATCHES                 │
│  ✓ VALDI_PLATFORM_VISION.md .................. MATCHES                 │
│  ✓ MULTI_ECOSYSTEM_ARCHITECTURE.md ........... MATCHES                 │
│  ✓ PLATFORM_FREEZES.md ....................... RESPECTS                │
│  ✓ P13.8 Platform Core Freeze ................ NOT VIOLATED            │
│  ✓ P15.0 Platform Vision Freeze .............. NOT VIOLATED            │
│  ✓ Repository boundary ....................... PRESERVED               │
│  ✓ BusinessService independence .............. PRESERVED               │
│  ✓ Multi-tenancy support ..................... DESIGNED                │
│  ✓ Multi-destination support ................. DESIGNED                │
│  ✓ Experience Engine integration ............. DESIGNED                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           VERDICT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│    DATABASE ARCHITECTURE:  ████████████████████████████  PASS            │
│                                                                           │
│    ERD DESIGN:            ████████████████████████████  APPROVED          │
│                                                                           │
│    READY FOR:             P12.3.1 Step 2 — Drizzle Schema Implementation │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```
