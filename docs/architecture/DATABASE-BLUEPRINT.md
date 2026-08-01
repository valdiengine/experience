# Database Blueprint

> The canonical persistence model for Valdi Engine.
> This document defines the domain model that every future provider must follow.
> No database technology is chosen. No SQL. No ORM. No implementation.
> This is the Single Source of Truth for persistence.

---

## 1. Persistence Philosophy

### Why Persistence Exists

Every platform needs memory. Memory of who created what, when, and why. Memory of reservations, observations, stories, and species. Memory of the relationships between destinations, communities, businesses, and visitors.

Persistence is that memory. It is not storage. It is not a database. It is the platform's ability to remember across sessions, across devices, and across time.

The persistence model is designed to serve the capability architecture, not replace it. Capabilities own business logic. The persistence model owns data structure. The two are separate concerns that communicate through well-defined interfaces.

### Conceptual Distinctions

**Entity.** A distinguishable thing with identity and lifecycle. A destination is an entity. A visitor is an entity. A reservation is an entity. Entities have IDs, creation timestamps, and lifecycle states.

**Aggregate.** A cluster of entities that must be consistent together. A reservation aggregate includes the reservation entity, its line items, its payment status, and its communication history. Aggregates define transactional boundaries.

**Projection.** A read-optimized view of data from one or more aggregates. A destination dashboard is a projection. A visitor profile is a projection. Projections are built from event streams and can be rebuilt if lost.

**Snapshot.** A point-in-time capture of an aggregate's state. Snapshots enable quick recovery without replaying the entire event history. They are not the source of truth — they are performance optimization.

**Cache.** A temporary copy of frequently accessed data. Caches have TTL, invalidation rules, and are never the source of truth. The platform can function without cache; it cannot function without persistence.

**View.** A filtered, transformed representation of entities for a specific use case. A "nearby experiences" view is not a stored entity — it is a query result.

**DTO.** Data Transfer Object. A lightweight structure that moves data between layers. DTOs have no identity, no lifecycle, and no behavior. They are pure data.

**Document.** A self-contained unit of information that may contain nested entities. Documents are often denormalized for read performance. The platform uses documents for content (experiences, stories, places) and normalized entities for transactional data (reservations, payments).

**Relationship.** A named connection between entities. Relationships have direction, cardinality, and ownership semantics. They are the structure that makes isolated entities into a coherent model.

### Key Principles

- Entities own their data. No entity can modify another entity's data directly.
- Relationships between entities are as important as the entities themselves.
- The persistence model is tenant-isolated by design.
- Offline-first requires local-first persistence with conflict resolution.
- The persistence model must be technology-independent so providers can be swapped.

**References:** `docs/architecture/DOMAIN_MODEL.md`, `docs/architecture/LAYER_MODEL.md`, `ARCHITECTURAL-INVARIANTS.md` INV-012

---

## 2. Global Domain Model

The Valdi Engine domain is organized into functional clusters. Each cluster represents a coherent set of entities that serve a common purpose.

### Platform Cluster

The platform itself. System-level entities that exist outside any tenant.

- Platform
- PlatformConfiguration
- PlatformEventLog
- PlatformMetric
- PlatformFeatureFlag
- PlatformMaintenanceWindow

### Tenant Cluster

Multi-tenant administration. Each tenant is an independently operated instance.

- Tenant
- TenantConfiguration
- TenantPlan
- TenantSubscription
- TenantBillingAccount
- TenantInvoice
- TenantPaymentMethod
- TenantUser
- TenantRole
- TenantPermission

### Destination Cluster

The territory hierarchy. Destinations are the primary organizational unit.

- Destination
- DestinationConfiguration
- DestinationPWA
- DestinationSEO
- DestinationHealthScore
- Region
- RegionConfiguration
- Commune
- Locality
- LocalityConfiguration
- Place
- PlaceContent
- PlaceMedia

### Experience Cluster

Bookable activities, services, and points of interest.

- Experience
- ExperienceVariant
- ExperienceSchedule
- ExperiencePricing
- ExperienceMedia
- ExperienceCategory
- ExperienceTag
- Accommodation
- AccommodationUnit
- AccommodationPricing
- AccommodationCalendar
- AccommodationAmenity

### Business Cluster

Service providers operating inside the ecosystem.

- BusinessTenant
- BusinessProfile
- BusinessConfiguration
- BusinessVerification
- BusinessCertification
- BusinessReview
- BusinessResponse

### Reservation Cluster

Booking lifecycle management.

- Reservation
- ReservationLineItem
- ReservationStatus
- ReservationPayment
- ReservationCommunication
- ReservationCancellation
- ReservationRefund
- ReservationHistory

### Availability Cluster

Temporal resource management.

- AvailabilitySlot
- AvailabilityRule
- AvailabilityException
- AvailabilityBlock
- AvailabilityCalendar

### Visitor Cluster

Ecosystem participants and their profiles.

- Visitor
- VisitorProfile
- VisitorPreferences
- VisitorDevice
- VisitorSession
- VisitorConsent
- VisitorReputation
- VisitorLevel
- VisitorEcoScore
- VisitorEcoToken

### Identity Cluster

Authentication, authorization, and access control.

- Identity
- IdentityProvider
- IdentitySession
- IdentityToken
- IdentityPermission
- IdentityRole
- IdentityAuditLog

### Community Cluster

Visitor-generated content and social interactions.

- CommunityMember
- CommunityMemory
- CommunityReview
- CommunityInteraction
- CommunityFollow
- CommunityReport
- CommunityModeration
- CommunityFlag

### Story Cluster

Cultural narratives and heritage preservation.

- Story
- StoryChapter
- StoryCharacter
- StoryTheme
- StoryMedia
- StoryValidation
- Heritage
- HeritageType
- HeritageConservationStatus
- LocalHero
- CulturalMemory
- CulturalMemoryCategory

### Species Cluster

Biodiversity catalog.

- Species
- SpeciesPhoto
- SpeciesHabitat
- SpeciesConservationStatus
- SpeciesTaxonomy
- SpeciesBehavior
- SpeciesSeasonality
- FloralDexEntry
- FaunaDexEntry
- MarineDexEntry

### Habitat Cluster

Ecological zones and monitoring.

- Habitat
- HabitatZone
- HabitatHealthScore
- HabitatConservationAction
- HabitatMonitoringData
- HabitatSpeciesCount

### Observation Cluster

Citizen science contributions.

- Observation
- ObservationPhoto
- ObservationLocation
- ObservationValidation
- ObservationTrustScore
- ObservationContributor

### Campaign Cluster

Managed initiatives for destination objectives.

- Campaign
- CampaignMilestone
- CampaignBudget
- CampaignTimeline
- CampaignMetrics
- CampaignPromotion
- CampaignSeasonal
- CampaignEvent
- CampaignConservation

### Challenge Cluster

Gamified missions and competitions.

- Challenge
- ChallengeMission
- ChallengeObjective
- ChallengeReward
- ChallengeParticipant
- ChallengeProgress
- ChallengeLeaderboard
- ChallengeBadge

### Badge Cluster

Achievement and recognition system.

- Badge
- BadgeCategory
- BadgeRequirement
- BadgeTier
- BadgeAward
- BadgeDisplay

### Route Cluster

Movement and mobility intelligence.

- Route
- RouteSegment
- RouteWaypoint
- RouteDifficulty
- RouteSurface
- RouteElevationProfile
- RouteCondition
- RouteReport
- RouteFavorite

### Notification Cluster

Outbound communication management.

- Notification
- NotificationTemplate
- NotificationDelivery
- NotificationPreference
- NotificationChannel
- NotificationStatus

### Media Cluster

Digital asset management.

- Media
- MediaVariant
- MediaMetadata
- MediaLicense
- MediaCompressionJob
- MediaStorageReference
- MediaThumbnail

### Payment Cluster

Financial transactions and accounting.

- Payment
- PaymentTransaction
- PaymentMethod
- PaymentPayout
- PaymentFee
- PaymentDispute
- PaymentReconciliation

### Subscription Cluster

Recurring billing and plan management.

- Subscription
- SubscriptionPlan
- SubscriptionPeriod
- SubscriptionInvoice
- SubscriptionDiscount
- SubscriptionPromoCode

### Analytics Cluster

Usage data and business intelligence.

- AnalyticsEvent
- AnalyticsSession
- AnalyticsPageView
- AnalyticsConversion
- AnalyticsReport
- AnalyticsDashboard

### Audit Cluster

Change tracking and compliance.

- AuditEntry
- AuditActor
- AuditAction
- AuditResource
- AuditChange
- AuditReason
- AuditSource
- AuditRetention

### Governance Cluster

Policy, roles, and compliance.

- GovernancePolicy
- GovernanceRule
- GovernanceRole
- GovernancePermission
- GovernanceWorkflow
- GovernanceApproval
- GovernanceReview
- GovernanceViolation

### Operations Cluster

Destination management and monitoring.

- OperationAlert
- OperationSchedule
- OperationTask
- OperationMaintenance
- OperationReport
- OperationSeasonProfile
- OperationMetric

**References:** `docs/architecture/DOMAIN_MODEL.md`, `docs/ai/CAPABILITY_INDEX.md`

---

## 3. Entity Catalog

Every entity in the domain model is defined below with its purpose, owner, lifecycle, relationships, visibility, identifiers, mutable and immutable fields, and archival rules.

### Platform

| Property | Value |
|----------|-------|
| **Purpose** | The platform instance itself. Exists once per deployment. |
| **Owner** | Platform operator |
| **Lifecycle** | Created at platform bootstrap. Never deleted. |
| **Relationships** | Has many Tenants, contains all PlatformConfiguration |
| **Visibility** | Internal only. Never exposed to tenants. |
| **Primary identifier** | UUID |
| **Natural identifiers** | Name, domain |
| **Immutable fields** | id, createdAt |
| **Mutable fields** | name, description, contactEmail, termsVersion, privacyVersion |
| **Soft delete** | Not supported |
| **Archive** | Not supported |

### Tenant

| Property | Value |
|----------|-------|
| **Purpose** | An independently operated instance of the platform. |
| **Owner** | Platform operator |
| **Lifecycle** | Created during onboarding. Active, suspended, cancelled. |
| **Relationships** | Belongs to Platform, has many Destinations, Users, Subscriptions |
| **Visibility** | Visible only to Tenant users and Platform operators |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug, domain |
| **Immutable fields** | id, createdAt, platformId |
| **Mutable fields** | name, slug, domain, status, planId, contactName, contactEmail |
| **Soft delete** | Tenant is suspended, not deleted. Data preserved for retention period. |
| **Archive** | After 90 days of suspension, data moved to cold storage. |

### Destination

| Property | Value |
|----------|-------|
| **Purpose** | The primary ecosystem identity. A territory with shared tourism, ecology, and cultural identity. |
| **Owner** | Tenant |
| **Lifecycle** | Created by Tenant admin. Active, inactive, archived. |
| **Relationships** | Belongs to Tenant, has many Localities, Places, Experiences, Businesses, Species, Habitats |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug, ISO code |
| **Immutable fields** | id, createdAt, tenantId |
| **Mutable fields** | name, description, slug, status, timezone, currency, language, coordinates, geometry, featuredMediaId |
| **Soft delete** | Soft delete supported. IsDeleted flag, deletedAt timestamp. |
| **Archive** | After 365 days of inactive status, automatic archival. Archived destinations are read-only. |

### Locality

| Property | Value |
|----------|-------|
| **Purpose** | A community identity within a destination. Neighborhood, village, district. |
| **Owner** | Destination |
| **Lifecycle** | Created by Destination admin. Active, inactive. |
| **Relationships** | Belongs to Destination, has many Places, Experiences |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug (unique within destination) |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, description, slug, status, coordinates, geometry, featuredMediaId |
| **Soft delete** | Supported |
| **Archive** | After 365 days inactive. |

### Place

| Property | Value |
|----------|-------|
| **Purpose** | A tourism discovery point. Trail, viewpoint, beach, restaurant, park, landmark. |
| **Owner** | Destination (or Locality) |
| **Lifecycle** | Created by admin or community. Active, inactive, pending. |
| **Relationships** | Belongs to Locality (optional), has many Experiences, Memories, Reviews, Media |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug, externalId (Google Places, OpenStreetMap) |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, description, slug, status, placeType, coordinates, address, contactInfo, operatingHours, featuredMediaId |
| **Soft delete** | Supported |
| **Archive** | After 365 days inactive. |

### Experience

| Property | Value |
|----------|-------|
| **Purpose** | A bookable service or activity. |
| **Owner** | Business Tenant |
| **Lifecycle** | Created by Business. Active, inactive, paused. |
| **Relationships** | Belongs to Business Tenant, has many Variants, Schedules, Pricings, Media, Reservations |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug, sku |
| **Immutable fields** | id, createdAt, businessTenantId |
| **Mutable fields** | name, description, slug, status, duration, capacity, difficultyLevel, categoryId, tags, featuredMediaId |
| **Soft delete** | Supported |
| **Archive** | After 180 days inactive. Reservations preserved for legal retention. |

### Accommodation

| Property | Value |
|----------|-------|
| **Purpose** | A lodging property with bookable units. |
| **Owner** | Business Tenant |
| **Lifecycle** | Created by Business. Active, inactive, paused. |
| **Relationships** | Belongs to Business Tenant, has many Units, Pricings, Calendars, Amenities |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, businessTenantId |
| **Mutable fields** | name, description, slug, status, accommodationType, checkInTime, checkOutTime, cancellationPolicy, featuredMediaId |
| **Soft delete** | Supported |
| **Archive** | After 180 days inactive. |

### Reservation

| Property | Value |
|----------|-------|
| **Purpose** | A booking for an experience or accommodation. |
| **Owner** | Visitor (as booker) and Business Tenant (as provider) |
| **Lifecycle** | Created by Visitor. Pending, confirmed, in-progress, completed, cancelled, refunded. |
| **Relationships** | Belongs to Experience or Accommodation, has LineItems, Payments, Communications, History |
| **Visibility** | Visitor (their own), Business Tenant (pertaining to them), Platform (aggregated) |
| **Primary identifier** | UUID |
| **Natural identifiers** | ConfirmationCode (human-readable) |
| **Immutable fields** | id, createdAt, visitorId, businessTenantId |
| **Mutable fields** | status, startDate, endDate, quantity, totalAmount, currency, notes |
| **Soft delete** | Not supported. Reservation is immutable for legal reasons. Cancellation creates status change. |
| **Archive** | After legal retention period (typically 5 years). |

### Availability

| Property | Value |
|----------|-------|
| **Purpose** | A temporal slot for booking. |
| **Owner** | Business Tenant |
| **Lifecycle** | Created by Business or system. Active, blocked, consumed. |
| **Relationships** | Belongs to Experience or Accommodation, references Reservations |
| **Visibility** | Public (availability), Private (blocked slots) |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, experienceId |
| **Mutable fields** | startTime, endTime, capacity, availableCount, status |
| **Soft delete** | Not supported. Availability is temporal. |
| **Archive** | Automatically archived after the slot time passes plus 30 days. |

### Visitor

| Property | Value |
|----------|-------|
| **Purpose** | An ecosystem participant who explores destinations and generates content. |
| **Owner** | Self (the visitor) |
| **Lifecycle** | Created on first interaction. Active, inactive, deleted. |
| **Relationships** | Has many Reservations, Memories, Reviews, Observations, Badges, EcoTokens |
| **Visibility** | Public (profile), Private (personal data), Controlled (consent-based) |
| **Primary identifier** | UUID |
| **Natural identifiers** | Email, handle |
| **Immutable fields** | id, createdAt, identityId |
| **Mutable fields** | displayName, handle, avatarMediaId, bio, preferences, consentSettings |
| **Soft delete** | Supported. GDPR right to erasure requires hard delete of personal data after retention period. |
| **Archive** | Personal data archived per consent settings. Anonymized data preserved. |

### Identity

| Property | Value |
|----------|-------|
| **Purpose** | Authentication record for a person or system. |
| **Owner** | Self |
| **Lifecycle** | Created on registration. Active, suspended, deleted. |
| **Relationships** | Has one Visitor (for people), has many Sessions, Tokens |
| **Visibility** | Private. Only accessible to the identity owner and platform operators. |
| **Primary identifier** | UUID |
| **Natural identifiers** | Email, username, externalId (OAuth) |
| **Immutable fields** | id, createdAt |
| **Mutable fields** | email, passwordHash, emailVerifiedAt, lastLoginAt, status |
| **Soft delete** | Supported |
| **Archive** | After GDPR retention period |

### Community (Memory)

| Property | Value |
|----------|-------|
| **Purpose** | A visitor-generated story connected to a specific place. |
| **Owner** | Visitor (creator) |
| **Lifecycle** | Created by Visitor. Pending, published, flagged, hidden. |
| **Relationships** | Belongs to Visitor, references Place or Experience, has Media, Comments |
| **Visibility** | Public (published), Controlled (pending, flagged) |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, visitorId |
| **Mutable fields** | title, content, placeId, experienceId, mediaIds, status, moderationNotes |
| **Soft delete** | Supported |
| **Archive** | Preserved as community knowledge. Never fully deleted unless legal requirement. |

### Story

| Property | Value |
|----------|-------|
| **Purpose** | A cultural narrative belonging to a community. |
| **Owner** | Community (curated by Local Heroes and Cultural leaders) |
| **Lifecycle** | Created by community member. Draft, review, published, archived. |
| **Relationships** | Has many Chapters, Characters, Themes, Media |
| **Visibility** | Public (published), Controlled (draft, review) |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, createdById |
| **Mutable fields** | title, slug, subtitle, content, storyType, themeIds, characterIds, mediaIds, status, validatedById |
| **Soft delete** | Not supported. Cultural content is permanent. |
| **Archive** | Archived stories are preserved but marked as inactive. Never deleted. |

### Species

| Property | Value |
|----------|-------|
| **Purpose** | A documented plant, animal, or organism in the destination ecosystem. |
| **Owner** | Destination (curated by scientific partners) |
| **Lifecycle** | Created by scientific partner or validated observer. Active, inactive. |
| **Relationships** | Has many Photos, Habitats, Observations, belongs to Destination |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | ScientificName, commonName, IUCN ID, GBIF ID |
| **Immutable fields** | id, createdAt, scientificName |
| **Mutable fields** | commonName, description, conservationStatus, habitatIds, photoIds, taxonomyData, behaviorData, seasonalityData |
| **Soft delete** | Not supported |
| **Archive** | Not supported |

### Habitat

| Property | Value |
|----------|-------|
| **Purpose** | A defined ecological zone within a destination. |
| **Owner** | Destination (curated by scientific partners) |
| **Lifecycle** | Created by scientific partner. Active, inactive. |
| **Relationships** | Has many Species, Observations, HealthScores, belongs to Destination |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Name (unique within destination) |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, description, habitatType, coordinates, geometry, healthScore, conservationActions |
| **Soft delete** | Not supported |
| **Archive** | Not supported |

### Observation

| Property | Value |
|----------|-------|
| **Purpose** | A visitor-contributed ecological data point. |
| **Owner** | Visitor (contributor) and Destination (scientific data) |
| **Lifecycle** | Created by Visitor. Pending, validated, rejected. |
| **Relationships** | Belongs to Visitor, references Species or Habitat, has Photos, Location, Validation |
| **Visibility** | Public (validated), Private (pending) |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, visitorId, speciesId |
| **Mutable fields** | observationType, latitude, longitude, altitude, notes, photoIds, validationStatus, validatedById |
| **Soft delete** | Supported |
| **Archive** | Validated observations are permanent scientific data. |

### Campaign

| Property | Value |
|----------|-------|
| **Purpose** | A managed initiative to achieve a destination objective. |
| **Owner** | Destination (operations) |
| **Lifecycle** | Created by admin. Draft, active, completed, cancelled. |
| **Relationships** | Belongs to Destination, has Milestones, Budget, Timeline, Metrics |
| **Visibility** | Public (active campaigns), Controlled (draft, completed) |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, slug, description, campaignType, status, startDate, endDate, budget, metrics |
| **Soft delete** | Supported |
| **Archive** | After completion plus 365 days. |

### Challenge

| Property | Value |
|----------|-------|
| **Purpose** | A gamified mission or competition for visitors. |
| **Owner** | Destination (exploration) |
| **Lifecycle** | Created by admin. Draft, active, completed, archived. |
| **Relationships** | Belongs to Destination, has Missions, Objectives, Rewards, Participants, Badges |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, slug, description, challengeType, status, startDate, endDate, difficultyLevel |
| **Soft delete** | Supported |
| **Archive** | After completion plus 180 days. |

### Badge

| Property | Value |
|----------|-------|
| **Purpose** | An achievement awarded to visitors for completing challenges or contributions. |
| **Owner** | Destination |
| **Lifecycle** | Created by admin. Active, retired. |
| **Relationships** | Belongs to Destination or Challenge, has Tiers, Requirements, Awards |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, badgeCategoryId |
| **Mutable fields** | name, slug, description, iconMediaId, tier, requirements |
| **Soft delete** | Not supported |
| **Archive** | Retired badges remain displayed on visitor profiles. |

### Route

| Property | Value |
|----------|-------|
| **Purpose** | A defined path for movement through a destination. |
| **Owner** | Destination |
| **Lifecycle** | Created by admin or community. Draft, published, archived. |
| **Relationships** | Belongs to Destination, has Segments, Waypoints, Conditions, Reports |
| **Visibility** | Public |
| **Primary identifier** | UUID |
| **Natural identifiers** | Slug |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, slug, description, routeType, difficultyLevel, surfaceType, distance, elevationGain, duration, coordinates, geometry, conditionStatus |
| **Soft delete** | Supported |
| **Archive** | After 365 days inactive. |

### Notification

| Property | Value |
|----------|-------|
| **Purpose** | An outbound communication to a visitor, business, or admin. |
| **Owner** | Platform (system-generated) |
| **Lifecycle** | Created by system. Pending, sent, delivered, read, failed. |
| **Relationships** | Belongs to Recipient, references Source entity, has Delivery records |
| **Visibility** | Private (recipient only) |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, recipientId, notificationType |
| **Mutable fields** | title, body, channel, status, sentAt, deliveredAt, readAt |
| **Soft delete** | Not supported |
| **Archive** | After 90 days. |

### Media

| Property | Value |
|----------|-------|
| **Purpose** | A digital asset (image, video, audio, document). |
| **Owner** | The creating entity (Visitor, Business, Admin) |
| **Lifecycle** | Created on upload. Active, processing, failed, deleted. |
| **Relationships** | Belongs to Creator, has Variants, Metadata, License |
| **Visibility** | Controlled by owning entity |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, creatorId, mimeType |
| **Mutable fields** | fileName, fileSize, width, height, duration, altText, caption, license, status |
| **Soft delete** | Supported |
| **Archive** | After 365 days of no references. |

### Payment

| Property | Value |
|----------|-------|
| **Purpose** | A financial transaction record. |
| **Owner** | Platform (for reconciliation) |
| **Lifecycle** | Created by transaction. Pending, processing, completed, failed, refunded. |
| **Relationships** | Belongs to Reservation, has Transactions, Fees, Disputes |
| **Visibility** | Platform and involved parties |
| **Primary identifier** | UUID |
| **Natural identifiers** | Transaction ID (external provider) |
| **Immutable fields** | id, createdAt, reservationId, amount, currency |
| **Mutable fields** | status, providerTransactionId, feeAmount, netAmount, refundedAmount |
| **Soft delete** | Not supported. Financial records are permanent. |
| **Archive** | After legal retention period (typically 7 years). |

### Subscription

| Property | Value |
|----------|-------|
| **Purpose** | A recurring billing arrangement for a tenant. |
| **Owner** | Platform |
| **Lifecycle** | Created during activation. Trial, active, past-due, cancelled, expired. |
| **Relationships** | Belongs to Tenant, has Plans, Periods, Invoices |
| **Visibility** | Tenant and Platform |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, tenantId |
| **Mutable fields** | planId, status, trialEndsAt, currentPeriodStart, currentPeriodEnd, cancelledAt |
| **Soft delete** | Not supported |
| **Archive** | After cancellation plus 365 days. |

### Analytics

| Property | Value |
|----------|-------|
| **Purpose** | A recorded interaction for business intelligence. |
| **Owner** | Platform |
| **Lifecycle** | Created by event. Immutable after recording. |
| **Relationships** | References Visitor, Destination, Entity |
| **Visibility** | Platform only. Aggregated views may be tenant-visible. |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, timestamp, eventName, visitorId |
| **Mutable fields** | Properties (JSON blob of event-specific data) |
| **Soft delete** | Not supported |
| **Archive** | Raw events archived after 90 days. Aggregated data preserved indefinitely. |

### Audit

| Property | Value |
|----------|-------|
| **Purpose** | A record of a state-changing action for compliance and tracing. |
| **Owner** | Platform |
| **Lifecycle** | Created by action. Immutable after recording. |
| **Relationships** | References Actor, Resource, Action |
| **Visibility** | Platform and authorized tenant admins |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, timestamp, actorId, resourceType, resourceId, action, reason, source |
| **Mutable fields** | None |
| **Soft delete** | Not supported |
| **Archive** | After legal retention period (typically 5 years). |

### Governance

| Property | Value |
|----------|-------|
| **Purpose** | A policy, role, or workflow that controls platform behavior. |
| **Owner** | Destination (for governance) or Platform (for system governance) |
| **Lifecycle** | Created by admin. Draft, active, archived. |
| **Relationships** | Has many Rules, Roles, Workflows, Approvals |
| **Visibility** | Controlled. Only authorized admins. |
| **Primary identifier** | UUID |
| **Natural identifiers** | Name, slug |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | name, description, policyType, rules, status, version |
| **Soft delete** | Supported |
| **Archive** | Archived policies remain for audit trail. |

### Operations

| Property | Value |
|----------|-------|
| **Purpose** | An operational event, alert, or task for destination management. |
| **Owner** | Destination |
| **Lifecycle** | Created by system or admin. Open, in-progress, resolved, closed. |
| **Relationships** | Belongs to Destination, references Campaign, HealthScore |
| **Visibility** | Destination admin |
| **Primary identifier** | UUID |
| **Natural identifiers** | None |
| **Immutable fields** | id, createdAt, destinationId |
| **Mutable fields** | operationType, severity, status, description, resolution, resolvedAt |
| **Soft delete** | Supported |
| **Archive** | After 90 days resolved. |

---

## 4. Relationship Matrix

### One-to-One

| Entity A | Entity B | Type | Notes |
|----------|----------|------|-------|
| Tenant | TenantConfiguration | Owns | Every tenant has exactly one configuration |
| Destination | DestinationConfiguration | Owns | Every destination has exactly one configuration |
| Destination | DestinationPWA | Owns | Every destination has exactly one PWA configuration |
| Destination | DestinationSEO | Owns | Every destination has exactly one SEO profile |
| Visitor | VisitorProfile | Owns | Every visitor has exactly one profile |
| Visitor | VisitorPreferences | Owns | Every visitor has exactly one preferences record |
| Visitor | VisitorConsent | Owns | Every visitor has exactly one consent record |
| Identity | Visitor | Links | Every identity links to exactly one visitor |
| BusinessTenant | BusinessProfile | Owns | Every business has exactly one profile |
| BusinessTenant | BusinessConfiguration | Owns | Every business has exactly one configuration |
| Tenant | Subscription | Has | Every tenant has exactly one subscription |

### One-to-Many

| Entity A | Entity B | Type | Notes |
|----------|----------|------|-------|
| Platform | Tenant | Has | Platform has many tenants |
| Tenant | Destination | Has | Tenant has many destinations |
| Tenant | TenantUser | Has | Tenant has many users |
| Tenant | TenantRole | Has | Tenant has many roles |
| Destination | Locality | Has | Destination has many localities |
| Destination | Place | Has | Destination has many places |
| Destination | Species | Has | Destination has many species |
| Destination | Habitat | Has | Destination has many habitats |
| Destination | Campaign | Has | Destination has many campaigns |
| Destination | Challenge | Has | Destination has many challenges |
| Destination | Route | Has | Destination has many routes |
| Destination | Story | Has | Destination has many stories |
| Destination | Heritage | Has | Destination has many heritage items |
| Destination | GovernancePolicy | Has | Destination has many policies |
| Destination | OperationAlert | Has | Destination has many alerts |
| Locality | Place | Has | Locality has many places |
| Place | Experience | Has | Place has many experiences |
| Place | CommunityMemory | Has | Place has many memories |
| BusinessTenant | Experience | Offers | Business has many experiences |
| BusinessTenant | Accommodation | Offers | Business has many accommodations |
| Experience | ExperienceVariant | Has | Experience has many variants |
| Experience | ExperienceSchedule | Has | Experience has many schedules |
| Experience | ExperiencePricing | Has | Experience has many pricing tiers |
| Experience | ExperienceMedia | Has | Experience has many media items |
| Accommodation | AccommodationUnit | Has | Accommodation has many units |
| Visitor | Reservation | Books | Visitor has many reservations |
| Visitor | CommunityMemory | Creates | Visitor has many memories |
| Visitor | CommunityReview | Creates | Visitor has many reviews |
| Visitor | Observation | Contributes | Visitor has many observations |
| Visitor | BadgeAward | Earns | Visitor has many badges |
| Visitor | VisitorEcoToken | Holds | Visitor has many eco-tokens |
| Visitor | Media | Uploads | Visitor has many media items |
| Campaign | CampaignMilestone | Has | Campaign has many milestones |
| Challenge | ChallengeMission | Has | Challenge has many missions |
| Challenge | ChallengeParticipant | Has | Challenge has many participants |
| Route | RouteSegment | Has | Route has many segments |
| Route | RouteWaypoint | Has | Route has many waypoints |
| Story | StoryChapter | Has | Story has many chapters |
| Story | StoryMedia | Has | Story has many media items |
| Habitat | HabitatHealthScore | Has | Habitat has many health scores |
| Species | SpeciesPhoto | Has | Species has many photos |
| Species | Observation | Has | Species has many observations |
| GovernancePolicy | GovernanceRule | Has | Policy has many rules |
| GovernancePolicy | GovernanceWorkflow | Has | Policy has many workflows |

### Many-to-Many

| Entity A | Entity B | Junction | Notes |
|----------|----------|----------|-------|
| Destination | BusinessTenant | DestinationBusiness | A destination has many businesses; a business can operate in many destinations |
| Destination | Visitor | DestinationVisit | A destination has many visitors; a visitor visits many destinations |
| Experience | Category | ExperienceCategory | An experience can have many categories; a category can contain many experiences |
| Experience | Tag | ExperienceTag | An experience can have many tags; a tag can label many experiences |
| Challenge | Badge | ChallengeBadge | A challenge can award many badges; a badge can be awarded by many challenges |
| Species | Habitat | SpeciesHabitat | A species can inhabit many habitats; a habitat can contain many species |
| Habitat | ConservationAction | HabitatAction | A habitat can have many actions; an action can apply to many habitats |
| Visitor | Badge | BadgeAward | A visitor can earn many badges; a badge can be earned by many visitors |
| Route | Species | RouteSpecies | A route can pass through species habitats; species can be observed along many routes |
| BusinessTenant | Certification | BusinessCertification | A business can have many certifications; certifications can apply to many businesses |
| Media | Entity | MediaReference | Media can be referenced by many entities; an entity can have many media items |

### Composition (child cannot exist without parent)

| Parent | Child | Notes |
|--------|-------|-------|
| Platform | Tenant | Tenant cannot exist without Platform |
| Tenant | Destination | Destination cannot exist without a Tenant |
| Destination | Locality | Locality cannot exist without a Destination |
| Destination | Species | Species cannot exist without a Destination |
| Destination | Habitat | Habitat cannot exist without a Destination |
| BusinessTenant | Experience | Experience cannot exist without a Business |
| BusinessTenant | Accommodation | Accommodation cannot exist without a Business |
| Experience | Reservation | Reservation cannot exist without an Experience or Accommodation |
| Visitor | Reservation | Reservation cannot exist without a Visitor |
| Visitor | Observation | Observation cannot exist without a Visitor |
| Visitor | CommunityMemory | Memory cannot exist without a Visitor |
| Campaign | CampaignMilestone | Milestone cannot exist without a Campaign |
| Story | StoryChapter | Chapter cannot exist without a Story |
| Route | RouteSegment | Segment cannot exist without a Route |

### Aggregation (child can exist independently)

| Parent | Child | Notes |
|--------|-------|-------|
| Destination | Media | Media can be detached and reattached |
| Destination | BusinessTenant | Business can move between destinations |
| Destination | Visitor | Visitor can explore multiple destinations |
| Experience | Media | Media can be reused across experiences |
| Species | Media | Media can illustrate multiple species |

### Inheritance (specialization)

| General | Specific | Notes |
|---------|----------|-------|
| Entity | Destination, Locality, Place | Territorial entities share common fields |
| Entity | Visitor, BusinessTenant, PlatformUser | Actor entities share identity fields |
| Content | Story, Heritage, CulturalMemory | Cultural content shares lifecycle |
| Media | Image, Video, Audio, Document | Media types share storage and metadata |
| Achievement | Badge, Level, EcoToken | Achievement mechanisms share award patterns |

### Reference (cross-cluster lookups)

| Source | Target | Purpose |
|--------|--------|---------|
| Reservation | Payment | Reference to payment for a reservation |
| Notification | Reservation | Reference to the entity that triggered the notification |
| Observation | Species | Reference to the observed species |
| Observation | Habitat | Reference to the observation habitat |
| CommunityMemory | Place | Reference to the place the memory is about |
| CommunityMemory | Experience | Reference to the experience the memory is about |
| CommunityReview | BusinessTenant | Reference to the business being reviewed |
| Campaign | Destination | Reference to the campaign's destination |
| AuditEntry | Any entity | Polymorphic reference to the audited entity |

### Ownership (primary responsible party)

| Entity | Owner | Notes |
|--------|-------|-------|
| Tenant | Platform | Platform owns the tenant lifecycle |
| Destination | Tenant | Tenant owns the destination lifecycle |
| Locality | Destination | Destination owns locality lifecycle |
| Place | Destination | Destination owns place lifecycle |
| Experience | BusinessTenant | Business owns experience lifecycle |
| Reservation | Visitor (booker) and Business (provider) | Dual ownership for legal compliance |
| CommunityMemory | Visitor | Visitor owns their content |
| Story | Community | Community collectively owns cultural content |
| Species | Destination | Destination owns species catalog |
| Observation | Visitor (contribution) and Destination (data) | Dual ownership per scientific data standards |
| Media | Creator | Uploader owns media rights management |

---

## 5. Data Ownership Rules

### Platform Owns

- Platform identity and configuration
- Tenant lifecycle and billing
- System-wide audit logs
- Platform analytics (aggregated)
- System governance policies
- Platform feature flags
- Global event log
- Platform media storage configuration

### Tenant Owns

- Tenant configuration and branding
- Tenant user accounts and roles
- Tenant subscription and billing
- Tenant-specific governance policies
- Tenant analytics (pre-aggregated)
- Tenant onboarding status

### Destination Owns

- Destination identity and profile
- Destination PWA and SEO configuration
- Destination localities, places, routes
- Destination species and habitats
- Destination campaigns and challenges
- Destination badges and achievements
- Destination stories and heritage
- Destination governance policies
- Destination health scores and operational data
- Destination media (territorial)
- Destination community members

### Business Tenant Owns

- Business profile and configuration
- Experiences and accommodations
- Availability schedules and pricing
- Business verification and certifications
- Business media (commercial)
- Business responses to reviews
- Business operational data

### Visitor Owns

- Personal profile and preferences
- Consent and privacy settings
- Reservations (as booker)
- Memories, reviews, and interactions
- Observations and contributions
- Badges, levels, and eco-tokens
- Personal media
- Personal analytics data

### Community Owns

- Cultural stories and heritage records
- Local hero recognition
- Cultural memory preservation
- Community moderation decisions
- Community reputation system

### Scientific Partner Owns

- Species taxonomy and descriptions
- Habitat definitions and boundaries
- Observation validation
- Conservation status assessments
- Scientific naming and classification

### No Duplicated Ownership

Every data field has exactly one owning entity. No field may be owned by two entities. When two entities need access to the same data, the owning entity exposes it through the capability API. Cross-entity data sharing is mediated by capabilities and events, not by shared database access.

**Violation example:** If both `Destination` and `BusinessTenant` claim ownership of `Experience.visibility`, then changes from one owner will silently override the other. The Business Tenant owns the experience; the Destination may set visibility policies through the governance capability, but the source of truth for visibility is the Business Tenant.

---

## 6. Identity Strategy

### UUID

Every entity has a UUID v4 primary identifier. UUIDs are generated client-side (for offline support) and server-side (for transactional integrity). UUIDs are globally unique across all entities and all tenants.

```
entity.id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

UUIDs are:
- Generated by the client for new entities created offline
- Generated by the server for system-created entities
- Never reused after deletion
- Opaque — no embedded semantics (no timestamp, no tenant id, no type)
- The primary foreign key for all relationships

### Slug

Human-readable identifiers used in URLs and API paths. Slugs are unique within their parent scope.

```
destination.slug   = "torres-del-paine"
locality.slug      = "puerto-natales"
experience.slug    = "kayaking-glacier-grey"
```

Slug rules:
- Lowercase, hyphenated, no special characters
- Unique within the parent entity (e.g., destination slug unique within tenant)
- Mutable but change is discouraged (breaks URLs)
- Auto-generated from name, manually editable

### External IDs

References to external system identifiers. Stored as a typed map to support multiple external systems.

```
entity.externalIds = {
  "google-places": "ChIJ...",
  "openstreetmap": "W123456789",
  "iucn": "22732",
  "gbif": "1234567",
  "wikidata": "Q123456"
}
```

External IDs are:
- Immutable once set (the external system owns the reference)
- Indexed for lookup and deduplication
- Namespace-qualified to avoid collision

### Composite Keys

Used for relationship entities and intersection tables. Composite keys combine the IDs of both related entities plus optional discriminator.

```
// Species-Habitat relationship
compositeKey = `${speciesId}:${habitatId}`

// Experience-schedule slot
compositeKey = `${experienceId}:${date}:${timeSlot}`
```

Composite keys are:
- Deterministic (can be computed from constituent IDs)
- Used for upsert operations (avoiding duplicates)
- Secondary to the UUID primary key

### Tenant Isolation

Every tenant-scoped entity has a `tenantId` field. This field is:
- Set at creation time
- Immutable
- Indexed on every query
- Required (not nullable)

The `tenantId` is the partition key for all tenant data. No query returns data from multiple tenants without explicit cross-tenant context.

### Destination Isolation

Every destination-scoped entity has a `destinationId` field. This field is:
- Set at creation time
- Immutable
- Indexed on every query
- Required for destination-scoped entities

Destination IDs nest within tenant IDs. A destination always belongs to exactly one tenant.

### Global Uniqueness

UUIDs ensure global uniqueness across all entities, all tenants, and all destinations. No other identifier type is globally unique. Slugs are unique within their parent scope. External IDs are unique within their namespace.

---

## 7. Versioning Strategy

### Optimistic Locking

Every mutable entity has a `version` field. This field increments on every write. When two writers attempt to update the same entity simultaneously, the second writer must provide the version it read. If the version in the database is higher, the write is rejected with a conflict error.

```
// Write request
{
  "id": "...",
  "version": 5,
  "name": "Updated Name"
}

// If database version is 6, reject with 409 Conflict
```

Optimistic locking is chosen over pessimistic locking because:
- Offline-first means long-held locks are impractical
- Most writes are single-actor (one visitor, one business)
- Conflict frequency is low
- Locking would degrade offline experience

### Entity Version

Every entity has a `version` integer starting at 1. Version increments on each update. Version is never reset. Deleted entities retain their final version for conflict detection during sync.

### Schema Version

The global schema version is a monotonically increasing integer stored in platform configuration. Every entity carries the schema version under which it was created or last migrated.

```
entity.schemaVersion = 12
```

Schema version enables:
- Provider-level migrations to know which schema version to target
- Gradual migration across providers (not all entities migrate simultaneously)
- Backward compatibility for entities at older schema versions

### Migration Version

Migrations are numbered sequentially. Each migration has:
- A version number
- A description
- The date it was created
- A set of entity changes (additions, modifications, deprecations)
- A rollback plan (conceptual, not code)

Migration versions are not database-specific. They describe conceptual changes to the domain model.

### API Version

The API version is decoupled from the schema version. API versions follow semantic versioning (MAJOR.MINOR.PATCH). Multiple API versions may operate against the same schema version.

```
API v1.0.0 → Schema v12
API v2.0.0 → Schema v12 (breaking API change, same domain model)
```

### Capability Version

Each capability has its own version number (declared as `static version` in the capability class). Capability versions are independent of schema versions. A capability may change version without any persistence change, and vice versa.

---

## 8. Offline Strategy

### Local IDs

When an entity is created offline, it receives a UUID generated by the client. This UUID is the entity's permanent identity. It does not change when synced to the server. Client-generated UUIDs are indistinguishable from server-generated UUIDs.

### Temporary IDs

Temporary IDs are used for entities that reference not-yet-created parents. When a memory references a place that has not yet been synced, the reference uses the temporary ID. When the parent entity syncs, the temporary ID is resolved to the permanent UUID.

```
// Offline creation
memory.placeId = "tmp:abc123"  // temporary reference

// After sync
memory.placeId = "e4f5...8901"  // resolved to permanent UUID
```

Temporary IDs:
- Start with `tmp:` prefix
- Are resolved during sync
- Never persist past sync completion
- Form a dependency graph for sync ordering

### Sync IDs

The sync engine assigns a monotonically increasing `syncId` to each synchronized entity version. Sync IDs enable:
- Incremental sync (fetch entities with syncId > lastSyncId)
- Conflict ordering (higher syncId wins for conflicts)
- Replication tracking (which entities have been replicated to which provider)

### Conflict IDs

When the same entity is modified on two devices simultaneously, a conflict is generated. Each conflict has a unique `conflictId`. Conflicts are:
- Detected by version comparison during sync
- Stored in a conflict resolution queue
- Resolved by merge rules or by user intervention
- Tracked for audit

### Merge Rules

**Last-writer-wins (default):** The version with the highest timestamp wins. Simple, predictable, appropriate for non-critical fields.

**Field-level merge:** For entities where field-level resolution is safe (e.g., profile updates), conflicting fields are merged independently. If `displayName` changed on device A and `bio` changed on device B, both changes are preserved.

**Parent resolution:** For entities where the parent reference changed (e.g., a memory moved from one place to another), the parent change requires confirmation. The system flags the conflict.

**No automatic merge:** For financial data, reservations, and payments, conflicts are never auto-merged. They are flagged for manual resolution.

### Deletion Rules

**Soft delete is the default.** Entities are marked as deleted, not removed. The deletion propagates via sync as a `deletedAt` timestamp. Hard delete only occurs when:
- Legal requirement (GDPR right to erasure)
- Storage cost exceeds retention value
- Explicit admin action with audit trail

**Cascade deletion is explicit.** Parent deletion does not automatically delete children unless the composition relationship explicitly requires it. Orphaned children are flagged for admin review.

---

## 9. Search Strategy

### Searchable Fields

The following fields are searchable across the platform:

| Entity | Searchable Fields | Type |
|--------|------------------|------|
| Destination | name, description, tags | Full-text |
| Locality | name, description | Full-text |
| Place | name, description, placeType | Full-text |
| Experience | name, description, tags | Full-text |
| BusinessTenant | name, description, tags | Full-text |
| Species | scientificName, commonName, tags | Full-text |
| Story | title, subtitle, content | Full-text |
| CommunityMemory | title, content | Full-text |
| Route | name, description | Full-text |

### Indexed Fields

The following fields are indexed for filtering and sorting:

- `id` (primary key)
- `tenantId` (tenant isolation)
- `destinationId` (destination scope)
- `status` (entity lifecycle)
- `createdAt` (time-based queries)
- `updatedAt` (recency sorting)
- `version` (optimistic locking)
- `slug` (URL lookup)
- `ownerId` (owner scope)

### Geo Indexes

Entities with spatial coordinates have geo indexes:

| Entity | Geo Fields | Query Types |
|--------|-----------|-------------|
| Destination | center point, boundary polygon | Near, within |
| Locality | center point, boundary polygon | Near, within |
| Place | point, optionally polygon | Near, within |
| Experience | point | Near |
| Accommodation | point | Near |
| Route | polyline, bounding box | Intersects, near |
| Habitat | boundary polygon | Contains, intersects |
| Observation | point | Near, within |
| Species | distribution polygon | Contains |
| Waypoint | point | Near |

Geo queries include:
- **Near:** Find entities within a radius of a point (e.g., "find experiences near me")
- **Within:** Find entities within a boundary (e.g., "find species within this habitat")
- **Intersects:** Find entities whose paths cross a boundary (e.g., "which routes pass through this park")
- **Bounding box:** Find entities within a rectangular area (e.g., "what's visible on this map viewport")

### Text Indexes

Full-text search indexes for natural language queries:

- Destination names and descriptions
- Place names and descriptions
- Experience names, descriptions, and tags
- Species scientific and common names
- Story titles and content
- Memory titles and content
- Business names and descriptions

Text search supports:
- Stemming (language-aware word roots)
- Stop word removal
- Relevance scoring
- Phrase matching
- Fuzzy matching (typo tolerance)
- Language detection and multi-language fields

### Tag Indexes

Tags are indexed for faceted search and filtering:

| Entity | Tag Type | Example |
|--------|----------|---------|
| Experience | activity tags | "kayaking", "hiking", "photography" |
| Experience | difficulty tags | "beginner", "intermediate", "advanced" |
| Place | place type tags | "beach", "viewpoint", "restaurant" |
| Species | species type tags | "bird", "mammal", "plant" |
| Route | route type tags | "cycling", "trail", "water" |
| Business | service tags | "guided", "equipment-rental" |

### Species Indexes

Species-specific indexes for ecological discovery:

- **Taxonomy tree:** Kingdom > Phylum > Class > Order > Family > Genus > Species
- **Conservation status:** IUCN Red List categories
- **Observation density:** Heat maps of species sightings
- **Seasonality:** When and where species are observable
- **Habitat association:** Which species live in which habitats

### Route Indexes

Route-specific indexes for mobility intelligence:

- **Difficulty level:** Easy, moderate, difficult, extreme
- **Surface type:** Paved, gravel, dirt, sand, rock, water
- **Distance range:** 0-5km, 5-15km, 15-30km, 30km+
- **Elevation gain:** Flat, rolling, hilly, mountainous
- **Activity type:** Cycling, running, hiking, kayaking, diving
- **Condition status:** Open, caution, closed

### Business Indexes

Business-specific indexes for partner discovery:

- **Service type:** Accommodation, tour operator, restaurant, equipment rental
- **Certification:** Eco-certified, locally-owned, accessibility-friendly
- **Rating range:** Average review score filter
- **Price range:** Budget, moderate, premium, luxury
- **Capacity:** Small, medium, large group accommodation

---

## 10. Media Strategy

### Media Ownership

Every media entity has a `creatorId` field that identifies the creating entity (Visitor, Business, Admin). Media also has an `ownerId` field that identifies the entity that holds usage rights. Creator and owner may differ when media is transferred or licensed.

### Metadata

Every media entity has the following metadata:

| Field | Description | Example |
|-------|-------------|---------|
| mimeType | File format | "image/jpeg", "video/mp4" |
| fileSize | Bytes | 245760 |
| width | Pixels (images/video) | 1920 |
| height | Pixels (images/video) | 1080 |
| duration | Seconds (audio/video) | 45.2 |
| altText | Accessibility description | "Sunset over Torres del Paine" |
| caption | Display caption | "The three towers at golden hour" |
| license | Usage license | "CC-BY-4.0", "platform-standard" |
| coordinates | Geo-tag | { lat: -51.0, lng: -72.0 } |
| takenAt | Timestamp of capture | "2026-01-15T18:30:00Z" |
| tags | Searchable labels | ["landscape", "patagonia", "sunset"] |
| credit | Attribution | "Photo by Maria Gonzalez" |

### Storage Abstraction

Media storage is abstracted behind a provider interface. The platform defines storage operations:

- `store(file, metadata)` → mediaId
- `retrieve(mediaId, variant)` → stream
- `delete(mediaId)` → void
- `copy(mediaId, destinationProvider)` → newMediaId

Storage providers can be:
- Local filesystem (development)
- Object storage (S3-compatible, production)
- CDN-backed (global distribution)
- Provider-specific (WordPress media library)

The abstraction ensures that media storage can be migrated, replicated, or distributed without changing capability code.

### Thumbnail Hierarchy

Media processing generates a standard set of variants:

| Variant | Max Dimension | Use Case |
|---------|--------------|----------|
| original | Native | Full resolution, archival |
| xx-large | 1920px | Hero images, full-width displays |
| x-large | 1280px | Detail pages, galleries |
| large | 800px | Card images, listings |
| medium | 400px | Thumbnails, inline content |
| small | 200px | Avatar, preview, grid cells |
| x-small | 100px | Icons, micro-views |
| placeholder | 20px (blurred) | LQIP (low-quality image placeholder) |

All variants are generated on upload and stored alongside the original. Variants are cached indefinitely. The compression pipeline generates variants asynchronously.

### Compression Lifecycle

1. **Upload.** Original file is stored immediately for availability.
2. **Processing.** Async job reads original, generates variants, stores variants.
3. **Optimization.** Variants are compressed (lossy for display, lossless for archival).
4. **Cleanup.** Original may be moved to cold storage after variants are generated (optional per policy).
5. **Regeneration.** Variants can be regenerated from original if compression algorithms improve.

---

## 11. Audit Strategy

### Created

Every entity records:
- `createdById` — Who created the entity
- `createdAt` — When the entity was created
- `createdSource` — Where the creation originated (api, sync, admin, system)

### Updated

Every entity records:
- `updatedById` — Who last modified the entity
- `updatedAt` — When the entity was last modified
- The `version` field increments

### Deleted

For soft-deleted entities:
- `deletedById` — Who deleted the entity
- `deletedAt` — When the entity was deleted
- `isDeleted` — Boolean flag

### Archived

For archived entities:
- `archivedById` — Who archived the entity
- `archivedAt` — When the entity was archived
- `archiveReason` — Why it was archived

### Actor

Every state-changing operation records the actor:
- **Visitor:** `{ type: "visitor", id: "..." }`
- **Business:** `{ type: "business", id: "..." }`
- **Admin:** `{ type: "admin", id: "..." }`
- **System:** `{ type: "system", service: "..." }`
- **Sync:** `{ type: "sync", deviceId: "...", provider: "..." }`
- **API:** `{ type: "api", keyId: "..." }`

### Reason

Audit entries include a reason field:
- `operator` — Manual admin action
- `system` — Automated system action
- `integration` — External system triggered change
- `compliance` — Legal or regulatory requirement
- `user-action` — Visitor or business initiated change
- `sync-resolution` — Conflict resolution during sync
- `migration` — Schema or data migration
- `retention` — Data retention policy enforcement

### Source

Audit entries record the source of the operation:
- `api` — REST API call
- `admin` — Admin panel
- `sync` — Offline synchronization
- `system` — Internal system process
- `webhook` — External webhook
- `migration` — Data migration script

---

## 12. Future Database Mapping

This blueprint is designed to map into multiple persistence technologies without architectural change. The following mappings are conceptual — they describe how the entity catalog would translate to each technology.

### PostgreSQL (Relational)

- **Entities** become tables
- **Composition relationships** become foreign keys with CASCADE delete
- **Aggregation relationships** become foreign keys with SET NULL or RESTRICT
- **Many-to-many relationships** become junction tables
- **JSON fields** use JSONB for flexible attributes
- **Geo indexes** use PostGIS extension
- **Full-text search** use tsvector columns and GIN indexes
- **Versioning** use integer version column with optimistic locking
- **Soft delete** use `deleted_at` nullable timestamp columns
- **Tenant isolation** use `tenant_id` as partition key (declarative partitioning)
- **Audit** use separate audit table or event store

### SQLite (Local/Offline)

- **Entities** become tables
- **Relationships** follow the same foreign key pattern (SQLite supports FK constraints)
- **JSON** uses SQLite's json1 extension
- **Geo queries** use simple lat/lng columns with bounding box filtering
- **Full-text search** uses FTS5 virtual tables
- **Versioning** uses integer version column
- **Synchronization** uses `sync_id`, `updated_at`, `is_deleted` columns
- **No partitioning** (SQLite is per-database single-file)
- **Single-tenant per database** (each device stores its tenant's data)

### IndexedDB (Browser/Offline)

- **Entities** become object stores
- **Relationships** are modeled as indexed properties (not foreign key constraints)
- **Indexes** use IndexedDB index API
- **Geo queries** require manual bounding box filtering (no native geo)
- **Full-text search** requires manual text matching or separate search library
- **Versioning** uses integer version field checked during put operations
- **Offline support** native — IndexedDB is the offline persistence layer
- **Tenant isolation** per-database separation

### Redis (Cache)

- **Entities** mapped to hash structures (`HSET entity:id field value`)
- **Indexes** use sorted sets for range queries, sets for membership
- **Geo queries** use GEOADD, GEORADIUS
- **Full-text search** not applicable (Redis is key-value/cache layer)
- **TTL-based expiration** for cache entities
- **No soft delete** — entities are removed on TTL or eviction
- **No audit** — cache layer has no audit requirements

### Object Storage (Media)

- **Media entities** stored as objects with metadata headers
- **Path structure** follows tenant/destination/entity-type hierarchy
- **Thumbnail variants** stored as separate objects with naming convention
- **CDN** serves as caching and distribution layer
- **No relationships** — object storage is not a relational system
- **No versioning** — object storage uses object versioning if available
- **No audit** — access logging at the storage layer

### Search Engine (Full-text)

- **Searchable entities** indexed as documents
- **Fields** mapped to search engine field types (text, keyword, geo_point, date)
- **Indexes** per entity type or consolidated per tenant
- **Geo queries** native support
- **Faceted search** using field aggregations
- **Typo tolerance** using n-gram or phonetic analyzers
- **Relevance scoring** using TF-IDF or BM25 algorithms
- **Not authoritative** — search engine is read-only projection of the main data store

---

## 13. Architecture Rules

### Persistence Never Leaks into Capabilities

Capabilities are business logic modules. They must not know about persistence details. A capability manager calls `DataManager.get()`, `DataManager.save()`, `DataManager.search()` — it does not know whether the data comes from PostgreSQL, SQLite, IndexedDB, or an in-memory store.

```diff
- // WRONG: Capability knows about database
- const result = await db.query('SELECT * FROM experiences WHERE id = ?', [id])

+ // RIGHT: Capability uses DataManager
+ const result = await this.context.dataManager.get('experience', id)
```

### Capabilities Never Know SQL

SQL is a provider concern. Capabilities operate on domain objects — plain JavaScript objects with known shapes. The DataManager translates domain operations into provider operations. The provider translates data operations into the persistence technology's language.

### Providers Translate

Providers are the only layer that knows about the persistence technology. A PostgreSQL provider knows SQL. An IndexedDB provider knows object stores. A REST provider knows HTTP.

Providers translate between the platform's data operations and the data source's native interface. They do not cache, validate, filter, or apply business logic.

```diff
- // WRONG: Provider applies business rules
- provider.save(entity) {
-   if (entity.status === 'cancelled' && entity.amount > 0) {
-     throw new Error('Cannot cancel with outstanding balance')
-   }
-   return dataSource.insert(entity)
- }

+ // RIGHT: Provider only communicates
+ provider.save(entity) {
+   return dataSource.insert(entity)
+ }
```

### Repositories Abstract

Each aggregate root has a repository. The repository provides a domain-focused interface for accessing the aggregate's entities. Repositories use providers internally but expose a domain vocabulary.

```diff
- // WRONG: Raw DataManager usage in business logic
- const experiences = await dataManager.get('experience', { businessId: id })
- const schedules = await dataManager.get('schedule', { experienceId: experiences.map(e => e.id) })

+ // RIGHT: Repository abstracts the complexity
+ const scheduleRepo = new ExperienceScheduleRepository(dataManager)
+ const schedules = await scheduleRepo.getUpcomingForBusiness(businessId, dateRange)
```

### DataManager Coordinates

DataManager is the central coordinator. It:
- Routes data operations to the correct provider
- Manages cache lifecycle (TTL, invalidation, pre-warming)
- Applies data validation against schemas
- Scopes queries to the current tenant
- Handles offline queue and sync coordination
- Resolves entity references across providers

### Summary

```
Capability Manager
      ↓ (domain objects)
   DataManager
      ↓ (data operations)
   Provider
      ↓ (native operations)
   Data Source
```

Each layer has a distinct responsibility. Layers communicate through well-defined interfaces. No layer crosses boundaries.

**References:** `ARCHITECTURAL-INVARIANTS.md` — INV-002, INV-012, `docs/architecture/LAYER_MODEL.md`, `docs/architecture/DATA_FLOW.md`

---

## 14. Validation Checklist

Before this blueprint is used as the foundation for persistence providers, verify:

### No Duplicated Entities
- [ ] Every domain entity appears exactly once in the Entity Catalog
- [ ] No entity has overlapping responsibilities with another entity
- [ ] Entity boundaries match capability boundaries (capabilities own domains, not entities)

### No Circular Ownership
- [ ] Ownership graph is acyclic
- [ ] No entity owns itself directly or transitively
- [ ] Cross-entity references follow the direction of ownership

### Tenant Safe
- [ ] Every multi-tenant entity has `tenantId` field
- [ ] Every query includes tenant scope
- [ ] Cross-tenant access requires explicit admin context
- [ ] Tenant deletion does not cascade to data from other tenants

### Offline Safe
- [ ] UUIDs are client-generatable (offline creation)
- [ ] Optimistic locking supports conflict detection
- [ ] Sync IDs enable incremental synchronization
- [ ] Temporary IDs resolve during sync
- [ ] Merge rules handle concurrent modifications
- [ ] Soft delete preserves data for conflict resolution

### Scalable
- [ ] One-to-many relationships support pagination
- [ ] Many-to-many relationships use junction entities (not arrays)
- [ ] Geo indexes support spatial queries at destination scale
- [ ] Text indexes support full-text search at platform scale
- [ ] Audit write volume is accounted for (audit is write-heavy)
- [ ] Analytics write volume is accounted for (analytics is write-heavy)

### Multi-Destination Ready
- [ ] Every destination-scoped entity has `destinationId`
- [ ] Destination queries never return cross-destination data without explicit context
- [ ] Destination deletion preserves localities, places, and data (cascade is explicit)
- [ ] Destination-specific configuration is isolated from tenant and platform config

### Multi-Language Ready
- [ ] Text content fields support locale-qualified storage (map of language → text)
- [ ] Search indexes support language-aware stemming
- [ ] Slug uniqueness is scoped within locale or globally (decision per entity type)
- [ ] Media altText and caption are locale-qualified

### Future Proof
- [ ] No technology-specific features chosen (no PostgreSQL-only, no MongoDB-only)
- [ ] Entity catalog can be extended without breaking existing entities
- [ ] Field types are conceptual (string, number, timestamp, reference, JSON) — not database types
- [ ] Index strategy is conceptual (supports multiple index implementations)
- [ ] Versioning strategy supports gradual migration (not all-or-nothing)

---

*Database Blueprint — Valdi Engine*
*P12.0.0 — Domain Model & Database Blueprint*
*Status: Active — Single Source of Truth for persistence*
*Review: Before implementing any persistence provider*
