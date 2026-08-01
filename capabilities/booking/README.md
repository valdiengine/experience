## Booking Capability

Multi-tenant reservation management for any business type.

### Structure

```
booking/
├── booking.capability.js  — Main capability (extends BaseCapability)
├── booking.manager.js     — Booking operations (create, validate, save, state changes)
├── booking.schema.js      — Data schemas & validation
├── booking.events.js      — Event definitions
└── README.md              — This file
```

### Architecture

```
Client → BookingManager → validate → checkAvailability → save → emit event
                                                         ↓
                                              NotificationManager
```

### BookingManager

Handles the full booking lifecycle:
- `createRequest(data)` — Validate + check availability + save + emit
- `checkAvailability(data)` — Check for scheduling conflicts
- `save(booking)` — Persist to DataManager
- `changeState(id, status)` — State transitions with events
- `confirm(id)`, `cancel(id)`, `complete(id)`, `noShow(id)` — Convenience methods

### Business-agnostic

- Works for: tours, restaurants, professionals, retail, B2B
- Items are generic: `{ id, type, name, quantity, price, metadata }`
- No UI — schemas/events/manager only
