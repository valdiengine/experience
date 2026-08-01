# OpenAPI Architecture

> OpenAPI 3.1 specification architecture for the Commercial Aggregate API.

## Overview

The P14 API Layer exposes Commercial Aggregate capabilities via REST endpoints conforming to OpenAPI 3.1 specification.

## Specification Structure

```
api/openapi/
├── SPEC.md                 # OpenAPI 3.1 specification (master)
├── SPEC.json               # Compiled JSON specification
├── SPEC.yaml               # Compiled YAML specification
└── .registry/              # Versioned spec registry
    ├── v1.yaml
    └── v2.yaml (future)
```

## Specification Principles

1. **API First** — Spec is source of truth, not generated from code
2. **Versioned** — Breaking changes increment major version
3. **Typed** — Full JSON Schema type coverage
4. **Documented** — Every endpoint has description, examples
5. **Validated** — Spec is validated against ruleset

## Path Structure

```
/api/v1/businesses/{id}
/api/v1/accommodations/{id}
/api/v1/availability/{id}
/api/v1/reservations/{id}
/api/v1/visitors/{id}
/api/v1/payments/{id}
/api/v1/reviews/{id}
```

## Operation Patterns

### Standard CRUD

```yaml
GET    /businesses           # List
GET    /businesses/{id}      # Get
POST   /businesses           # Create
PUT    /businesses/{id}      # Replace
PATCH  /businesses/{id}     # Modify
DELETE /businesses/{id}     # Delete
```

### Action Operations

```yaml
POST /businesses/{id}/archive
POST /businesses/{id}/restore
POST /reservations/{id}/confirm
POST /reservations/{id}/reject
POST /reservations/{id}/cancel
POST /reservations/{id}/checkin
POST /reservations/{id}/checkout
```

## Response Structure

### Success

```yaml
SuccessResponse:
  type: object
  properties:
    success:
      type: boolean
      const: true
    data:
      type: object
      description: Resource or resource array
    meta:
      type: object
      properties:
        requestId:
          type: string
        pagination:
          $ref: '#/components/schemas/Pagination'
```

### Error (Problem Details)

```yaml
ProblemDetails:
  type: object
  properties:
    type:
      type: string
      format: uri
    title:
      type: string
    status:
      type: integer
    detail:
      type: string
    instance:
      type: string
      format: uri
    extensions:
      type: object
```

## Components

### Schemas

| Schema | File | Description |
|--------|------|-------------|
| Business | `schemas/business.yaml` | Business entity |
| Accommodation | `schemas/accommodation.yaml` | Accommodation entity |
| Availability | `schemas/availability.yaml` | Availability slot |
| Reservation | `schemas/reservation.yaml` | Reservation entity |
| Visitor | `schemas/visitor.yaml` | Visitor entity |
| Payment | `schemas/payment.yaml` | Payment entity |
| Review | `schemas/review.yaml` | Review entity |

### Security Schemes

```yaml
BearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
```

## Validation Rules

1. All IDs must be UUID v4
2. All timestamps must be ISO 8601
3. All currency values must have 2 decimal precision
4. Pagination default: page=1, perPage=20, max=100

## Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (non-mutating) |
| 201 | Created |
| 204 | No Content (deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity (business rule) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Documentation

- Interactive docs: `/api/docs` (Swagger UI)
- Raw spec: `/api/spec.json`
- Postman collection: `api/postman/`

## Relationship to Runtime

```
[API Layer] --HTTP--> [BusinessService] ---> [Domain]
     |                                         ^
     +-------- [OpenAPI Spec validates] --------+
```

## TODO

- [ ] Create schemas/ directory with entity schemas
- [ ] Generate SPEC.md from existing routes
- [ ] Set up Swagger UI at /api/docs
- [ ] Create postman/ collection
- [ ] Add spectral validation to CI pipeline
