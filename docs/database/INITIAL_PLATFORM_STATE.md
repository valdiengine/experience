# Initial Platform State
## Valdi Platform v4.1 — P12.3.1.5

---

## Overview

This document describes the initial state of the Valdi Platform after seeding. The seed data creates the platform identity and architecture foundation for multi-ecosystem tourism platforms in Chile, with architecture ready for expansion to other countries.

---

## Platform Hierarchy

```
VALDI PLATFORM
└── valdi-platform (tenant)
    ├── Valdivia Ecosystem
    │   └── valdivia (destination)
    │       └── valdivia-ecosystem
    │           ├── Categories (17)
    │           ├── Modules (18)
    │           └── Experiences (4)
    └── Patagonia Ecosystem
        ├── natales (destination)
        │   └── natales-ecosystem
        ├── puntaarenas (destination)
        │   └── puntaarenas-ecosystem
        ├── chiloe (destination)
        │   └── chiloe-ecosystem
        └── coyhaique (destination)
            └── coyhaique-ecosystem
```

---

## Geographic Coverage

### Countries
| Code | Name | Status |
|------|------|--------|
| CL | Chile | Active |

### Regions (Chile)
| Code | Name | Country |
|------|------|---------|
| LR | Los Ríos | Chile |
| MA | Magallanes | Chile |
| LL | Los Lagos | Chile |
| AY | Aysén | Chile |

### Destinations
| Slug | Name | Region | Coordinates |
|------|------|--------|-------------|
| valdivia | Valdivia | Los Ríos | -39.8199, -73.2454 |
| natales | Puerto Natales | Magallanes | -51.7327, -72.4913 |
| puntaarenas | Punta Arenas | Magallanes | -53.1638, -70.9171 |
| chiloe | Chiloé | Los Lagos | -42.5, -73.5 |
| coyhaique | Coyhaique | Aysén | -45.5632, -72.0668 |

---

## Ecosystem Configuration

### Categories Enabled per Destination

| Category | Valdivia | Natales | Punta Arenas | Chiloé | Coyhaique |
|----------|----------|---------|--------------|--------|-----------|
| Tourism | ✓ | ✓ | ✓ | ✓ | ✓ |
| Accommodation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gastronomy | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tours | ✓ | ✓ | ✓ | ✓ | ✓ |
| Services | ✓ | ✓ | ✓ | ✓ | ✓ |

### Modules Enabled per Destination

| Module | Valdivia | Natales | Punta Arenas | Chiloé | Coyhaique |
|--------|----------|---------|--------------|--------|-----------|
| Website | ✓ | ✓ | ✓ | ✓ | ✓ |
| Experience | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reservations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reviews | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Sample Companies

### Architecture Examples

| Slug | Name | Category | Destination | Modules |
|------|------|----------|-------------|---------|
| albasie | Albasie | Marine | Valdivia | — |
| secnet | Secnet | Telecom/Security | Valdivia | — |
| esr-motos | ESR Motos | Automotive | Valdivia | — |
| hospedaje-demo | Hospedaje Demo | Accommodation | Valdivia | Reservations, Availability, Payments, Reviews |
| hostal-patagonia-demo | Hostal Patagonia Demo | Accommodation | Natales | Reservations, Availability, Reviews |
| cafe-cultural-demo | Café Cultural Demo | Gastronomy | Chiloé | Reservations, Reviews |

**Note**: These are architecture examples only. No real business data.

---

## Themes

| Slug | Name | Destination | Primary Color |
|------|------|-------------|---------------|
| valdivia-default | Valdivia Default | Valdivia | #2E7D32 |
| patagonia-default | Patagonia Default | Natales/Punta Arenas | #1565C0 |
| chiloe-default | Chiloé Default | Chiloé | #6A1B9A |

---

## Experience Templates

| Slug | Name | Type | Status |
|------|------|------|--------|
| tourism-landing | Tourism Landing Experience | tourism | published |
| business-landing | Business Landing Experience | business | published |
| accommodation-listing | Accommodation Listing Experience | accommodation | published |
| tourism-destination | Tourism Destination Experience | destination | draft |

---

## Multi-Country Ready

The platform architecture supports multiple countries. Current seed includes Chile with infrastructure for:

```javascript
FUTURE_COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'PE', name: 'Peru' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' },
]
```

---

## Technical Details

### Database Schema Coverage

| Layer | Tables | Entities |
|-------|--------|----------|
| Platform | 7 | tenants, countries, regions, destinations, domains, themes, languages |
| Ecosystem | 4 | ecosystems, categories, modules, experiences |
| Company | 4 | companies, company_profiles, company_modules, company_settings |

### Seed Safety

- **No production data**: All records are architecture examples
- **No real credentials**: Example emails use `.example.com` domain
- **No customer data**: Only template company records
- **No payment information**: Payment settings are empty or example only

---

## Version

- **Platform**: Valdi Platform v4.1
- **Phase**: P12.3.1.5
- **Document Version**: 1.0
- **Last Updated**: 2026-08-06
