# DATA_CONTRACTS.md

> Data schemas, DTOs, and payload definitions.

---

## Entity Schemas

### Destination

```js
{
  id: string,                    // Unique identifier
  name: string,                  // Display name
  slug: string,                  // URL-friendly identifier
  description: string,           // Description
  region: string,                // Parent region ID
  coordinates: {
    lat: number,
    lng: number
  },
  timezone: string,              // IANA timezone
  locale: string,                // Primary locale (e.g., 'es-CL')
  branding: {
    primaryColor: string,        // Hex color
    secondaryColor: string,
    logo: string,                // URL
    favicon: string              // URL
  },
  config: {
    pwa: {
      enabled: boolean,
      name: string,
      shortName: string
    },
    seo: {
      title: string,
      description: string,
      keywords: string[]
    }
  },
  status: 'active' | 'paused' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

### Locality

```js
{
  id: string,
  destinationId: string,         // Parent destination
  name: string,
  slug: string,
  description: string,
  coordinates: {
    lat: number,
    lng: number
  },
  manager: string,               // Community leader user ID
  heritage: string[],            // Heritage item IDs
  stories: string[],             // Story IDs
  status: 'active' | 'pending' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

### Place

```js
{
  id: string,
  localityId: string,            // Parent locality
  destinationId: string,         // Parent destination
  name: string,
  slug: string,
  description: string,
  type: 'trail' | 'viewpoint' | 'beach' | 'restaurant' | 'park' | 'landmark' | 'other',
  coordinates: {
    lat: number,
    lng: number
  },
  media: [{
    type: 'image' | 'video' | '360',
    url: string,
    alt: string
  }],
  features: string[],
  status: 'active' | 'pending' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

### Experience

```js
{
  id: string,
  placeId: string,               // Parent place
  businessId: string,            // Offering business
  name: string,
  slug: string,
  description: string,
  type: 'lesson' | 'tour' | 'activity' | 'workshop' | 'other',
  duration: number,              // Minutes
  capacity: number,
  price: {
    amount: number,
    currency: string
  },
  schedule: {
    type: 'fixed' | 'flexible',
    slots: [{
      day: string,
      startTime: string,
      endTime: string
    }]
  },
  media: [{
    type: 'image' | 'video',
    url: string,
    alt: string
  }],
  status: 'active' | 'pending' | 'suspended',
  createdAt: Date,
  updatedAt: Date
}
```

### Reservation

```js
{
  id: string,
  experienceId: string,
  businessId: string,
  visitorId: string,
  tenantId: string,
  date: string,                  // ISO date
  time: string,                  // HH:mm
  partySize: number,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  payment: {
    status: 'pending' | 'completed' | 'failed' | 'refunded',
    amount: number,
    currency: string
  },
  notes: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Visitor

```js
{
  id: string,
  name: string,
  email: string,
  avatar: string,
  reputation: {
    level: 1 | 2 | 3 | 4 | 5,
    points: number,
    name: 'Explorador' | 'Viajero' | 'Aventurero' | 'Guardian' | 'Embajador'
  },
  ecoScore: number,
  ecoTokens: number,
  visits: number,
  discoveries: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Memory

```js
{
  id: string,
  visitorId: string,
  destinationId: string,
  localityId: string,
  placeId: string,
  title: string,
  content: string,
  media: [{
    type: 'image' | 'video',
    url: string,
    alt: string
  }],
  tips: string,
  emotionalImpact: 'neutral' | 'positive' | 'very_positive' | 'negative',
  mood: string,
  season: 'spring' | 'summer' | 'autumn' | 'winter',
  tags: string[],
  status: 'pending' | 'approved' | 'rejected' | 'featured',
  likes: number,
  comments: number,
  helpful: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Species

```js
{
  id: string,
  name: string,
  scientificName: string,
  type: 'flora' | 'fauna' | 'marine',
  category: string,              // e.g., 'bird', 'mammal', 'plant'
  habitat: string[],
  conservationStatus: 'least_concern' | 'near_threatened' | 'vulnerable' | 'endangered' | 'critically_endangered',
  description: string,
  media: [{
    type: 'image' | 'video',
    url: string,
    alt: string
  }],
  observations: number,
  firstObserved: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Story

```js
{
  id: string,
  destinationId: string,
  localityId: string,
  title: string,
  content: string,
  type: 'historical' | 'human' | 'nature' | 'experience' | 'legend' | 'tradition',
  chapters: [{
    title: string,
    content: string,
    media: [{
      type: 'image' | 'video',
      url: string,
      alt: string
    }]
  }],
  characters: [{
    name: string,
    role: string,
    description: string
  }],
  themes: string[],
  tags: string[],
  language: string,
  author: string,
  status: 'draft' | 'published' | 'validated',
  validation: {
    required: boolean,
    validator: string,
    validatedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## See Also

- [EVENT_CONTRACTS.md](./EVENT_CONTRACTS.md) — Event contracts
- [PUBLIC_API.md](./PUBLIC_API.md) — Public API
- `docs/ai/CAPABILITY_INDEX.md` — Capability details
