# P14: API Layer Specification

> Phase 14 — HTTP API Layer for Commercial Aggregate

## Objective

Expose Commercial Aggregate capabilities via REST API that:
- Consumes only BusinessService (no bypass, no duplication)
- Follows API Layer rules from architecture
- Provides full CRUD and action endpoints for all entities

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Layer                          │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Router  │  │Middleware│  │    Controllers    │   │
│  └────┬────┘  └────┬─────┘  └────────┬──────────┘   │
│       │            │                  │              │
│       └────────────┼──────────────────┘              │
│                    ▼                                 │
│          ┌─────────────────┐                        │
│          │  BusinessService │◄──── Domain Logic     │
│          └─────────────────┘                        │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
api/
├── bootstrap/              # Application bootstrap
│   ├── api.bootstrap.js    # Entry point
│   └── server/            # Server configuration
│       └── api.server.js  # HTTP server
├── routes/                # Route definitions
│   ├── router.js          # Base router
│   ├── api.router.js      # Main router aggregator
│   ├── business.routes.js
│   ├── accommodation.routes.js
│   ├── availability.routes.js
│   ├── reservation.routes.js
│   ├── visitor.routes.js
│   ├── payment.routes.js
│   └── review.routes.js
├── controllers/           # Request handlers
│   ├── base.controller.js # Base controller class
│   └── business.controller.js
├── middleware/            # HTTP middleware
│   ├── request-id.middleware.js
│   ├── correlation-id.middleware.js
│   ├── logging.middleware.js
│   ├── error-handler.middleware.js
│   ├── not-found.middleware.js
│   ├── auth.middleware.js
│   ├── authorization.middleware.js
│   ├── validation.middleware.js
│   └── rate-limit.middleware.js
├── responses/            # Response formatters
│   ├── success.response.js
│   └── problem-details.response.js
├── errors/               # Error classes
│   └── api.errors.js
├── health/               # Health endpoints
│   └── index.js
├── versioning/           # API versioning
│   └── index.js
├── serializers/          # Response serializers (TODO)
├── validation/           # Request validators (TODO)
└── openapi/              # OpenAPI specification (TODO)
    └── OPENAPI_ARCHITECTURE.md
```

## API Endpoints

### Businesses

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/businesses | List businesses |
| GET | /api/v1/businesses/:id | Get business |
| POST | /api/v1/businesses | Create business |
| PUT | /api/v1/businesses/:id | Update business |
| PATCH | /api/v1/businesses/:id | Patch business |
| DELETE | /api/v1/businesses/:id | Delete business |
| POST | /api/v1/businesses/:id/archive | Archive business |
| POST | /api/v1/businesses/:id/restore | Restore business |

### Accommodations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/accommodations | List accommodations |
| GET | /api/v1/accommodations/:id | Get accommodation |
| POST | /api/v1/accommodations | Create accommodation |
| PUT | /api/v1/accommodations/:id | Update accommodation |
| PATCH | /api/v1/accommodations/:id | Patch accommodation |
| DELETE | /api/v1/accommodations/:id | Delete accommodation |
| POST | /api/v1/accommodations/:id/archive | Archive accommodation |
| POST | /api/v1/accommodations/:id/restore | Restore accommodation |
| POST | /api/v1/accommodations/:id/publish | Publish accommodation |
| POST | /api/v1/accommodations/:id/unpublish | Unpublish accommodation |

### Availability

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/availability | List availability |
| GET | /api/v1/availability/:id | Get availability |
| POST | /api/v1/availability | Create availability |
| PUT | /api/v1/availability/:id | Update availability |
| DELETE | /api/v1/availability/:id | Delete availability |
| POST | /api/v1/availability/:id/block | Block date |
| POST | /api/v1/availability/:id/unblock | Unblock date |
| POST | /api/v1/availability/:id/reserve | Reserve date |
| POST | /api/v1/availability/:id/release | Release date |

### Reservations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/reservations | List reservations |
| GET | /api/v1/reservations/:id | Get reservation |
| POST | /api/v1/reservations | Create reservation |
| PUT | /api/v1/reservations/:id | Update reservation |
| PATCH | /api/v1/reservations/:id | Patch reservation |
| DELETE | /api/v1/reservations/:id | Delete reservation |
| POST | /api/v1/reservations/:id/confirm | Confirm reservation |
| POST | /api/v1/reservations/:id/reject | Reject reservation |
| POST | /api/v1/reservations/:id/cancel | Cancel reservation |
| POST | /api/v1/reservations/:id/checkin | Check in |
| POST | /api/v1/reservations/:id/checkout | Check out |

### Visitors

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/visitors | List visitors |
| GET | /api/v1/visitors/:id | Get visitor |
| POST | /api/v1/visitors | Create visitor |
| PUT | /api/v1/visitors/:id | Update visitor |
| PATCH | /api/v1/visitors/:id | Patch visitor |
| DELETE | /api/v1/visitors/:id | Delete visitor |
| POST | /api/v1/visitors/:id/archive | Archive visitor |
| POST | /api/v1/visitors/:id/restore | Restore visitor |
| POST | /api/v1/visitors/:id/verify | Verify visitor |
| POST | /api/v1/visitors/:id/merge | Merge visitors |

### Payments

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/payments | List payments |
| GET | /api/v1/payments/:id | Get payment |
| POST | /api/v1/payments | Create payment |
| PATCH | /api/v1/payments/:id | Update payment |
| POST | /api/v1/payments/:id/process | Process payment |
| POST | /api/v1/payments/:id/refund | Refund payment |
| POST | /api/v1/payments/:id/retry | Retry payment |
| POST | /api/v1/payments/:id/cancel | Cancel payment |

### Reviews

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/reviews | List reviews |
| GET | /api/v1/reviews/:id | Get review |
| POST | /api/v1/reviews | Create review |
| PATCH | /api/v1/reviews/:id | Update review |
| DELETE | /api/v1/reviews/:id | Delete review |
| POST | /api/v1/reviews/:id/approve | Approve review |
| POST | /api/v1/reviews/:id/reject | Reject review |
| POST | /api/v1/reviews/:id/report | Report review |

## Health Endpoints

| Path | Description |
|------|-------------|
| GET /health | Liveness probe |
| GET /ready | Readiness probe |
| GET /live | Liveness check |

## Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "pagination": { ... }
  }
}
```

### Error (Problem Details)

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body contains invalid fields",
  "instance": "/api/v1/businesses",
  "extensions": {
    "errors": [...]
  }
}
```

## Middleware Stack

1. **Request ID** — Generate/forward request ID
2. **Correlation ID** — Track request across services
3. **Logging** — Log request/response
4. **Rate Limiting** — Prevent abuse
5. **Authentication** — Verify JWT
6. **Authorization** — Check permissions
7. **Validation** — Validate request
8. **Error Handler** — Catch and format errors
9. **Not Found** — Handle 404

## Rules

1. **NEVER** access repository directly from controller
2. **NEVER** duplicate business logic in controller
3. **NEVER** duplicate validation in controller
4. **ALWAYS** delegate to BusinessService
5. **ALWAYS** use response formatters
6. **ALWAYS** use error classes
7. **ALWAYS** include requestId in response

## TODO

- [x] Bootstrap files (api.bootstrap.js, api.server.js)
- [x] Response layer (success, problem-details)
- [x] Error classes
- [x] Middleware (9 files)
- [x] Router and route registration
- [x] Health endpoints
- [x] Controllers (business.controller.js)
- [x] Route files (7 entities)
- [x] API router aggregator
- [ ] Serializers for all entities
- [ ] Request validators
- [ ] OpenAPI specification
- [ ] Swagger UI integration
- [ ] API documentation

## Status

**Phase: In Progress**

Created bootstrap, middleware, responses, errors, routes, controllers, and API router. Next: serializers, validators, OpenAPI spec.
