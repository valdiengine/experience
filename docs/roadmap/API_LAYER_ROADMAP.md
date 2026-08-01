# API Layer Roadmap

> Implementation roadmap for P14 API Layer

## Milestones

### M1: Foundation (Complete)
- [x] Bootstrap (api.bootstrap.js, api.server.js)
- [x] Response layer (success envelope, problem details)
- [x] Error classes (10 error types)
- [x] Middleware (9 middleware files)
- [x] Router (base router, API router)
- [x] Health endpoints (/health, /ready, /live)

### M2: Routes & Controllers (Complete)
- [x] Business routes + controller
- [x] Accommodation routes
- [x] Availability routes
- [x] Reservation routes
- [x] Visitor routes
- [x] Payment routes
- [x] Review routes
- [x] API router aggregation

### M3: Serializers (Pending)
- [ ] BusinessSerializer
- [ ] AccommodationSerializer
- [ ] AvailabilitySerializer
- [ ] ReservationSerializer
- [ ] VisitorSerializer
- [ ] PaymentSerializer
- [ ] ReviewSerializer
- [ ] PaginationSerializer

### M4: Validation (Pending)
- [ ] Request validators for each entity
- [ ] Validation middleware integration
- [ ] Custom validation rules

### M5: OpenAPI (Pending)
- [ ] SPEC.md specification
- [ ] Schema definitions
- [ ] Swagger UI setup
- [ ] Postman collection
- [ ] Spectral validation

### M6: Documentation (Pending)
- [ ] API_LAYER.md (complete)
- [ ] API_LAYER_ROADMAP.md (this file)
- [ ] OPENAPI_ARCHITECTURE.md (complete)
- [ ] Endpoint documentation
- [ ] Authentication guide

### M7: Testing & Integration (Pending)
- [ ] Unit tests for controllers
- [ ] Integration tests for routes
- [ ] Health check validation
- [ ] Error handling validation

## Priority

1. **High** — Serializers (needed for consistent responses)
2. **High** — Validation (needed for API contracts)
3. **Medium** — OpenAPI spec (needed for API consumers)
4. **Medium** — Documentation (needed for developers)
5. **Low** — Testing (important but can follow)

## Risks

- Serializers may need updates when domain models change
- Validation rules depend on business rule clarity
- OpenAPI spec maintenance overhead

## Dependencies

- P13.8 Commercial Aggregate (complete)
- BusinessService interface stability
- Domain model stability
