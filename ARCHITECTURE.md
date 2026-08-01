# Valdi Engine — Architecture

## 1. Filosofía

Valdi Engine nace de la necesidad de crear un sistema que crezca durante años sin degradarse. Cada decisión arquitectónica responde a una creencia fundamental:

**El sistema debe ser más que la suma de sus partes.**

- **Separación total de responsabilidades.** Cada pieza sabe solo lo que necesita saber. nada más.
- **Estado inmutable y centralizado.** Toda la información vive en un único árbol JSON. Los componentes leen y disparan acciones, nunca mutan directamente.
- **Comunicación basada en eventos.** Componentes no se conocen entre sí; se comunican mediante un bus de eventos global.
- **Desacoplamiento por capas.** Cada capa solo habla con la inmediata inferior. Nunca se salta una capa.
- **Plugabilidad.** Funcionalidades nuevas se añaden como módulos independientes sin tocar el núcleo.
- **Multi-tenant por diseño.** El sistema soporta múltiples proyectos con datasets independientes desde el primer día.

---

## 2. Arquitectura

### 2.1. Capas (Layers)

```
L0  Shared          → Utilidades, constantes, schemas, eventos
L1  Core            → Boot, routing, theme, data access, event bus
L2  Providers       → Abstracción de fuentes de datos
L3  Tenant Manager  → Configuración por proyecto, resolución de motores
L4  Capabilities    → Módulos de funcionalidad (blog, portfolio, servicios)
L5  Plugins         → Preocupaciones transversales (analytics, SEO, i18n)
L6  Business        → Lógica de dominio (reservas, pagos, notificaciones)
L7  Workflows       → Ejecución de flujos visuales multi-paso
L8  Automation      → Reglas basadas en eventos
L9  Engines         → Subsistemas especializados (Experience, Reservation, Notification, PWA, Admin)
L10 Admin           → Panel de gestión para operaciones de negocio
```

### 2.2. Árbol de Directorios

```
valdi/
├── shared/                          # L0 — Utilidades transversales
│   ├── utils/
│   │   ├── dom.js                   # el, elAttr, clear, $, $$
│   │   ├── format.js                # sanitize, formatValue, getLabel
│   │   ├── performance.js           # debounce, throttle, nextFrame
│   │   ├── a11y.js                  # trapFocus, announce
│   │   ├── icons.js                 # Icons map, getIcon
│   │   └── observers.js             # observeOnce, createObserver
│   ├── constants/
│   │   ├── labels.js                # LABELS map
│   │   ├── status.js                # EXCLUDE_FIELDS, STATUS maps
│   │   └── config.js                # PAGINATION_DEFAULTS, BREAKPOINTS, LOCALE
│   ├── events/
│   │   └── eventbus.js              # createEventBus() factory
│   └── schema/
│       ├── normalize.js             # inferFields, inferEnumFields
│       ├── validators.js            # isRequired, isEmail, validate
│       └── types.js                 # FIELD_TYPES, CATEGORIES
│
├── engine/                          # L1–L2 — Core + Providers
│   ├── core/
│   │   ├── app.js                   # Boot orchestrator
│   │   ├── bootstrap.js             # DOMContentLoaded, init sequence
│   │   ├── router.js                # Hash-based SPA routing
│   │   ├── loader.js                # Loading screen
│   │   ├── theme.js                 # Dark/light manager
│   │   ├── datamanager.js           # Data access — ONLY via Providers
│   │   └── eventbus.js              # App-level EventBus singleton
│   ├── providers/
│   │   ├── base.provider.js         # Abstract interface
│   │   ├── json.provider.js         # data.js provider (default)
│   │   ├── api.provider.js          # REST/GraphQL (future)
│   │   └── cms.provider.js          # Headless CMS (future)
│   └── data/
│       └── data.js                  # DEFAULT dataset (multi-project ready)
│
├── capabilities/                    # L3–L5 — Tenant, Capabilities, Plugins
│   ├── tenant/
│   │   ├── tenant.manager.js        # Loads config, resolves active engine
│   │   ├── tenant.config.js         # Config schema + defaults
│   │   └── tenant.resolver.js       # Maps config → active engines
│   ├── capabilities/
│   │   ├── capability.registry.js   # Register/query capabilities
│   │   ├── capability.loader.js     # Dynamic import by name
│   │   └── capabilities/
│   │       ├── blog.capability.js
│   │       ├── portfolio.capability.js
│   │       ├── services.capability.js
│   │       ├── configurator.capability.js
│   │       └── ...
│   └── plugins/
│       ├── plugin.registry.js       # Register/query plugins
│       ├── plugin.loader.js         # Dynamic import by name
│       ├── plugin.lifecycle.js      # install/uninstall/enable/disable
│       └── plugins/
│           ├── analytics.plugin.js
│           ├── seo.plugin.js
│           ├── i18n.plugin.js
│           └── ...
│
├── business/                        # L6 — Domain services
│   └── services/
│       ├── reservation.service.js   # Availability, booking, confirmation
│       ├── payment.service.js       # Payment processing
│       ├── notification.service.js  # Email, SMS, push
│       ├── user.service.js          # Auth, profiles
│       └── analytics.service.js     # Event tracking
│
├── workflows/                       # L7 — Visual workflow engine
│   ├── engine/
│   │   ├── workflow.engine.js       # Execute workflow graphs
│   │   ├── workflow.parser.js       # Parse workflow definitions
│   │   └── workflow.context.js      # Runtime context/state
│   ├── nodes/
│   │   ├── trigger.node.js          # Event triggers
│   │   ├── condition.node.js        # Branching logic
│   │   ├── action.node.js           # Side effects
│   │   └── delay.node.js            # Timers
│   └── workflows/
│       ├── booking.workflow.js      # Reservation → Confirmation → Notification
│       └── lead.workflow.js         # Contact Form → Qualify → Assign
│
├── automation/                      # L8 — Event-driven rules
│   ├── engine/
│   │   ├── automation.engine.js     # Match events → trigger workflows
│   │   ├── rule.parser.js           # Parse rule definitions
│   │   └── rule.context.js          # Rule runtime state
│   ├── actions/
│   │   ├── webhook.action.js        # HTTP callbacks
│   │   ├── email.action.js          # Email sending
│   │   └── notification.action.js   # In-app/push notifications
│   └── rules/
│       ├── booking.confirmed.js     # On booking → send confirmation
│       └── payment.received.js      # On payment → update status
│
├── engines/                         # L9 — Specialized engines
│   ├── experience/                  # Main site engine (formerly src/)
│   │   ├── pages/
│   │   │   ├── home.page.js
│   │   │   ├── services.page.js
│   │   │   ├── portfolio.page.js
│   │   │   ├── about.page.js
│   │   │   ├── contact.page.js
│   │   │   └── blog.page.js
│   │   ├── components/
│   │   │   ├── card.js
│   │   │   ├── carousel.js
│   │   │   ├── lightbox.js
│   │   │   ├── gallery.js
│   │   │   ├── configurator.js
│   │   │   ├── comparator.js
│   │   │   ├── filters.js
│   │   │   ├── format-explorer.js
│   │   │   └── expanded-view.js
│   │   ├── experience.engine.js     # Engine orchestrator
│   │   └── animations.js            # Scroll/intersection animations
│   │
│   ├── reservation/                 # Booking engine
│   │   ├── calendar/
│   │   │   ├── calendar.component.js
│   │   │   └── time-slot.component.js
│   │   ├── booking/
│   │   │   ├── booking-form.component.js
│   │   │   └── booking-confirmation.component.js
│   │   └── reservation.engine.js    # Orchestrator
│   │
│   ├── notification/                # Notification engine
│   │   ├── channels/
│   │   │   ├── email.channel.js
│   │   │   ├── sms.channel.js
│   │   │   └── push.channel.js
│   │   ├── templates/
│   │   │   ├── booking-confirmed.js
│   │   │   ├── payment-received.js
│   │   │   └── lead-assigned.js
│   │   └── notification.engine.js   # Orchestrator
│   │
│   ├── pwa/                         # PWA engine
│   │   ├── sw.js                    # Service worker
│   │   ├── manifest.js              # Web manifest
│   │   ├── offline/
│   │   │   ├── cache.strategy.js
│   │   │   └── offline.page.js
│   │   └── pwa.engine.js            # Orchestrator
│   │
│   └── admin/                       # Admin panel engine
│       ├── pages/
│       │   ├── dashboard.page.js
│       │   ├── bookings.page.js
│       │   ├── services.page.js
│       │   ├── clients.page.js
│       │   └── settings.page.js
│       ├── components/
│       │   ├── data-table.js
│       │   ├── stat-card.js
│       │   ├── chart.js
│       │   └── form-builder.js
│       └── admin.engine.js          # Orchestrator
│
├── assets/                          # Static assets (independent)
│   ├── images/
│   ├── videos/
│   ├── fonts/
│   └── icons/
│
├── styles/                          # CSS
│   ├── base/
│   │   ├── reset.css
│   │   ├── typography.css
│   │   └── variables.css
│   ├── components/
│   │   ├── card.css
│   │   ├── carousel.css
│   │   ├── lightbox.css
│   │   └── ...
│   ├── pages/
│   │   ├── home.css
│   │   ├── services.css
│   │   └── ...
│   ├── admin/
│   │   └── admin.css
│   └── main.css                     # Imports all
│
├── index.html                       # App shell
├── ARCHITECTURE.md                  # This document
├── ROADMAP.md                       # Project timeline
└── agent.md                         # AI agent rules
```

---

## 3. Dependencias

### 3.1. Grafo de Dependencias

```
L0 (Shared) → nothing
L1 (Core) → L0
L2 (Providers) → L0, L1
L3 (Tenant) → L1
L4 (Capabilities) → L0, L1, L3
L5 (Plugins) → L0, L1, L3, L4 (hooks only)
L6 (Business) → L0, L1, L2
L7 (Workflows) → L0, L1, L6
L8 (Automation) → L0, L1, L6, L7
L9 (Engines) → L0–L8 (as needed, never same-level siblings)
L10 (Admin) → L0–L9 (as needed)
```

### 3.2. Reglas de Dependencia (Golden Rules)

| Rule | Description |
|------|-------------|
| **Never import UP** | L6 cannot import L9. Higher layers depend on lower, never reverse. |
| **Never import SAME-LEVEL sibling** | Experience cannot import Reservation. Use EventBus for cross-engine communication. |
| **Cross-engine ONLY via EventBus** | Engines communicate exclusively through the application EventBus. |
| **DataManager ONLY via Providers** | DataManager never accesses data.js directly. All data flows through Providers. |
| **Shared has ZERO app knowledge** | Shared utilities cannot import from engine/, capabilities/, business/, or any app layer. |

---

## 4. Motores (Engines)

### 4.1. Experience Engine (L9)
**Responsibility:** Main website — public-facing pages, components, animations.

| Component | Purpose |
|-----------|---------|
| `experience.engine.js` | Orchestrator — boots pages, manages transitions |
| `pages/` | Home, Services, Portfolio, About, Contact, Blog |
| `components/` | Card, Carousel, Lightbox, Gallery, Configurator, Comparator, Filters, FormatExplorer, ExpandedView |
| `animations.js` | Scroll-triggered animations, intersection observers |

### 4.2. Reservation Engine (L9)
**Responsibility:** Booking flow — calendar, time slots, form, confirmation.

| Component | Purpose |
|-----------|---------|
| `reservation.engine.js` | Orchestrator — manages booking lifecycle |
| `calendar/` | Calendar component, time slot selection |
| `booking/` | Booking form, confirmation page |

### 4.3. Notification Engine (L9)
**Responsibility:** Multi-channel notifications — email, SMS, push.

| Component | Purpose |
|-----------|---------|
| `notification.engine.js` | Orchestrator — routes notifications to channels |
| `channels/` | Email, SMS, Push providers |
| `templates/` | Notification templates (booking confirmed, payment received, etc.) |

### 4.4. PWA Engine (L9)
**Responsibility:** Progressive Web App — service worker, offline support, installability.

| Component | Purpose |
|-----------|---------|
| `pwa.engine.js` | Orchestrator — registers service worker, manages cache |
| `sw.js` | Service worker — intercepts requests, serves cache |
| `offline/` | Cache strategy, offline fallback page |

### 4.5. Admin Engine (L9)
**Responsibility:** Management dashboard — CRUD operations, analytics, settings.

| Component | Purpose |
|-----------|---------|
| `admin.engine.js` | Orchestrator — admin pages and navigation |
| `pages/` | Dashboard, Bookings, Services, Clients, Settings |
| `components/` | DataTable, StatCard, Chart, FormBuilder |

---

## 5. Providers

### 5.1. Propósito
Providers abstract data sources. DataManager never accesses data directly — it always goes through a Provider.

### 5.2. Interfaz Base

```js
class BaseProvider {
  async load() {}           // Initialize data source
  get(path) {}              // Get value at path
  set(path, value) {}       // Set value at path
  getAll() {}               // Get entire dataset
}
```

### 5.3. Providers Implementados

| Provider | Source | Use Case |
|----------|--------|----------|
| `JSONProvider` | data.js | Default — static dataset |
| `APIProvider` | REST/GraphQL | Future — dynamic backend |
| `CMSProvider` | Headless CMS | Future — content management |

### 5.4. Flujo de Datos

```
UI Component
    ↓
DataManager
    ↓
Provider (JSON / API / CMS)
    ↓
Data Source (data.js / Backend / CMS)
```

---

## 6. Servicios (Business Services)

### 6.1. Propósito
Business services contain domain logic. They are called by engines and workflows, never by UI components directly.

### 6.2. Servicios

| Service | Responsibility |
|---------|----------------|
| `reservation.service.js` | Availability checking, booking creation, confirmation |
| `payment.service.js` | Payment processing, refunds, invoicing |
| `notification.service.js` | Multi-channel notification dispatch |
| `user.service.js` | Authentication, profiles, permissions |
| `analytics.service.js` | Event tracking, metrics collection |

### 6.3. Reglas de Servicios
- Services are stateless — they receive data, process it, return results
- Services communicate with Providers for data access
- Services emit events via EventBus for cross-cutting concerns
- Services never import UI components

---

## 7. Módulos (Capabilities & Plugins)

### 7.1. Capabilities (L4)
Capabilities are feature modules — self-contained, independently activatable.

| Capability | Description |
|------------|-------------|
| `blog.capability.js` | Blog posts, categories, comments |
| `portfolio.capability.js` | Portfolio gallery, project details |
| `services.capability.js` | Service listings, pricing |
| `configurator.capability.js` | Product configurator |

### 7.2. Plugins (L5)
Plugins are cross-cutting concerns — they hook into the system lifecycle.

| Plugin | Description |
|--------|-------------|
| `analytics.plugin.js` | Event tracking, page views |
| `seo.plugin.js` | Meta tags, structured data |
| `i18n.plugin.js` | Internationalization, translations |

### 7.3. Tenant Manager (L3)
The Tenant Manager loads project configuration and resolves which engines/capabilities are active.

```js
// Example tenant config
{
  "project": "dronestica",
  "engines": ["experience", "reservation", "notification"],
  "capabilities": ["blog", "portfolio", "services"],
  "plugins": ["analytics", "seo"],
  "theme": "dark",
  "locale": "es"
}
```

---

## 8. Principios

### 8.1. Principios No Negociables

1. **Un componente no importa otro componente.** Solo importa servicios, selectores y el event bus.
2. **Un componente no toca el DOM fuera de su contenedor.** Cada uno recibe un `container` y solo opera ahí.
3. **Una función no mezcla UI con lógica de negocio.** Los handlers llaman al store o services, nunca actualizan el DOM directamente.
4. **El store es la única fuente de verdad.** No existe estado duplicado en componentes.
5. **Toda comunicación asíncrona tiene timeout y retry.** Especialmente API calls y WebSockets.
6. **El sistema funciona sin JavaScript.** HTML semántico + CSS proporcionan una experiencia base funcional.
7. **Nunca confiar en el cliente.** Toda validación crítica se replica en el backend.
8. **Cada módulo expone una API clara.** Lo que no se exporta no existe.
9. **La deuda técnica se documenta.** Toda solución temporal lleva un `@todo` con issue vinculado.
10. **El sistema debe crecer durante años.** Cada decisión se toma pensando en el largo plazo.

### 8.2. Design Aesthetic

- **Cinematic:** Dark backgrounds, gold/amber accents, glassmorphism
- **Typography:** Cabinet Grotesk (display), Inter (body), JetBrains Mono (data)
- **Animations:** Slow-in/slow-out, 300-600ms transitions
- **Glassmorphism:** backdrop-filter: blur(12px), semi-transparent backgrounds

### 8.3. Communication Patterns

```
UI Component
    ↓ emit event
EventBus
    ↓ route to
Engine / Service / Store
    ↓ respond via
EventBus
    ↓ notify
UI Component (re-renders)
```

---

## 9. Referencia Rápida

| Concept | Location | Description |
|---------|----------|-------------|
| Utilities | `shared/utils/` | DOM, format, performance, a11y, icons, observers |
| Constants | `shared/constants/` | Labels, status, config |
| EventBus | `shared/events/eventbus.js` | Pub/sub factory |
| Schemas | `shared/schema/` | Normalize, validators, types |
| Core | `engine/core/` | App, router, theme, DataManager |
| Providers | `engine/providers/` | JSON, API (future), CMS (future) |
| Data | `engine/data/data.js` | Default dataset |
| Capabilities | `capabilities/capabilities/` | Feature modules |
| Plugins | `capabilities/plugins/` | Cross-cutting concerns |
| Services | `business/services/` | Domain logic |
| Workflows | `workflows/` | Visual workflow execution |
| Automation | `automation/` | Event-driven rules |
| Experience | `engines/experience/` | Main website |
| Reservation | `engines/reservation/` | Booking engine |
| Notification | `engines/notification/` | Multi-channel notifications |
| PWA | `engines/pwa/` | Progressive Web App |
| Admin | `engines/admin/` | Management dashboard |
