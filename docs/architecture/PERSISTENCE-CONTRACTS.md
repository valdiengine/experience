# Persistence Contracts

> The permanent contract between Capabilities, Repositories, Persistence Providers, and the Database.
> Everything above the Repository layer must remain completely storage-agnostic.
> No SQL. No ORM. No database choice. Contracts only.

---

## 1. Purpose

### Why Persistence Contracts Exist

The platform must persist data without being coupled to any persistence technology. Capabilities must be developed without knowing whether the data lives in PostgreSQL, SQLite, IndexedDB, Supabase, a REST API, or an in-memory store.

Persistence Contracts define the boundary between business logic and data access. They are the permanent interface that:

- **Capabilities** call to read and write data
- **Repositories** implement to expose domain-specific operations
- **Persistence Providers** translate into technology-specific operations
- **The Database** stores the data in whatever format the provider chooses

These contracts ensure that:

1. **Storage independence** is not aspirational — it is enforced by architecture
2. **Capabilities** are developed against contracts, not implementations
3. **Providers** can be swapped without changing business logic
4. **Offline and online** modes share the same repository interface
5. **Testing** is possible with mock repositories that implement the same contracts
6. **Future technologies** are adopted by writing new providers, not rewriting capabilities

### Problems Solved

**Problem 1: Capabilities leak persistence concerns.**
Without contracts, capabilities import database libraries, construct queries, and handle connection pools. Every capability becomes coupled to the database technology.

**Solution:** Capabilities never import persistence libraries. They call `context.repositories.experience.findAll(filter)` — a domain operation, not a database operation.

**Problem 2: Storage decisions become irreversible.**
When capabilities know about the database, changing the database means changing every capability.

**Solution:** Storage decisions are isolated behind the contract layer. The database can be changed by implementing a new provider against the same contracts.

**Problem 3: Offline sync is ad-hoc.**
Without a contract, each capability implements its own sync logic with different patterns and different reliability.

**Solution:** The contract defines sync operations that all capabilities use consistently.

**Problem 4: Testing requires a database.**
When capabilities use SQL directly, unit tests require a real database connection.

**Solution:** Repositories are injectable. Capabilities test against mock repositories.

**Problem 5: Cross-capability data access has no boundaries.**
Without contracts, Capability A can directly access Capability B's data store.

**Solution:** Repositories are scoped. Capability A can only access its own domain through its own repository.

### Relationship to DATABASE-BLUEPRINT.md

The DATABASE-BLUEPRINT.md defines WHAT data exists — the entities, relationships, and domain model. This document defines HOW data is accessed — the contracts, repositories, and interfaces. Both are required. Neither duplicates the other.

**Reference:** `docs/architecture/DATABASE-BLUEPRINT.md` — Entity definitions and domain model

---

## 2. Architecture Position

### Where Persistence Sits in the Layer Model

The Persistence Contracts layer sits between the Core layer (L1) and the Provider layer (L2). It is not a new layer number — it is a contract boundary that multiple layers respect.

```
L0  Shared         — Entity schemas, base types, utility interfaces
                      ↕ (contract compliance)
L1  Core           — DataManager, EventBus, Bootstrap
                      │
                      │  Capabilities call DataManager
                      │  DataManager delegates to Repositories
                      │
    ─── PERSISTENCE CONTRACTS ─── (this document)
                      │
                      │  Repositories implement contracts
                      │  Repositories delegate to Providers
                      │
L2  Providers      — PersistenceProvider, CacheProvider, SearchProvider
                      │
                      │  Providers translate to technology
                      │
L3  Tenant         — Tenant isolation, multi-tenant configuration
L4  Capabilities   — Business logic, domain operations
L5+ Higher layers  — Engines, Admin, Destination Ecosystem
```

### Data Flow

```
Capability Manager
      │
      │  Calls through context.repositories or DataManager
      ▼
Repository Interface (contract)
      │
      │  Repository implementation delegates
      ▼
Persistence Provider (contract)
      │
      │  Provider translates to technology
      ▼
Database / Storage Engine
```

### No Layer Violations

```
✔ Capability → Repository (via contract)
✔ Repository → PersistenceProvider (via contract)
✔ PersistenceProvider → Database (via technology)

✘ Capability → SQL (violation — capability knows persistence)
✘ Capability → PersistenceProvider (violation — bypasses repository)
✘ Capability → Database (violation — multiple layers bypassed)
✘ Repository → Business Logic (violation — business logic in data layer)
✘ Provider → Domain Rules (violation — domain rules in provider)
```

**Reference:** `docs/architecture/LAYER_MODEL.md`, `docs/architecture/DATA_FLOW.md`

---

## 3. Repository Philosophy

### What a Repository Is

A repository mediates between the domain model and the persistence layer. It provides a domain-focused interface that capabilities call without knowing about databases, queries, or storage technology.

A repository:
- Exposes business operations, not data operations
- Returns domain objects, not database rows
- Encapsulates query logic, pagination, and filtering
- Manages aggregate consistency boundaries
- Coordinates with the persistence provider for technology-specific operations

### Types of Repositories

**Repository.** The general pattern. A repository provides standard CRUD (findById, create, update, delete) plus domain-specific query methods for a single aggregate root. Every aggregate root has exactly one repository.

```diff
- // WRONG: Repository as data access only
- const experience = await experienceRepo.findById(id)
- experience.name = "New Name"
- await experienceRepo.update(experience)

+ // RIGHT: Repository as domain access
+ const experience = await experienceRepo.findBySlug("kayaking-glacier-grey")
+ experience.rename("Kayaking at Grey Glacier")
+ await experienceRepo.save(experience)
```

**Aggregate Repository.** A repository that enforces consistency across an aggregate boundary. When you save a Reservation (the aggregate root), the Aggregate Repository ensures that all ReservationLineItems, ReservationPayments, and ReservationCommunications are saved in a single transaction. The aggregate boundary is defined by the domain model, not by the database schema.

**Read Repository.** An optimized read-focused repository. Returns denormalized data for display purposes. Does not support write operations. Used for projections, dashboards, and search results. A Read Repository may combine data from multiple aggregates.

**Write Repository.** A write-focused repository that enforces consistency constraints. Validates that writes respect aggregate boundaries, ownership rules, and lifecycle states. The Write Repository is the authoritative source for state changes.

**Projection Repository.** A repository that manages read-only projections. Projections are built from event streams and can be rebuilt if lost. The Projection Repository handles the rebuilding process, version tracking, and invalidation.

**Snapshot Repository.** A repository that stores and retrieves aggregate snapshots. Snapshots are point-in-time captures used for performance optimization. The Snapshot Repository is never the source of truth — it is a cache of aggregate state.

**Cache Repository.** A repository that delegates to an in-memory or distributed cache. The Cache Repository follows the same interface as a standard repository but with TTL-based expiration. It always falls back to the authoritative repository on cache miss.

**Search Repository.** A repository that delegates to a search engine (full-text, geo, faceted). The Search Repository translates domain queries into search engine queries and translates results back into domain objects. It is read-only and always falls back to the authoritative repository if the search engine is unavailable.

**Temporary Repository.** A repository for entities created offline that have not yet been synced. The Temporary Repository manages temporary IDs, local-only entities, and the transition from temporary to permanent identity during sync.

```diff
- // Before sync: temporary ID
- const memory = await tempRepo.findById("tmp:abc123")

- // After sync: permanent ID resolved
- const memory = await memoryRepo.findById("e4f5...6789")
```

**Sync Repository.** A repository that manages the synchronization between local and remote data stores. The Sync Repository tracks sync state, handles conflict detection and resolution, and manages the sync queue of pending operations.

**Event Store (future).** A repository that stores events as the authoritative data source (event sourcing). The Event Store appends events, replays event streams, and builds aggregate state from event history. Not yet implemented; the contract is defined here for future compatibility.

### Key Principle

All repository types implement the same core contract. A capability does not know whether it is talking to a standard repository, a cached repository, a syncing repository, or an event-sourced repository. The contract is the same. The implementation differs.

**Reference:** `docs/architecture/DATABASE-BLUEPRINT.md` — Section 1 (Persistence Philosophy), Section 13 (Architecture Rules)

---

## 4. Repository Interfaces

The following are abstract contract definitions. They define the shape of operations, not the implementation. Every repository implements a subset of these operations based on its domain requirements.

### Core Operations

```
Repository.findById(id) → Entity | null
```

Find an entity by its primary identifier. Returns the entity or null if not found. The identifier is a UUID unless the domain specifies otherwise.

```
Repository.findMany(filter, options) → Entity[]
```

Find multiple entities matching the filter criteria. Supports pagination, sorting, and field selection through options. Returns an array of entities.

```
Repository.findFirst(filter, options) → Entity | null
```

Find the first entity matching the filter criteria. Useful for uniqueness checks (find first where slug matches) and single-result lookups. Returns entity or null.

```
Repository.findPage(filter, options) → { items: Entity[], total: number, page: number, pageSize: number, hasMore: boolean }
```

Find a paginated subset of entities matching the filter criteria. Returns both the items and pagination metadata. The total count may be approximate for performance reasons.

```
Repository.create(data) → Entity
```

Create a new entity. Returns the created entity with its generated identifiers. Validates required fields, sets defaults, and applies tenant scoping. May throw if validation fails or if a unique constraint is violated.

```
Repository.update(id, data) → Entity
```

Update an existing entity. Returns the updated entity. Merges the provided data with the existing entity (partial update). May throw if the entity does not exist or if optimistic locking detects a conflict.

```
Repository.delete(id) → void
```

Delete an entity by its identifier. Soft delete is the default behavior (sets isDeleted flag and deletedAt timestamp). Hard delete requires explicit context and is only used for legal compliance (GDPR erasure).

```
Repository.archive(id) → void
```

Archive an entity. Archived entities are read-only. They are excluded from standard queries but can be included with explicit filter options. Archiving is reversible (restore).

```
Repository.restore(id) → Entity
```

Restore an archived entity. Returns the restored entity with its previous state. Restoring does not restore deleted relationships (those must be re-established).

```
Repository.exists(filter) → boolean
```

Check whether at least one entity matches the filter criteria. Returns true if a match exists. More efficient than findMany + length check because it avoids fetching data.

```
Repository.count(filter) → number
```

Count the number of entities matching the filter criteria. Returns the count. The count may be approximate for large result sets.

```
Repository.search(query, options) → SearchResult[]
```

Execute a full-text or hybrid search across the repository's entities. Returns search results with relevance scores, highlights, and metadata. The search operator is typically delegated to a search provider.

```
Repository.filter(criteria) → Entity[]
```

Filter entities by structured criteria. Unlike search, filter is deterministic and does not involve relevance scoring. Filter operations include equality, range, inclusion, and exclusion comparisons.

```
Repository.aggregate(pipeline) → AggregateResult
```

Execute an aggregation pipeline. Aggregations include count, sum, average, min, max, and group-by operations. The pipeline syntax is technology-independent. Results are aggregated values, not entities.

### Transaction Operations

```
Repository.transaction(callback) → Result
```

Execute operations within a transaction. The callback receives a transactional context. All operations within the callback succeed or fail together. Nested transactions may be flattened into the outer transaction.

```
Repository.transaction.begin() → TransactionContext
```

Explicitly begin a transaction. Returns a transaction context that must be passed to all repository operations within the transaction. The caller is responsible for calling commit or rollback.

```
Repository.transaction.commit(context) → void
```

Commit a transaction. All changes made within the transaction become permanent. If the commit fails, the transaction is rolled back.

```
Repository.transaction.rollback(context) → void
```

Roll back a transaction. All changes made within the transaction are discarded. The transaction context is invalidated.

### Pessimistic Locking Operations

```
Repository.lock(id, options) → Entity
```

Acquire a pessimistic lock on an entity. Other writers are blocked until the lock is released. The lock is scoped to the entity and the current transaction. Options include lock mode (shared, exclusive) and timeout.

```
Repository.unlock(id) → void
```

Release a pessimistic lock on an entity. The lock is automatically released when the transaction ends, but explicit unlock enables finer control for long-lived operations.

### Streaming Operations

```
Repository.stream(filter, options) → AsyncIterable<Entity>
```

Stream entities matching the filter criteria as an async iterable. Streaming is used for large result sets where loading all entities into memory is impractical. Each entity is yielded as it becomes available.

```
Repository.watch(filter, options) → AsyncIterable<ChangeEvent>
```

Watch for real-time changes matching the filter criteria. The async iterable yields change events (created, updated, deleted) as they occur. Watch is used for reactive UIs and cross-capability notifications. The watch operation delegates to the EventBus for in-process events and to the provider for cross-process events.

### Sync Operations

```
Repository.sync.push(changes) → SyncResult
```

Push local changes to the remote data store. The changes parameter includes created, updated, and deleted entities. Returns sync results including conflict information.

```
Repository.sync.pull(since) → SyncChanges
```

Pull changes from the remote data store since the last sync timestamp. Returns created, updated, and deleted entities. The since parameter is a sync ID or timestamp.

```
Repository.sync.resolve(conflicts) → SyncResult
```

Resolve conflicts detected during sync. Takes a list of conflicts with resolution choices. Returns the resolved state.

---

## 5. Query Objects

Query objects are technology-independent specifications for data retrieval. They are passed to repository methods and translated to the provider's native query language.

### Filter

```
Filter {
  field: string              // The field to filter on
  operator: FilterOperator   // eq, neq, gt, gte, lt, lte, in, notIn, contains, startsWith, endsWith, between, exists, notExists
  value: any                 // The value to compare against
  caseSensitive?: boolean    // Whether string comparison is case-sensitive (default: false)
}
```

Filters are composable. Multiple filters are combined with AND logic by default. OR logic is supported through filter groups.

```
FilterGroup {
  logicalOperator: 'AND' | 'OR' | 'NOT'
  conditions: Filter[]
  groups?: FilterGroup[]     // Nested filter groups for complex queries
}
```

### Sort

```
Sort {
  field: string               // The field to sort by
  direction: 'asc' | 'desc'   // Sort direction
  nulls?: 'first' | 'last'    // Null value placement (default: last)
}
```

Multiple sorts are applied in order. The first sort has the highest priority.

### Pagination

```
PageRequest {
  page: number                // Page number (1-indexed)
  pageSize: number            // Items per page (max: 1000, default: 20)
}

CursorRequest {
  cursor: string              // Opaque cursor from previous response
  limit: number               // Items to return (max: 1000, default: 20)
  direction?: 'forward' | 'backward'  // Cursor direction (default: forward)
}
```

Cursor-based pagination is preferred for large datasets because it is stable under concurrent writes. Page-based pagination is used for simple lists where cursor complexity is unnecessary.

### Cursor

```
Cursor {
  value: string               // The opaque cursor value
  field: string               // The field the cursor is based on
  type: 'id' | 'timestamp' | 'composite'
}
```

Cursors are opaque to the caller. The repository creates cursors and resolves them internally. Cursors may encode the last seen value of the sort field, the entity ID, and a version token.

### Projection

```
Projection {
  fields?: string[]           // Fields to include (empty means all fields)
  exclude?: string[]          // Fields to exclude
  transforms?: Transform[]    // Field transformations to apply
}
```

Projections control which fields are returned. They are used to reduce payload size for large entities and to restrict sensitive fields.

### Selection

```
Selection {
  includes: RelationPath[]    // Relations to eagerly load
  depth?: number              // Maximum depth for nested includes (default: 1)
}
```

Selections control which related entities are loaded eagerly. The includes specify paths through the relationship graph. Depth limits prevent excessive loading.

```
// Example: Load experience with its variants, pricing, and primary media
Selection {
  includes: [
    'variants',
    'pricing.current',
    'media.primary'
  ],
  depth: 2
}
```

### Specification

```
Specification {
  name: string                // Named specification
  parameters?: Record<string, any>  // Parameters for parameterized specs
}
```

Specifications are reusable, named query patterns. Examples include:
- `active` — Entities with status = active
- `availableToday` — Entities with availability at current date
- `nearLocation` — Entities within distance of coordinates
- `ownedByVisitor` — Entities where visitorId matches
- `seasonal` — Entities relevant to current season

Specifications are composable. Multiple specifications can be combined.

```
SpecificationGroup {
  logicalOperator: 'AND' | 'OR'
  specifications: Specification[]
}
```

### GeoQuery

```
GeoQuery {
  type: 'near' | 'within' | 'intersects' | 'contains'
  center?: { lat: number, lng: number }     // For 'near' queries
  radius?: number                            // For 'near' queries (meters)
  polygon?: { lat: number, lng: number }[]  // For 'within', 'intersects', 'contains'
  boundingBox?: {                            // For bounding box queries
    north: number,
    south: number,
    east: number,
    west: number
  }
  unit?: 'meters' | 'kilometers' | 'miles'  // Distance unit (default: meters)
}
```

Geo queries are technology-independent. The provider translates to PostGIS, SQLite spatial, or search engine geo as appropriate.

### TimeRange

```
TimeRange {
  start: string               // Start date/time (ISO 8601)
  end: string                 // End date/time (ISO 8601)
  type: 'inclusive' | 'exclusive' | 'exclusive-start' | 'exclusive-end'
  timezone?: string           // IANA timezone (e.g., 'America/Santiago')
}
```

TimeRange defines intervals for temporal queries. It covers availability slots, reservations, seasonal patterns, and time-based filtering.

### FullTextQuery

```
FullTextQuery {
  query: string                               // The search text
  fields?: string[]                           // Fields to search (default: all searchable fields)
  language?: string                           // Language for stemming and stop words
  fuzzy?: boolean                             // Enable fuzzy matching (default: true)
  fuzzyThreshold?: number                     // Fuzzy match threshold (0-1, default: 0.7)
  highlight?: {                               // Highlight configuration
    preTag?: string,                            // Tag before highlight (default: '<mark>')
    postTag?: string                            // Tag after highlight (default: '</mark>')
  }
  weights?: Record<string, number>            // Field-specific weight boost
  minimumMatch?: number                       // Minimum matching clauses (default: 1)
}
```

### RelationshipQuery

```
RelationshipQuery {
  type: 'hasMany' | 'belongsTo' | 'manyToMany'
  entity: string                // The related entity type
  filter?: FilterGroup          // Filter on the related entity
  through?: string              // Junction entity for many-to-many
  recursive?: boolean           // Whether to recurse hierarchical relationships
  maxDepth?: number             // Maximum recursion depth
}
```

### TagQuery

```
TagQuery {
  tags: string[]                // Tags to match
  mode: 'any' | 'all' | 'exact'  // Match mode
  namespace?: string            // Tag namespace for scoping
}
```

### SpeciesQuery

```
SpeciesQuery {
  taxonomy?: {                  // Taxonomy filter
    kingdom?: string,
    phylum?: string,
    class?: string,
    order?: string,
    family?: string,
    genus?: string
  }
  conservationStatus?: string[] // IUCN statuses
  seasonality?: string          // Observable in current season
  habitat?: string[]            // Associated habitat IDs
  observedBy?: string           // Visitor ID who observed
  observedSince?: string        // Observations since date
}
```

### RouteQuery

```
RouteQuery {
  activityType?: string[]       // Cycling, hiking, kayaking, diving
  difficulty?: string[]         // Easy, moderate, difficult, extreme
  surfaceType?: string[]        // Paved, gravel, dirt, sand, rock, water
  distanceMin?: number          // Minimum distance (meters)
  distanceMax?: number          // Maximum distance (meters)
  elevationMin?: number         // Minimum elevation gain (meters)
  elevationMax?: number         // Maximum elevation gain (meters)
  conditionStatus?: string      // Open, caution, closed
  intersectsGeo?: GeoQuery     // Routes that intersect a geographic area
}
```

### BusinessQuery

```
BusinessQuery {
  serviceTypes?: string[]       // Accommodation, tour operator, restaurant
  certifications?: string[]     // Eco-certified, locally-owned
  ratingMin?: number            // Minimum average rating (1-5)
  priceRange?: string[]         // Budget, moderate, premium, luxury
  capacityMin?: number          // Minimum group capacity
  servesDestination?: string    // Operating within a destination
  hasExperiences?: boolean      // Has active experiences
  openNow?: boolean             // Currently operating
}
```

---

## 6. Repository Contracts per Domain

Each domain defines a repository interface with domain-specific operations. Standard CRUD operations (findById, create, update, delete) are inherited from the core repository interface and are not repeated here. Only domain-specific operations are listed.

### PlatformRepository

```
PlatformRepository {
  getConfig(): PlatformConfiguration
  updateConfig(changes: Partial<PlatformConfiguration>): PlatformConfiguration
  getFeatureFlags(): FeatureFlag[]
  getMetrics(): PlatformMetric[]
  recordMetric(metric: PlatformMetric): void
  getHealth(): PlatformHealthStatus
}
```

### TenantRepository

```
TenantRepository {
  findBySlug(slug: string): Tenant | null
  findByDomain(domain: string): Tenant | null
  findActive(): Tenant[]
  findSuspended(): Tenant[]
  getSubscription(tenantId: string): TenantSubscription
  getUsage(tenantId: string, period: TimeRange): TenantUsage
  getUsers(tenantId: string): TenantUser[]
  getRoles(tenantId: string): TenantRole[]
  createUser(tenantId: string, data: CreateTenantUser): TenantUser
  deactivate(tenantId: string): void
  activate(tenantId: string): void
  getConfig(tenantId: string): TenantConfiguration
  updateConfig(tenantId: string, changes: Partial<TenantConfiguration>): TenantConfiguration
}
```

### DestinationRepository

```
DestinationRepository {
  findBySlug(slug: string): Destination | null
  findActive(): Destination[]
  findPublic(): Destination[]                   // Visible to non-authenticated users
  findByTenant(tenantId: string): Destination[]
  search(query: FullTextQuery): Destination[]
  searchGeo(query: GeoQuery): Destination[]
  getHierarchy(id: string): DestinationHierarchy
  getHealthScore(id: string): DestinationHealthScore
  getPWAConfig(id: string): DestinationPWAConfig
  getSEOData(id: string): DestinationSEOData
  getRoutes(id: string): Route[]
  getEcologySummary(id: string): EcologySummary
  getStatistics(id: string, period: TimeRange): DestinationStatistics
  activate(id: string): void
  archive(id: string): void
}
```

### LocalityRepository

```
LocalityRepository {
  findBySlug(destinationId: string, slug: string): Locality | null
  findByDestination(destinationId: string): Locality[]
  searchGeo(query: GeoQuery): Locality[]
  getPlaces(id: string): Place[]
  getExperiences(id: string): Experience[]
  getStatistics(id: string, period: TimeRange): LocalityStatistics
}
```

### BusinessRepository

```
BusinessRepository {
  findBySlug(destinationId: string, slug: string): BusinessTenant | null
  findByTenant(tenantId: string): BusinessTenant[]
  findByDestination(destinationId: string): BusinessTenant[]
  findCertified(destinationId: string): BusinessTenant[]
  search(query: BusinessQuery): BusinessTenant[]
  searchGeo(query: GeoQuery): BusinessTenant[]
  getExperiences(id: string): Experience[]
  getReviews(id: string, filter: ReviewFilter): Review[]
  getRating(id: string): BusinessRating
  getVerificationStatus(id: string): BusinessVerification
  verify(id: string, verification: BusinessVerification): void
  getCertifications(id: string): Certification[]
  awardCertification(id: string, certification: string): void
  revokeCertification(id: string, certification: string): void
  activate(id: string): void
  suspend(id: string, reason: string): void
}
```

### ExperienceRepository

```
ExperienceRepository {
  findBySlug(destinationId: string, slug: string): Experience | null
  findByBusiness(businessId: string): Experience[]
  findByPlace(placeId: string): Experience[]
  findActive(): Experience[]
  findAvailable(filter: AvailabilityFilter): Experience[]
  search(query: FullTextQuery): Experience[]
  searchGeo(query: GeoQuery): Experience[]
  searchByTags(query: TagQuery): Experience[]
  getVariants(id: string): ExperienceVariant[]
  getSchedules(id: string, range: TimeRange): ExperienceSchedule[]
  getPricing(id: string, date: string): ExperiencePricing
  getMedia(id: string): Media[]
  getAvailability(id: string, range: TimeRange): AvailabilitySlot[]
  getUpcoming(id: string, limit: number): Experience[]
  getSimilar(id: string, limit: number): Experience[]
  getCategories(): ExperienceCategory[]
  getTags(): ExperienceTag[]
  publish(id: string): void
  unpublish(id: string): void
  duplicate(id: string): Experience
}
```

### ReservationRepository

```
ReservationRepository {
  findByCode(code: string): Reservation | null
  findByVisitor(visitorId: string): Reservation[]
  findByBusiness(businessId: string): Reservation[]
  findByExperience(experienceId: string): Reservation[]
  findActiveByVisitor(visitorId: string): Reservation[]
  findUpcoming(visitorId: string, date: string): Reservation[]
  findInDateRange(range: TimeRange): Reservation[]
  getStatusHistory(id: string): ReservationStatusEvent[]
  getPayments(id: string): ReservationPayment[]
  getCommunications(id: string): ReservationCommunication[]
  cancel(id: string, reason: string): void
  confirm(id: string): void
  complete(id: string): void
  refund(id: string, amount: number, reason: string): void
  getStatistics(businessId: string, period: TimeRange): ReservationStatistics
  getOccupancyRates(destinationId: string, period: TimeRange): OccupancyReport
}
```

### AvailabilityRepository

```
AvailabilityRepository {
  findByExperience(experienceId: string, range: TimeRange): AvailabilitySlot[]
  findByBusiness(businessId: string, range: TimeRange): AvailabilitySlot[]
  findOpenSlots(experienceId: string, range: TimeRange): AvailabilitySlot[]
  createSlots(experienceId: string, slots: CreateSlot[]): AvailabilitySlot[]
  blockSlot(slotId: string, reason: string): void
  unblockSlot(slotId: string): void
  reserveSlot(slotId: string, reservationId: string): void
  releaseSlot(slotId: string): void
  getCalendar(experienceId: string, month: string): AvailabilityCalendar
  getRules(experienceId: string): AvailabilityRule[]
  setRules(experienceId: string, rules: AvailabilityRule[]): void
  getExceptions(experienceId: string, range: TimeRange): AvailabilityException[]
  addException(experienceId: string, exception: AvailabilityException): void
  removeException(exceptionId: string): void
}
```

### VisitorRepository

```
VisitorRepository {
  findByIdentity(identityId: string): Visitor | null
  findByEmail(email: string): Visitor | null
  findByHandle(handle: string): Visitor | null
  findActive(): Visitor[]
  getProfile(id: string): VisitorProfile
  getPreferences(id: string): VisitorPreferences
  getReputation(id: string): VisitorReputation
  getLevel(id: string): VisitorLevel
  getEcoScore(id: string): VisitorEcoScore
  getEcoTokens(id: string): VisitorEcoToken[]
  getBadges(id: string): BadgeAward[]
  getReservations(id: string): Reservation[]
  getMemories(id: string): CommunityMemory[]
  getObservations(id: string): Observation[]
  getVisitedDestinations(id: string): Destination[]
  updatePreferences(id: string, changes: Partial<VisitorPreferences>): void
  updateConsent(id: string, changes: VisitorConsent): void
  deactivate(id: string): void
  requestErasure(id: string): void  // GDPR compliance
}
```

### IdentityRepository

```
IdentityRepository {
  findByEmail(email: string): Identity | null
  findByExternalId(provider: string, externalId: string): Identity | null
  authenticate(email: string, password: string): Identity | null
  createSession(identityId: string, device: DeviceInfo): IdentitySession
  revokeSession(sessionId: string): void
  getActiveSessions(identityId: string): IdentitySession[]
  createToken(identityId: string, scope: string[]): IdentityToken
  revokeToken(tokenId: string): void
  getPermissions(identityId: string): IdentityPermission[]
  hasPermission(identityId: string, permission: string): boolean
  assignRole(identityId: string, roleId: string): void
  removeRole(identityId: string, roleId: string): void
  lock(identityId: string): void
  unlock(identityId: string): void
  getAuditLog(identityId: string): IdentityAuditLog[]
}
```

### CommunityRepository

```
CommunityRepository {
  findMembers(destinationId: string): CommunityMember[]
  findTopContributors(destinationId: string, period: TimeRange, limit: number): CommunityMember[]
  findRecentActivity(destinationId: string, limit: number): CommunityActivity[]
  getMemberStats(memberId: string): MemberStatistics
  getMemories(placeId: string): CommunityMemory[]
  getReviews(businessId: string): CommunityReview[]
  getInteractions(memberId: string): CommunityInteraction[]
  createMemory(memory: CreateMemory): CommunityMemory
  createReview(review: CreateReview): CommunityReview
  flagContent(contentId: string, reason: string): void
  moderate(contentId: string, action: ModerationAction): void
  getModerationQueue(destinationId: string, status: ModerationStatus): ModerationItem[]
  resolveReport(reportId: string, resolution: string): void
  getReputationLevels(): ReputationLevel[]
}
```

### StoryRepository

```
StoryRepository {
  findBySlug(destinationId: string, slug: string): Story | null
  findByDestination(destinationId: string): Story[]
  findByTheme(themeId: string): Story[]
  findByType(storyType: string): Story[]
  findPublished(): Story[]
  findFeatured(destinationId: string): Story[]
  getChapters(storyId: string): StoryChapter[]
  getCharacters(storyId: string): StoryCharacter[]
  getThemes(storyId: string): StoryTheme[]
  getMedia(storyId: string): Media[]
  getValidationStatus(storyId: string): StoryValidation
  submit(storyId: string): void
  publish(storyId: string): void
  validate(storyId: string, validation: StoryValidation): void
  archive(storyId: string): void
  getHeritage(destinationId: string): Heritage[]
  getLocalHeroes(destinationId: string): LocalHero[]
  getCulturalMemory(destinationId: string): CulturalMemory[]
  preserveCulturalMemory(memoryId: string): void
}
```

### SpeciesRepository

```
SpeciesRepository {
  findById(id: string): Species | null
  findByScientificName(name: string): Species | null
  findByCommonName(name: string): Species[]
  findByDestination(destinationId: string): Species[]
  findByHabitat(habitatId: string): Species[]
  findByTaxonomy(query: SpeciesQuery): Species[]
  findByConservationStatus(status: string): Species[]
  searchByName(query: string): Species[]
  searchGeo(query: GeoQuery): Species[]
  getObservations(speciesId: string): Observation[]
  getPhotos(speciesId: string): Media[]
  getSeasonality(speciesId: string): SpeciesSeasonality
  getConservationStatus(speciesId: string): SpeciesConservationStatus
  getHabitatAssociation(speciesId: string): Habitat[]
  recordObservation(observation: CreateObservation): Observation
  validateObservation(observationId: string, validation: ObservationValidation): void
  getSpeciesCount(destinationId: string): SpeciesCountSummary
  getDexEntry(destinationId: string, type: DexType): DexEntry[]
}
```

### HabitatRepository

```
HabitatRepository {
  findByName(destinationId: string, name: string): Habitat | null
  findByDestination(destinationId: string): Habitat[]
  findByType(habitatType: string): Habitat[]
  searchGeo(query: GeoQuery): Habitat[]
  getHealthScore(id: string): HabitatHealthScore[]
  getHealthHistory(id: string, period: TimeRange): HabitatHealthScore[]
  getConservationActions(id: string): ConservationAction[]
  getMonitoringData(id: string, range: TimeRange): MonitoringData[]
  getSpeciesCount(id: string): HabitatSpeciesCount
  recordHealthScore(id: string, score: HabitatHealthScore): void
  addConservationAction(id: string, action: ConservationAction): void
  completeConservationAction(actionId: string): void
}
```

### ObservationRepository

```
ObservationRepository {
  findByVisitor(visitorId: string): Observation[]
  findBySpecies(speciesId: string): Observation[]
  findByHabitat(habitatId: string): Observation[]
  findPendingValidation(destinationId: string): Observation[]
  findValidated(destinationId: string): Observation[]
  searchGeo(query: GeoQuery): Observation[]
  getValidation(observationId: string): ObservationValidation
  getTrustScore(observationId: string): ObservationTrustScore
  getObservationHeatmap(destinationId: string): ObservationHeatmapData
  getObservationTrends(destinationId: string, period: TimeRange): ObservationTrend
  validate(observationId: string, validation: ObservationValidation): void
  flagInvalid(observationId: string, reason: string): void
}
```

### ChallengeRepository

```
ChallengeRepository {
  findBySlug(destinationId: string, slug: string): Challenge | null
  findByDestination(destinationId: string): Challenge[]
  findActive(): Challenge[]
  findByDifficulty(level: string): Challenge[]
  getMissions(challengeId: string): ChallengeMission[]
  getObjectives(missionId: string): ChallengeObjective[]
  getRewards(challengeId: string): ChallengeReward[]
  getParticipants(challengeId: string): ChallengeParticipant[]
  getProgress(challengeId: string, visitorId: string): ChallengeProgress
  getLeaderboard(challengeId: string, limit: number): ChallengeLeaderboardEntry[]
  join(challengeId: string, visitorId: string): void
  leave(challengeId: string, visitorId: string): void
  submitProgress(challengeId: string, missionId: string, visitorId: string, evidence: any): void
  approveProgress(progressId: string): void
  rejectProgress(progressId: string, reason: string): void
  awardReward(participantId: string, reward: ChallengeReward): void
  activate(challengeId: string): void
  complete(challengeId: string): void
}
```

### CampaignRepository

```
CampaignRepository {
  findBySlug(destinationId: string, slug: string): Campaign | null
  findByDestination(destinationId: string): Campaign[]
  findByType(type: string): Campaign[]
  findActive(): Campaign[]
  findCurrent(destinationId: string): Campaign[]       // Active at current date
  getMilestones(campaignId: string): CampaignMilestone[]
  getBudget(campaignId: string): CampaignBudget
  getMetrics(campaignId: string): CampaignMetrics
  getTimeline(campaignId: string): CampaignTimeline
  launch(campaignId: string): void
  pause(campaignId: string): void
  resume(campaignId: string): void
  complete(campaignId: string): void
  cancel(campaignId: string, reason: string): void
  addMilestone(campaignId: string, milestone: CampaignMilestone): void
  reportMetric(campaignId: string, metric: CampaignMetric): void
}
```

### BadgeRepository

```
BadgeRepository {
  findBySlug(destinationId: string, slug: string): Badge | null
  findByDestination(destinationId: string): Badge[]
  findByCategory(categoryId: string): Badge[]
  findActive(): Badge[]
  getTiers(badgeId: string): BadgeTier[]
  getRequirements(badgeId: string): BadgeRequirement[]
  getAwards(badgeId: string): BadgeAward[]
  award(visitorId: string, badgeId: string, tier: number): BadgeAward
  revoke(awardId: string, reason: string): void
  getVisitorBadges(visitorId: string): BadgeAward[]
  getBadgeProgress(visitorId: string, badgeId: string): BadgeProgress
}
```

### RouteRepository

```
RouteRepository {
  findBySlug(destinationId: string, slug: string): Route | null
  findByDestination(destinationId: string): Route[]
  findByActivityType(type: string): Route[]
  findByDifficulty(level: string): Route[]
  findOpen(): Route[]                                   // Condition status = open
  search(query: RouteQuery): Route[]
  searchGeo(query: GeoQuery): Route[]
  getSegments(routeId: string): RouteSegment[]
  getWaypoints(routeId: string): RouteWaypoint[]
  getElevationProfile(routeId: string): ElevationProfile
  getConditions(routeId: string): RouteCondition
  getConditionHistory(routeId: string, period: TimeRange): RouteCondition[]
  getReports(routeId: string): RouteReport[]
  getFavorites(visitorId: string): RouteFavorite[]
  addFavorite(routeId: string, visitorId: string): void
  removeFavorite(routeId: string, visitorId: string): void
  reportCondition(routeId: string, report: RouteConditionReport): void
  getSpeciesObservations(routeId: string): RouteSpeciesObserved[]
}
```

### NotificationRepository

```
NotificationRepository {
  findByRecipient(recipientId: string): Notification[]
  findUnread(recipientId: string): Notification[]
  findPending(): Notification[]                         // Not yet delivered
  findFailed(): Notification[]                          // Delivery failed
  markRead(notificationId: string): void
  markAllRead(recipientId: string): void
  getDeliveryStatus(notificationId: string): DeliveryStatus
  getPreferences(recipientId: string): NotificationPreference
  updatePreferences(recipientId: string, changes: Partial<NotificationPreference>): void
  retryFailed(notificationId: string): void
  cancelPending(notificationId: string): void
  getStatistics(period: TimeRange): NotificationStatistics
}
```

### MediaRepository

```
MediaRepository {
  findByCreator(creatorId: string): Media[]
  findByEntity(entityType: string, entityId: string): Media[]
  findByType(mimeType: string): Media[]
  findUnprocessed(): Media[]                             // Variants not yet generated
  findOrphaned(): Media[]                                // No references from any entity
  getVariants(mediaId: string): MediaVariant[]
  getMetadata(mediaId: string): MediaMetadata
  getLicense(mediaId: string): MediaLicense
  updateMetadata(mediaId: string, changes: Partial<MediaMetadata>): void
  processVariants(mediaId: string): void
  regenerateVariants(mediaId: string): void
  transferOwnership(mediaId: string, newOwnerId: string): void
  reference(mediaId: string, entityType: string, entityId: string): void
  dereference(mediaId: string, entityType: string, entityId: string): void
  getStorageUsage(ownerId: string): StorageUsage
  getTotalStorage(): StorageUsage
}
```

### PaymentRepository

```
PaymentRepository {
  findByReservation(reservationId: string): Payment[]
  findByVisitor(visitorId: string): Payment[]
  findByBusiness(businessId: string): Payment[]
  findPending(): Payment[]
  findFailed(): Payment[]
  findByDateRange(range: TimeRange): Payment[]
  getTransactions(paymentId: string): PaymentTransaction[]
  getFees(paymentId: string): PaymentFee[]
  getDisputes(paymentId: string): PaymentDispute[]
  process(payment: ProcessPayment): Payment
  refund(paymentId: string, amount: number, reason: string): Payment
  dispute(paymentId: string, reason: string): PaymentDispute
  resolveDispute(disputeId: string, resolution: string): void
  reconcile(date: string): ReconciliationReport
  getStatistics(businessId: string, period: TimeRange): PaymentStatistics
  getPayouts(businessId: string, period: TimeRange): PaymentPayout[]
}
```

### SubscriptionRepository

```
SubscriptionRepository {
  findByTenant(tenantId: string): Subscription | null
  findActive(): Subscription[]
  findExpiring(withinDays: number): Subscription[]
  findTrials(): Subscription[]
  getPlan(planId: string): SubscriptionPlan
  getPlans(): SubscriptionPlan[]
  getPeriods(subscriptionId: string): SubscriptionPeriod[]
  getInvoices(subscriptionId: string): SubscriptionInvoice[]
  upgrade(subscriptionId: string, newPlanId: string): Subscription
  downgrade(subscriptionId: string, newPlanId: string): Subscription
  cancel(subscriptionId: string, reason: string): void
  reactivate(subscriptionId: string): void
  applyPromo(subscriptionId: string, code: string): void
  getUsage(subscriptionId: string, period: TimeRange): SubscriptionUsage
  generateInvoice(subscriptionId: string): SubscriptionInvoice
}
```

### AnalyticsRepository

```
AnalyticsRepository {
  recordEvent(event: AnalyticsEvent): void
  recordSession(session: AnalyticsSession): void
  recordPageView(pageView: AnalyticsPageView): void
  recordConversion(conversion: AnalyticsConversion): void
  getVisitorAnalytics(visitorId: string, period: TimeRange): VisitorAnalytics
  getDestinationAnalytics(destinationId: string, period: TimeRange): DestinationAnalytics
  getBusinessAnalytics(businessId: string, period: TimeRange): BusinessAnalytics
  getPlatformAnalytics(period: TimeRange): PlatformAnalytics
  getConversionFunnel(destinationId: string, period: TimeRange): ConversionFunnel
  getVisitorFlow(destinationId: string, period: TimeRange): VisitorFlowData
  getPopularTimes(destinationId: string): PopularTimes
  getTopSearches(destinationId: string, limit: number): TopSearch[]
  getRecommendations(visitorId: string, context: RecommendationContext): Recommendation[]
  getReport(reportId: string): AnalyticsReport
  scheduleReport(report: ScheduleReport): void
  getDashboard(dashboardId: string): AnalyticsDashboard
  aggregateEvents(pipeline: AggregatePipeline): AggregateResult
}
```

### AuditRepository

```
AuditRepository {
  record(entry: AuditEntry): void
  findByResource(resourceType: string, resourceId: string): AuditEntry[]
  findByActor(actorId: string): AuditEntry[]
  findByAction(action: string): AuditEntry[]
  findByDateRange(range: TimeRange): AuditEntry[]
  findByReason(reason: string): AuditEntry[]
  findBySource(source: string): AuditEntry[]
  getChangeHistory(resourceType: string, resourceId: string): AuditEntry[]
  getVisitorActivity(visitorId: string, period: TimeRange): AuditActivitySummary
  getAdminActivity(adminId: string, period: TimeRange): AuditActivitySummary
  getRetentionPolicy(): AuditRetentionPolicy
  applyRetentionPolicy(): number          // Returns count of archived entries
  exportForCompliance(period: TimeRange): AuditExport
}
```

### GovernanceRepository

```
GovernanceRepository {
  findPolicies(destinationId: string): GovernancePolicy[]
  findActivePolicies(destinationId: string): GovernancePolicy[]
  getRules(policyId: string): GovernanceRule[]
  getWorkflows(policyId: string): GovernanceWorkflow[]
  getRoles(destinationId: string): GovernanceRole[]
  getPermissions(roleId: string): GovernancePermission[]
  getApprovals(pendingForId: string): GovernanceApproval[]
  getReviews(destinationId: string): GovernanceReview[]
  getViolations(destinationId: string): GovernanceViolation[]
  createPolicy(policy: CreatePolicy): GovernancePolicy
  activatePolicy(policyId: string): void
  archivePolicy(policyId: string): void
  createRole(role: CreateRole): GovernanceRole
  assignRole(identityId: string, roleId: string): void
  removeRole(identityId: string, roleId: string): void
  submitForApproval(resourceType: string, resourceId: string): GovernanceApproval
  approve(approvalId: string, comment: string): void
  reject(approvalId: string, reason: string): void
  reportViolation(violation: ReportViolation): GovernanceViolation
  resolveViolation(violationId: string, resolution: string): void
}
```

### OperationsRepository

```
OperationsRepository {
  findAlerts(destinationId: string): OperationAlert[]
  findOpenAlerts(destinationId: string): OperationAlert[]
  findAlertsBySeverity(destinationId: string, severity: string): OperationAlert[]
  getSchedules(destinationId: string): OperationSchedule[]
  getTasks(destinationId: string): OperationTask[]
  getOpenTasks(destinationId: string): OperationTask[]
  getMaintenance(destinationId: string): OperationMaintenance[]
  getScheduledMaintenance(destinationId: string): OperationMaintenance[]
  getReports(destinationId: string): OperationReport[]
  getSeasonProfile(destinationId: string): OperationSeasonProfile
  getMetrics(destinationId: string): OperationMetric[]
  getHealthDashboard(destinationId: string): HealthDashboard
  raiseAlert(destinationId: string, alert: CreateAlert): OperationAlert
  acknowledgeAlert(alertId: string): void
  resolveAlert(alertId: string, resolution: string): void
  createTask(task: CreateTask): OperationTask
  completeTask(taskId: string): void
  updateSeasonProfile(destinationId: string, changes: Partial<OperationSeasonProfile>): void
  getStatistics(destinationId: string, period: TimeRange): OperationsStatistics
}
```

---

## 7. Transaction Model

### Unit of Work

A Unit of Work tracks all changes made during a business operation and persists them atomically. The Unit of Work is created by the repository and managed through the transaction context.

```
UnitOfWork {
  begin(): TransactionContext
  registerNew(entity: Entity): void
  registerDirty(entity: Entity): void
  registerDeleted(entity: Entity): void
  registerClean(entity: Entity): void
  commit(): void
  rollback(): void
  getChanges(): { new: Entity[], dirty: Entity[], deleted: Entity[] }
}
```

### Aggregate Boundaries

Transactions must not cross aggregate boundaries. Each aggregate root defines its own transactional boundary. If a business operation affects multiple aggregates, it must use eventual consistency through the EventBus rather than a distributed transaction.

```
// WRONG: Transaction across aggregate boundaries
transaction {
  experienceRepo.update(experience)
  businessRepo.update(business)  // Different aggregate
  destinationRepo.update(destination)  // Different aggregate
}

// RIGHT: Eventual consistency across aggregates
experienceRepo.update(experience)
eventBus.emit('experience:updated', { experienceId: experience.id })
// Business and destination aggregates react to the event
```

### Transaction Scope

Transactions are scoped to a single repository by default. When a business operation legitimately needs to write to multiple repositories within the same aggregate boundary (e.g., Reservation and ReservationLineItem), a cross-repository transaction is supported but must be explicitly declared.

```
crossRepoTransaction({
  scope: ['experience', 'availability'],  // Repositories involved
  isolation: 'read-committed',
  timeout: 5000,
  callback: async (tx) => {
    const experience = await tx.experienceRepo.findById(experienceId)
    experience.status = 'inactive'
    await tx.experienceRepo.update(experience)
    const slots = await tx.availabilityRepo.findByExperience(experienceId)
    // Block all future slots
    slots.forEach(slot => tx.availabilityRepo.blockSlot(slot.id))
  }
})
```

### Nested Transactions

Nested transactions are flattened into the outer transaction. Savepoints may be supported by the underlying provider but are not part of the contract. If a nested transaction fails, the entire outer transaction fails.

### Long-Running Workflows

Long-running workflows are not executed within a database transaction. They use the Workflow Engine (L7) with compensation steps. The persistence contract supports this through saga coordination hooks.

```
SagaCoordinator {
  registerStep(step: SagaStep): void
  execute(sagaId: string): SagaResult
  compensate(sagaId: string): void
  getStatus(sagaId: string): SagaStatus
}

SagaStep {
  name: string
  execute: (context) => Promise<StepResult>
  compensate: (context) => Promise<void>
  retryPolicy: RetryPolicy
}
```

### Failure Handling

| Failure Type | Behavior |
|-------------|----------|
| Validation error | Transaction rejected before any write |
| Optimistic lock conflict | Transaction rejected, caller must retry with fresh state |
| Provider unavailable | Transaction rejected after configurable retries |
| Constraint violation | Transaction rejected, detailed error returned |
| Timeout | Transaction rolled back, caller notified |
| Provider-side error | Transaction rolled back, error logged for audit |
| Saga step failure | Saga compensation executed for all completed steps |

---

## 8. Offline Contracts

### Temporary IDs

Entities created offline receive a temporary ID prefix that distinguishes them from permanent IDs. The temporary ID is resolved to a permanent UUID during synchronization.

```
TemporaryId = `tmp:${clientId}:${localCounter}`

// Example: "tmp:device-abc123:42"
```

The Temporary ID contract:
- Generated client-side without server coordination
- Unique within the client's namespace (cross-client collisions are expected)
- Stored in the entity's `temporaryId` field until resolution
- Resolved during sync (the permanent UUID replaces the temporary ID)
- Referenced by other entities that were created offline (dependency chains)

### Conflict IDs

When two clients modify the same entity offline, a conflict is generated during sync.

```
Conflict {
  conflictId: string            // Unique conflict identifier
  entityType: string            // Entity type
  entityId: string              // Permanent entity ID
  localVersion: EntityVersion   // Client's version at sync time
  remoteVersion: EntityVersion  // Server's version at sync time
  localChanges: FieldChange[]   // Fields changed by the client
  remoteChanges: FieldChange[]  // Fields changed by the server/other client
  detectionStrategy: string     // 'version-gap' | 'field-overlap' | 'parent-mismatch'
  resolvedAt?: string           // When the conflict was resolved
  resolution?: string           // Resolution strategy used
}
```

### Merge Strategy

```
MergeStrategy {
  type: 'last-writer-wins' | 'field-level' | 'parent-first' | 'manual'
}

LastWriterWins: {
  type: 'last-writer-wins'
  // The entity with the highest timestamp wins entirely
  // Simple, used for non-critical data
}

FieldLevelMerge: {
  type: 'field-level'
  // Conflicting fields are merged at the field level
  // If client changed 'name' and server changed 'description', both changes are preserved
  // Only fields that changed on both sides create conflicts
  fieldConflictResolution: 'timestamp' | 'client-preference' | 'server-preference'
}

ParentFirst: {
  type: 'parent-first'
  // Parent entity references take priority over field changes
  // Used when an entity was moved to a different parent during sync
  // The parent change requires confirmation; child field changes are applied on top
}

ManualResolution: {
  type: 'manual'
  // Conflict requires manual resolution
  // The conflicting versions are stored for human review
  // Used for financial data, reservations, and critical state changes
}
```

### Queue

The sync queue stores pending operations that were created or modified offline.

```
SyncQueueEntry {
  queueId: string               // Queue entry identifier
  entityType: string            // Entity type
  entityId: string              // Entity ID (temporary or permanent)
  operation: 'create' | 'update' | 'delete'
  data: Record<string, any>     // Entity data at time of operation
  dependencies: string[]        // Entity IDs this operation depends on
  status: 'pending' | 'in-flight' | 'completed' | 'failed' | 'conflicted'
  retryCount: number
  lastError?: string
  createdAt: string
  syncedAt?: string
}
```

### Sync Contracts

```
SyncClient {
  push(entries: SyncQueueEntry[]): SyncResult
  pull(since: SyncCursor): SyncChanges
  resolve(conflicts: Conflict[]): SyncResult
  getStatus(): SyncStatus
}

SyncResult {
  success: boolean
  conflicts: Conflict[]
  failed: FailedEntry[]
  serverCursor: SyncCursor
  timestamp: string
}

SyncChanges {
  created: Entity[]
  updated: Entity[]
  deleted: string[]             // Entity IDs
  serverCursor: SyncCursor
  hasMore: boolean              // Whether more changes are available
}

SyncCursor {
  value: string                 // Opaque cursor value
  timestamp: string             // When the cursor was generated
}

SyncStatus {
  lastSyncAt: string | null
  pendingOperations: number
  conflicts: number
  failedOperations: number
  isOnline: boolean
}
```

### Conflict Detection

Conflicts are detected during sync push. The server compares the client's version with the server's current version for each entity. If the versions differ, a conflict is generated.

Detection rules:
1. Version mismatch → Always generates a conflict record
2. Field overlap → Only conflicts if the same field was modified on both sides
3. Parent change → Always generates a conflict (parent reference needs confirmation)
4. Deletion conflict → If one side deleted and the other modified, deletion wins with a warning

### Conflict Resolution Hooks

The platform supports conflict resolution hooks that are invoked automatically.

```
ConflictResolutionHook {
  canAutoResolve(conflict: Conflict): AutoResolveDecision
  resolve(conflict: Conflict, context: ResolutionContext): ResolvedState
  onResolved(conflict: Conflict, result: ResolvedState): void
  onUnresolvable(conflict: Conflict): void
}
```

Hooks are registered at the domain level:
- **Reservation domain:** All conflicts require manual resolution (financial data)
- **Profile domain:** Field-level auto-merge with last-writer-wins for conflicting fields
- **Content domain:** Parent-first resolution (the parent reference from server takes priority)
- **Observation domain:** Field-level merge, server timestamp wins for scientific data integrity

---

## 9. Caching Contracts

### Cache Types

```
MemoryCache {
  provider: 'memory'
  scope: 'process' | 'request'
  defaultTTL: number (ms)
  maxSize: number
  evictionPolicy: 'lru' | 'lfu' | 'fifo'
}
```

```
PersistentCache {
  provider: 'indexeddb' | 'sqlite' | 'localstorage'
  scope: 'device' | 'session'
  defaultTTL: number (ms)
  maxSize: number (bytes)
  persistenceLevel: 'memory' | 'disk'
}
```

```
GeoCache {
  provider: 'memory' | 'persistent'
  scope: 'process'
  defaultTTL: number (ms)
  gridSize: number (meters)            // Spatial grid size for geo caching
  maxGridCells: number
}
```

```
ImageCache {
  provider: 'browser' | 'service-worker' | 'cdn'
  scope: 'device' | 'origin'
  defaultTTL: number (ms)
  maxSize: number (bytes)
  variantSupport: string[]             // Which variants to cache
}
```

```
SearchCache {
  provider: 'memory' | 'persistent'
  scope: 'process'
  defaultTTL: number (ms)
  maxResults: number                   // Max cached result sets
  invalidationOnIndex: boolean         // Invalidate when search index changes
}
```

```
RecommendationCache {
  provider: 'memory' | 'persistent'
  scope: 'visitor'                     // Per-visitor cache
  defaultTTL: number (ms)
  maxPerVisitor: number
  warmupSchedule: string               // Cron expression for cache warming
}
```

### Cache Operations

```
CacheProvider {
  get(key: string): CacheValue | null
  set(key: string, value: CacheValue, options?: CacheOptions): void
  delete(key: string): void
  clear(): void
  clearByPattern(pattern: string): void
  getOrSet(key: string, fetcher: () => Promise<CacheValue>, options?: CacheOptions): Promise<CacheValue>
  exists(key: string): boolean
  ttl(key: string): number | null
  increment(key: string, delta?: number): number
  getStats(): CacheStats
}

CacheOptions {
  ttl?: number                // Time to live (ms)
  tags?: string[]             // Invalidation tags
  version?: number            // Cache version for explicit invalidation
  priority?: 'low' | 'normal' | 'high'
  compression?: boolean
}
```

### Invalidation Rules

```
CacheInvalidation {
  type: 'ttl' | 'event' | 'manual' | 'tag' | 'version'
}

TTLInvalidation: {
  type: 'ttl'
  // Cache entries expire after TTL
  // Used for data with predictable freshness requirements
}

EventInvalidation: {
  type: 'event'
  // Cache entries are invalidated when specific events fire
  // Event: 'experience:updated' → Invalidate experience cache
  // Event: 'availability:changed' → Invalidate availability cache
  eventMap: Record<string, string[]>  // event → cache keys to invalidate
}

ManualInvalidation: {
  type: 'manual'
  // Admin action explicitly clears cache
  // Used for sweeping changes and debugging
}

TagInvalidation: {
  type: 'tag'
  // Cache entries tagged during set() are invalidated by tag
  // Invalidate by tag: 'destination:abc123' clears all cached data for that destination
}

VersionInvalidation: {
  type: 'version'
  // Cache entries carry a data version
  // When the data version increments, all matching cache entries are invalidated
  // Used for frequently mutated entities
}
```

### Caching Rules

1. Cache is never the source of truth. The repository is the source of truth. Cache sits between the repository and the caller.
2. Cache hits reduce latency but must never affect correctness. Stale data is acceptable within TTL; incorrect data is never acceptable.
3. Cache is tenant-scoped. A visitor from one tenant must never receive cached data from another tenant.
4. Cache is destination-scoped. A request for Destination A must never receive cached data for Destination B.
5. Cache invalidation is event-driven. Domain events trigger cache invalidation for affected entities.
6. Cache warmup is explicit. Data can be pre-cached based on predicted demand (seasonal patterns, upcoming campaigns).
7. Cache is observable. Cache hit rate, miss rate, and eviction rate are tracked.

---

## 10. Search Contracts

### SearchProvider Contract

```
SearchProvider {
  index(entityType: string, entity: IndexableEntity): void
  indexBatch(entityType: string, entities: IndexableEntity[]): void
  delete(entityType: string, entityId: string): void
  deleteBatch(entityType: string, entityIds: string[]): void
  search(query: SearchQuery): SearchResultSet
  searchGeo(query: GeoSearchQuery): SearchResultSet
  suggest(query: string, entityType?: string): Suggestion[]
  reindex(entityType?: string): void
  getIndexStats(): IndexStats
}

SearchQuery {
  query: FullTextQuery
  filter?: FilterGroup
  sort?: Sort[]
  pagination?: PageRequest | CursorRequest
  aggregation?: Aggregation[]
  track?: boolean                   // Track this search for analytics
}

SearchResultSet {
  items: SearchResult[]
  total: number
  page: PageInfo
  aggregations?: AggregationResult[]
  searchId?: string                 // For tracking and analytics
}

SearchResult {
  entityType: string
  entityId: string
  score: number
  highlights?: Record<string, string[]>  // Field → highlighted snippets
}
```

### Search Types

**Full-text search.** Natural language search across text fields. Supports stemming, stop words, fuzzy matching, and relevance scoring.

**Geo search.** Spatial search using geo coordinates and boundaries. Supports near, within, intersects, and bounding box queries.

**Tag search.** Faceted search by tag intersection. Supports any, all, and exact matching modes.

**Category search.** Hierarchical category filtering. Supports drill-down through category trees.

**Ecology search.** Species-specific search with taxonomy filtering, conservation status, and seasonality.

**Species search.** Species catalog search with scientific name, common name, conservation status, and habitat filters. Returns species details, observation counts, and media.

**Business search.** Business partner search with service type, certification, rating, price range, and capacity filters. Geo-optimized for "near me" queries.

**Experience search.** Experience search with date range, availability, capacity, difficulty, and activity type filters. Combines text search with availability queries.

**Route search.** Route search with activity type, difficulty, surface, distance, elevation, and condition filters. Geo-optimized for trail discovery.

### Hybrid Search

Hybrid search combines multiple search types in a single query. A query for "kayaking near Puerto Natales this weekend with availability" combines:
- Full-text search: "kayaking"
- Geo search: "near Puerto Natales"
- Time range: "this weekend"
- Availability filter: "with availability"

```
HybridSearchQuery {
  text?: FullTextQuery
  geo?: GeoQuery
  timeRange?: TimeRange
  tags?: TagQuery
  filters?: FilterGroup
  sort: Sort[]                    // Relevance, distance, date, price
  pagination: PageRequest | CursorRequest
  scoring: {                      // Weight for each component
    text: number,
    geo: number,
    popularity: number,
    freshness: number,
    business: number
  }
}
```

---

## 11. Projection Contracts

### Read Models

Read models are denormalized data structures optimized for specific queries. They are built from domain events and can be rebuilt if lost.

```
ReadModel {
  type: string
  buildFrom: string[]                     // Event types that build this model
  rebuild(events: DomainEvent[]): void
  invalidate(event: DomainEvent): void
  get(id: string): ReadModelData | null
  find(filter: Filter): ReadModelData[]
}
```

### View Models

View models are lightweight projections for UI rendering. They combine data from multiple aggregates into a single structure.

```
ViewExample: DestinationDetailView {
  destination: {
    id, name, description, slug, media
  }
  statistics: {
    experienceCount, speciesCount, routeCount, visitorCount
  }
  featured: {
    experiences: ExperienceCard[]
    routes: RouteCard[]
    stories: StoryCard[]
  }
  weather: CurrentWeather
  season: SeasonProfile
  geojson: GeoJSONFeature
}
```

### Dashboard Projections

Dashboard projections aggregate data for real-time monitoring.

```
DashboardProjection {
  destinationHealth: {
    overall: number
    components: { ecology, economy, community, operations, identity }
    trend: number[]                    // Last 30 days
    alerts: AlertSummary[]
  }
  visitorMetrics: {
    activeVisitors: number
    newVisitorsToday: number
    returningVisitors: number
    averageSessionDuration: number
  }
  businessMetrics: {
    activeBusinesses: number
    newBusinesses: number
    totalReservations: number
    revenueEstimate: number
  }
  ecologyMetrics: {
    totalObservations: number
    speciesIdentified: number
    activeConservationActions: number
    healthScores: HabitatHealthSummary[]
  }
}
```

### Analytics Projections

Analytics projections power reports and business intelligence queries. They are typically time-series aggregated data.

```
AnalyticsProjection {
  period: TimeRange
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year'
  metrics: {
    visitors: TimeSeries[]
    pageViews: TimeSeries[]
    reservations: TimeSeries[]
    revenue: TimeSeries[]
    searches: TimeSeries[]
    observations: TimeSeries[]
  }
  segments: {
    byDestination: SegmentData[]
    byBusinessType: SegmentData[]
    byVisitorOrigin: SegmentData[]
    byDeviceType: SegmentData[]
  }
}
```

### SEO Projections

SEO projections generate and serve structured data for search engine crawlers.

```
SEOProjection {
  sitemap(destinationId: string): SitemapEntry[]
  structuredData(entityType: string, entityId: string): JSONLD
  metaTags(entityType: string, entityId: string): MetaTag[]
  breadcrumbs(destinationId: string, path: string[]): Breadcrumb[]
  canonical(entityType: string, entityId: string): string
}
```

### Search Projections

Search projections are the data that gets indexed by the search provider. They combine fields from multiple entities into a flat, searchable document.

```
SearchProjection {
  ExperienceSearchDocument: {
    id, name, description, slug
    destinationId, destinationName
    businessId, businessName
    placeId, placeName
    localityId, localityName
    category, tags
    difficulty, duration, capacity
    priceMin, priceMax
    coordinates
    rating, reviewCount
    featuredMedia
    status
    createdAt, updatedAt
  }
}
```

### Offline Projections

Offline projections define what data must be available on the device when disconnected.

```
OfflineProjection {
  type: 'destination-bundle' | 'visitor-data' | 'experience-catalog'
  includes: string[]                    // Entities to include
  excludes?: string[]                   // Entities to exclude (for size constraints)
  compression?: 'gzip' | 'none'
  maxSize?: number                      // Target bundle size
  priority: 'critical' | 'high' | 'normal'
  refreshStrategy: 'on-sync' | 'periodic' | 'on-demand'
  ttl: number                           // How long the bundle is valid
}
```

---

## 12. Provider Responsibilities

### Persistence Provider Responsibilities

A Persistence Provider translates repository operations into technology-specific operations. It is the only layer that knows about the database, API, or storage engine.

Responsibilities:
- Accept domain operations (findById, create, update, delete) from repositories
- Translate domain operations into the provider's native interface (SQL, HTTP, IndexedDB transactions, file I/O)
- Execute the operation against the data source
- Translate results back into domain objects
- Handle provider-specific errors and translate them to domain errors
- Manage connections, connection pools, and retries
- Enforce rate limits and backpressure
- Report provider health status

Non-responsibilities:
- Must NOT contain business logic (that belongs to capabilities)
- Must NOT cache data (that belongs to CacheRepository)
- Must NOT validate domain rules (that belongs to capabilities)
- Must NOT filter results beyond the query specification (that belongs to repositories)
- Must NOT apply tenant scoping (that belongs to repositories)

```diff
- // WRONG: Provider applies tenant filter
- provider.findAll(query) {
-   query.tenantId = currentTenant.id  // Tenant scoping belongs to repository
-   return this.dataSource.find(query)
- }

+ // RIGHT: Provider executes the query as specified
+ provider.findAll(query) {
+   return this.dataSource.find(query)  // Query already scoped by repository
+ }
```

### Repository Responsibilities

A repository mediates between capabilities and providers. It knows about the domain, aggregates, and consistent boundaries.

Responsibilities:
- Expose domain-focused operations (findBySlug, getUpcoming, cancelReservation)
- Compose provider operations for complex queries
- Scope queries to current tenant and destination
- Enforce aggregate boundaries
- Manage the Unit of Work and transaction lifecycle
- Translate domain operations to provider operations
- Translate provider results back to domain objects
- Handle cache coordination (check cache, delegate to provider on miss, update cache)
- Handle offline queue coordination (queue writes when offline, sync when online)

Non-responsibilities:
- Must NOT contain business rules that belong to capabilities
- Must NOT contain presentation logic
- Must NOT know about the persistence technology (SQL, HTTP, etc.)

### Capability Responsibilities

A capability manages a business domain. It contains domain rules, business logic, and event handling.

Responsibilities:
- Define domain operations through managers
- Enforce business rules and invariants
- Emit domain events on state changes
- Subscribe to events from other capabilities
- Call repositories (or DataManager) for persistence
- Handle authorization and permission checks
- Transform data for presentation (through managers)

Non-responsibilities:
- Must NOT know about persistence (no SQL, no database references)
- Must NOT import provider libraries
- Must NOT manage transactions manually (delegates to repositories)
- Must NOT construct queries manually (uses query objects)

### DataManager Responsibilities

DataManager is the central orchestration point for persistence. It coordinates repositories, providers, cache, and sync.

Responsibilities:
- Route data operations to the correct repository
- Manage cache lifecycle (TTL, invalidation, pre-warming)
- Coordinate the offline queue and sync process
- Provide a unified entry point for capabilities that do not define their own repositories
- Handle tenant and destination scoping at the data access level
- Log data access for audit (when applicable)
- Monitor data access patterns for performance optimization

Non-responsibilities:
- Must NOT execute business logic
- Must NOT validate domain rules
- Must NOT replace repositories for complex domain operations

### Interaction Rules

```
                    Capability
                        │
                        │  Uses query objects and domain operations
                        ▼
                   Repository (interface)
                        │
                        │  Implements contract, composes provider calls
                        ▼
                 PersistenceProvider (interface)
                        │
                        │  Translates to technology-specific operations
                        ▼
                    Database / API
```

Rule 1: A capability never calls a provider directly. The repository layer is always between them.

Rule 2: A capability never constructs provider-specific queries. It uses query objects.

Rule 3: A repository never exposes provider-specific types (no SQL ResultSet, no HTTP Response).

Rule 4: A provider never returns raw data — it always maps to domain structures.

Rule 5: A provider never applies tenant scoping — the query arrives already scoped.

Rule 6: A repository never owns business logic — it delegates to the capability for domain decisions.

---

## 13. Capability Interaction

### How Capabilities Access Data

Every capability accesses persistent data through exactly two channels:

**Channel 1: `context.repositories`**

Capabilities access domain-specific repositories through the context object. The context is provided during capability initialization.

```
class BookingCapability extends BaseCapability {
  async createReservation(data) {
    // Access repository through context
    const reservation = await this.context.repositories.reservation.create(data)

    // Access other repositories through the same context
    const experience = await this.context.repositories.experience.findById(data.experienceId)

    // Business logic
    reservation.status = 'confirmed'
    await this.context.repositories.reservation.update(reservation.id, { status: 'confirmed' })

    // Emit domain event
    this.emit('reservation:created', { reservation })

    return reservation
  }
}
```

**Channel 2: DataManager**

For simple data operations that need no custom repository (generic entity CRUD), capabilities use DataManager directly. DataManager routes to the appropriate built-in repository.

```
class SimpleCapability extends BaseCapability {
  async getSettings() {
    return this.context.dataManager.get('settings', { tenantId: this.context.tenant.id })
  }

  async updateSettings(data) {
    return this.context.dataManager.set('settings', data)
  }
}
```

### What Capabilities Must Never Do

```
// VIOLATION: Capability imports database library
import { createConnection } from 'some-database'  // FORBIDDEN

// VIOLATION: Capability constructs raw query
const result = await db.query('SELECT * FROM experiences')  // FORBIDDEN

// VIOLATION: Capability calls provider directly
const data = await this.context.provider.http.get('/experiences')  // FORBIDDEN

// VIOLATION: Capability accesses another capability's repository directly
const data = await otherCapability.context.repositories.experience.findAll()  // FORBIDDEN

// VIOLATION: Capability bypasses repository for write
await this.context.dataManager.provider.insert('experiences', data)  // FORBIDDEN
```

### Correct Interaction Patterns

```
// CORRECT: Capability uses its own repository
const experiences = await this.context.repositories.experience.findByBusiness(businessId)

// CORRECT: Capability uses DataManager for generic operations
const config = await this.context.dataManager.get('configuration', { key })

// CORRECT: Capability calls another capability through EventBus
this.emit('booking:requested', { experienceId, visitorId, date })

// CORRECT: Capability calls another capability through context
const visitor = this.context.capabilities.get('visitor')
const profile = await visitor.getProfile(visitorId)
```

---

## 14. Future Mapping

The persistence contracts are designed to map to multiple technologies without changing capabilities or repositories. The following mappings are conceptual.

### PostgreSQL Mapping

| Contract | PostgreSQL Implementation |
|----------|--------------------------|
| Repository | Class with SQL queries via pg driver |
| QueryObject → Filter | WHERE clause with parameterized values |
| QueryObject → Sort | ORDER BY clause |
| QueryObject → Pagination | LIMIT/OFFSET or keyset pagination |
| QueryObject → GeoQuery | PostGIS functions (ST_DWithin, ST_Within) |
| QueryObject → FullTextQuery | tsvector @@ tsquery with GIN index |
| QueryObject → TagQuery | Junction table with array aggregation |
| Transaction | BEGIN/COMMIT/ROLLBACK with pg pool |
| Optimistic Locking | version column in UPDATE...WHERE version = |
| Soft Delete | deleted_at nullable timestamp |
| Audit | Separate audit_log table with INSERT trigger |
| Projection | Materialized view or separate query |
| Cache | Redis or in-memory cache alongside pg |

### SQLite Mapping

| Contract | SQLite Implementation |
|----------|----------------------|
| Repository | Class with SQL queries via better-sqlite3 or sql.js |
| QueryObject → Filter | WHERE clause (parameterized) |
| QueryObject → Sort | ORDER BY clause |
| QueryObject → Pagination | LIMIT/OFFSET |
| QueryObject → GeoQuery | Manual lat/lng comparison or SpatiaLite |
| QueryObject → FullTextQuery | FTS5 virtual table |
| QueryObject → TagQuery | JSON array with json_each |
| Transaction | BEGIN/COMMIT/ROLLBACK |
| Optimistic Locking | version column check |
| Soft Delete | deleted_at timestamp |
| Sync | sync_id, updated_at, is_deleted columns for incremental sync |
| Offline | Single-file database per device/tenant |

### IndexedDB Mapping

| Contract | IndexedDB Implementation |
|----------|-------------------------|
| Repository | Class with IndexedDB object store operations |
| Entity | Object store with auto-increment or UUID key |
| QueryObject → Filter | IDBKeyRange or index queries |
| QueryObject → Sort | IDBCursor direction |
| QueryObject → Pagination | IDBCursor.advance() or continue() |
| QueryObject → GeoQuery | Manual bounding box with composite index |
| QueryObject → FullTextQuery | Not natively supported; use search library |
| Transaction | IDBTransaction with objectStore |
| Optimistic Locking | Manual version check in put operation |
| Soft Delete | isDeleted field in object |
| Sync | Queue in separate object store |

### Redis Mapping

| Contract | Redis Implementation |
|----------|---------------------|
| Repository | Redis client with hash/set/zset operations |
| Entity | HASH (entity:type:id → fields) |
| QueryObject → Filter | Not native; scan with pattern matching |
| QueryObject → Sort | SORT command or sorted sets |
| QueryObject → Pagination | SCAN with COUNT |
| QueryObject → GeoQuery | GEOADD, GEORADIUS, GEORADIUSBYMEMBER |
| QueryObject → FullTextQuery | Not supported |
| Transaction | MULTI/EXEC or Redis transactions |
| TTL | EXPIRE on cache keys |
| Cache | Redis is the cache layer by design |

### Elasticsearch / OpenSearch Mapping

| Contract | Search Engine Implementation |
|----------|------------------------------|
| SearchRepository | Index with mapping, search with query DSL |
| QueryObject → FullTextQuery | match, multi_match, query_string queries |
| QueryObject → GeoQuery | geo_distance, geo_shape queries |
| QueryObject → Filter | term, terms, range, bool/filter queries |
| QueryObject → Sort | sort parameter with field, order, mode |
| QueryObject → Pagination | from/size or search_after |
| Aggregation | terms, date_histogram, geo_distance aggregations |
| Highlight | highlight configuration with pre/post tags |
| Suggestion | completion suggester or term suggester |
| Reindex | Reindex API or delete/create index |

### Object Storage Mapping

| Contract | S3-Compatible Implementation |
|----------|------------------------------|
| MediaRepository | S3 SDK with presigned URLs |
| Store | PutObject with metadata headers |
| Retrieve | GetObject or CloudFront CDN URL |
| Delete | DeleteObject |
| Thumbnails | Lambda@Edge or separate processing pipeline |
| Presigned URLs | Generate presigned GET/PUT URLs |

### REST API Mapping

| Contract | REST API Implementation |
|----------|----------------------|
| Repository | HTTP client with axios/fetch |
| QueryObject → Filter | Query parameter convention (?field=value) |
| QueryObject → Sort | query parameter (?sort=field:asc) |
| QueryObject → Pagination | query parameters (?page=1&pageSize=20) |
| QueryObject → GeoQuery | query parameters (?lat=&lng=&radius=) |
| Mutation | POST (create), PUT (update), DELETE (delete) |
| Authentication | Bearer token in Authorization header |
| Rate Limiting | Retry-After header, exponential backoff |
| PWA/Offline | Service worker caches GET responses |

### GraphQL Mapping

| Contract | GraphQL Implementation |
|----------|----------------------|
| Repository | GraphQL client with queries and mutations |
| Read | GraphQL query with field selection |
| Write | GraphQL mutation with input types |
| QueryObject → Filter | GraphQL argument convention (filter: { field: { eq: value } }) |
| QueryObject → Sort | GraphQL argument (sort: { field: asc }) |
| QueryObject → Pagination | Connection pattern (first, after, before, last) |
| Subscription | GraphQL subscription for real-time updates |
| Caching | Normalized cache (Apollo, Relay) |

---

## 15. Architecture Rules

The following rules are immutable. They govern the relationship between capabilities, repositories, persistence providers, and databases. Violations introduce coupling that increases with every line of code written against them.

**Rule 1: Repositories never expose SQL.**
Repository interfaces return domain objects. The caller must never see a query string, a result set, a connection object, or any database-specific type. The repository is the boundary between domain and technology.

**Rule 2: Capabilities never know about persistence.**
A capability must be testable without a real database. It calls `context.repositories.experience.findAll(filter)` — it does not matter whether the data comes from PostgreSQL, SQLite, IndexedDB, or an in-memory mock.

**Rule 3: Repositories never own business logic.**
A repository validates data shape, not data meaning. It checks required fields — it does not enforce business rules. Business rules belong to capabilities. A repository that says "you cannot cancel a reservation within 24 hours" has crossed the boundary into business logic.

**Rule 4: Providers never own domain rules.**
A persistence provider translates domain operations into technology-specific operations. It does not filter by business rules, validate business constraints, or enforce domain invariants. Domain rules in providers make it impossible to swap data sources.

**Rule 5: Transactions never cross aggregate boundaries.**
Each aggregate root defines its own transactional boundary. Multi-aggregate consistency is achieved through eventual consistency (EventBus), not distributed transactions. Cross-aggregate transactions create coupling that breaks the capability model.

**Rule 6: Offline synchronization never bypasses repositories.**
Sync flows through the repository interface. The sync provider calls `repository.sync.push(changes)` and `repository.sync.pull(cursor)`. It never writes directly to the persistence provider or the database. Bypassing the repository means bypassing tenant scoping, validation, and conflict detection.

**Rule 7: Search never bypasses repositories.**
Search results are returned through the repository interface. The caller calls `repository.search(query)` and receives domain objects. It must never receive raw search engine documents. Bypassing the repository means losing tenant scoping, permission filtering, and domain transformation.

**Rule 8: Every query is tenant-scoped at the repository level.**
The repository must ensure that no data from Tenant A is returned to a query from Tenant B. Tenant scoping is applied automatically — the caller must not remember to add `tenantId` to every filter. Cross-tenant queries require explicit administrative context.

**Rule 9: Every query is destination-scoped at the repository level.**
Destination scoping follows the same pattern as tenant scoping. The repository automatically scopes queries to the current destination. Cross-destination queries require explicit context.

**Rule 10: Repositories are injectable.**
Capabilities never instantiate repositories. Repositories are provided through dependency injection. This enables testing with mock repositories and swapping implementations without changing capability code.

**Rule 11: Caching is transparent to the caller.**
A capability must not know whether the data it receives came from cache or from the authoritative store. Cache and repository share the same interface. Adding or removing cache does not change capability code.

**Rule 12: The EventBus is the write side for cross-capability state changes.**
When Capability A needs Capability B to know about a state change, Capability A emits an event. Capability B subscribes and updates its own data through its own repository. Direct cross-capability writes to shared data stores are forbidden.

**Rule 13: Repositories return domain objects, not DTOs.**
The caller receives a domain entity with behavior, not a data bag. If the domain object has a `.cancel()` method, the caller calls it. If the domain object has a `.toJSON()` method, the caller uses it. Repositories return what the domain understands, not what the database stores.

**Rule 14: Every repository operation is logged for audit.**
State-changing operations (create, update, delete, archive, restore) produce audit entries. The repository is responsible for audit logging — the capability must not need to remember to call `auditRepo.record()`. Audit logging is automatic and transparent to capabilities.

**Rule 15: Repositories validate data shape, not data meaning.**
A repository validates that required fields are present, that field types match the schema, and that references exist. It does not validate business rules like "start date must be before end date" (that is a capability concern) or "reservation must not overlap existing bookings" (that is a domain concern).

**Rule 16: Query objects are immutable after creation.**
Once a query object is constructed, it cannot be modified. If a caller needs a different query, it creates a new query object. Immutability prevents shared mutable state and makes queries predictable.

**Rule 17: Repository operations are idempotent where possible.**
`delete()` on an already-deleted entity returns success (not an error). `update()` with no changes returns success. Idempotency simplifies offline sync and retry logic. The only exception is `create()` — creating a duplicate entity may fail depending on the domain.

**Rule 18: Provider connection failures are reported, not hidden.**
If a persistence provider cannot connect to the data source, it must report the failure explicitly. Silent fallbacks hide problems. The repository layer decides how to handle failures (retry, fallback to cache, return error). The provider only reports.

**Rule 19: Repository interfaces are defined per aggregate root.**
Each aggregate root has exactly one repository interface. Non-aggregate entities are accessed through their parent aggregate's repository. This prevents scattered data access patterns and enforces aggregate consistency boundaries.

**Rule 20: The contract between repository and provider is never exposed to capabilities.**
Capabilities see `Repository`. They never see `PersistenceProvider`, `CacheProvider`, `SearchProvider`, or `SyncProvider`. The repository composes these providers internally. The capability knows only the repository interface.

**Rule 21: Repository methods return promises (async).**
All data operations are asynchronous by default. Even in-memory operations return promises to maintain a consistent interface. Synchronous operations are only permitted in synchronous-only contexts (service workers, Web Workers) and must be explicitly documented.

**Rule 22: Conflict resolution strategies are domain-defined, not platform-defined.**
Each domain defines its own conflict resolution strategy. Financial transactions require manual resolution. Profiles use field-level auto-merge. Content uses parent-first resolution. The platform provides the framework; domains provide the rules.

**Rule 23: A repository must never expose database identity.**
The caller receives domain objects with domain identifiers (UUIDs, slugs). It never receives auto-increment IDs, sequence values, or database-generated keys. Database identity is an implementation detail that the provider manages internally.

**Rule 24: Schema changes are coordinated, not cascaded.**
When the domain model evolves, repositories are updated explicitly. Schema changes do not cascade from the database to the domain. The repository layer absorbs schema differences. Capabilities remain unaffected by database schema changes.

---

## 16. Validation Checklist

Every repository and contract must satisfy the following checks before being considered complete.

### Dependency Validation

- [ ] Repository depends only on contracts (QueryObject, Filter, Sort, etc.) — not on concrete providers
- [ ] Repository depends on domain types — not on database types
- [ ] Capability depends only on repository interface — not on repository implementation
- [ ] Provider depends only on data source — not on domain rules
- [ ] No circular dependencies between repositories
- [ ] No repository imports another repository directly (use EventBus for cross-repository coordination)

### Contract Completeness

- [ ] Every domain entity has a corresponding repository interface
- [ ] Every aggregate root has exactly one repository
- [ ] Every repository has findById, create, update, delete (where applicable)
- [ ] Every repository has domain-specific query methods (not just generic CRUD)
- [ ] Every repository method returns domain objects, not raw data
- [ ] Every query object has strongly typed fields (no loose strings for field names)
- [ ] Every contract is documented with purpose, parameters, and return types

### Offline Validation

- [ ] Every entity supports UUID generation on the client
- [ ] Every entity supports temporary IDs for offline creation
- [ ] Every repository method is idempotent (or has explicit idempotency guarantees)
- [ ] Sync push handles operation ordering (dependencies first)
- [ ] Sync pull supports incremental sync (since cursor)
- [ ] Conflict detection is implemented for every mutable entity
- [ ] Conflict resolution strategy is defined per domain
- [ ] Offline queue has bounded size (eviction policy for stale entries)

### Performance Validation

- [ ] Every query returns paginated results (no unbounded result sets)
- [ ] Every query supports field selection (projection) to limit payload
- [ ] Search queries have explicit relevance scoring strategy
- [ ] Geo queries have bounded radius (no unbounded spatial queries)
- [ ] Bulk operations (createMany, updateMany, deleteMany) are supported where applicable
- [ ] Repository operations are lazy where possible (deferred execution)
- [ ] N+1 query patterns are explicitly addressed (eager loading in selections)

### Security Validation

- [ ] Every query is tenant-scoped automatically
- [ ] Every query is destination-scoped automatically
- [ ] Cross-tenant access requires explicit administrative context
- [ ] Soft-deleted entities are excluded from standard queries
- [ ] Archived entities are excluded from standard queries
- [ ] Sensitive fields are excluded from default projections
- [ ] Audit logging is automatic for state-changing operations
- [ ] Repository operations are rate-limited (configurable per repository)

### Scalability Validation

- [ ] Repository is designed for horizontal scaling (connection pooling, retry, backpressure)
- [ ] Cache strategy is defined for every repository with high read volume
- [ ] Search is delegated to a dedicated search provider (not the main data store)
- [ ] Analytics writes are separated from transactional writes (write-behind or batch)
- [ ] Media storage is abstracted behind a provider (not in the main database)
- [ ] Archive and retention policies are defined for every entity
- [ ] Projections are rebuildable from event streams (not the source of truth)

### Future Compatibility

- [ ] No PostgreSQL-specific features referenced in contracts
- [ ] No SQLite-specific features referenced in contracts
- [ ] No vendor-specific data types in contracts
- [ ] No ORM-specific annotations or decorators in contracts
- [ ] Repository interface is implementable in any language (not JavaScript-specific)
- [ ] Query objects are serializable (can be sent over the wire)
- [ ] Contracts can be versioned independently of implementations

---

*Persistence Contracts — Valdi Engine*
*P12.0.1 — Persistence Contracts Layer*
*Status: Active — Permanent contract between Capabilities, Repositories, Providers, and Database*
*Review: Before implementing any persistence provider*
