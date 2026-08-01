# PLATFORM_GLOSSARY.md

> Official vocabulary. Every term has exactly one definition.

---

## Territory Entities

**Destination** — The primary ecosystem identity. A geographical area with shared tourism, ecology, and cultural identity. Contains localities, places, experiences, and businesses.

**Region** — A group of destinations sharing geographical or administrative boundaries. Example: Costa de Valdivia.

**Locality** — A community identity within a destination. A neighborhood, village, or district with its own character. Contains places and experiences.

**Commune** — Administrative subdivision within a destination. Groups localities for governance purposes.

**Place** — A tourism discovery point. A trail, viewpoint, beach, restaurant, park, or landmark. Contains experiences.

**Experience** — A bookable service or activity offered within a place. A surf lesson, a guided hike, a cooking class, a kayak tour.

---

## People Entities

**Business Tenant** — A service provider operating inside the ecosystem. Offers experiences. Participates in the destination economy.

**Visitor** — An ecosystem participant. Explores destinations. Generates content. Builds reputation. Contributes community knowledge.

**Explorer** — A visitor who actively participates in gamification. Completes missions. Earns badges. Discovers species. Builds an explorer profile.

**Guardian** — A visitor who has earned high reputation through conservation contributions and community participation. Level 4 in the reputation system.

**Ambassador** — The highest reputation level. A visitor who represents the destination through sustained contribution. Level 5.

**Partner** — A business that has been certified for ecosystem participation. Earned through contribution, not payment.

**Community Leader** — A local resident who manages and curates community content for their locality.

---

## Ecology Entities

**Species** — A documented plant, animal, or organism within the ecosystem. Cataloged in the Eco Pokedex.

**Habitat** — A defined ecological zone within a destination. A forest, wetland, coastal area, or marine zone.

**Observation** — A visitor-contributed ecological data point. A species sighting, a trail condition report, a wildlife photo.

**EcoScore** — A quantified measure of a visitor's ecological contribution. Earned through conservation activities and citizen science.

**EcoToken** — Digital tokens earned through ecological contributions. Have value within the ecosystem marketplace.

**EcoTrust** — A trust score measuring the reliability of ecological observations. Higher trust = more valuable data.

**EcoSeal** — Certification awarded to businesses demonstrating verified sustainable practices.

---

## Gamification Entities

**Mission** — A defined task tied to a real place or ecology. Examples: identify 5 species, visit 3 viewpoints, complete a trail.

**Badge** — An achievement marker earned through sustained contribution. Categories: Explorer, Conservationist, Community, Sports.

**Challenge** — A community-wide objective. Example: "Document 100 species this season."

**Completion** — A measure of territory exploration percentage. Based on places visited, species discovered, missions completed.

**Leaderboard** — Ranked list of explorers by points, badges, or contribution.

**Explorer Card** — A visitor's public profile showing badges, species discovered, places visited, and reputation.

**Eco Pokedex** — The species catalog. Contains FloraDex (plants), FaunaDex (animals), MarineDex (marine life).

---

## Community Entities

**Memory** — A visitor-created story connected to a territory. Contains photos, text, tips, and emotional context.

**Review** — A structured rating (1-5 stars) of any ecosystem entity. Includes written feedback.

**Interaction** — A social action: like, follow, helpful vote, comment.

**Reputation** — A score earned through community participation. Levels: Explorador → Viajero → Aventurero → Guardian → Embajador.

**Moderation** — The workflow for content quality control. States: pending → approved / rejected / flagged.

---

## Cultural Entities

**Story** — A cultural narrative belonging to a community. Types: Historical, Human, Nature, Experience, Legend, Tradition.

**Heritage** — Documented cultural assets. Tangible: buildings, monuments. Intangible: traditions, food, music, crafts.

**Local Hero** — A recognized community member who contributes to the destination's identity. Types: Fisherman, Artisan, Scientist, Explorer, Conservationist, Entrepreneur, Community Leader, Educator.

**Cultural Memory** — Collective knowledge preserved by communities. Categories: Personal, Family, Community, Historical, Cultural, Traditional, Natural.

**Cultural Route** — A themed path connecting places, stories, and heritage within a destination.

---

## Operational Entities

**Campaign** — A managed initiative to achieve a destination objective. Types: Promotion, Seasonal, Event, Conservation.

**Health Score** — A quantified measure of destination ecosystem health. Components: ecology, community, economy, operations, identity.

**Season Profile** — Defined seasonal patterns for a destination. Affects recommendations, campaigns, and operations.

**Alert** — An automated notification triggered by operational thresholds. Types: health, campaign, seasonal.

---

## Platform Entities

**Capability** — A self-contained, independently activatable feature module. Extends BaseCapability. Has lifecycle: init → activate → deactivate → destroy.

**Event** — A state change emitted through the EventBus. Naming: `domain:entity.action`.

**Tenant** — An isolated instance of the platform. Each business, destination, or organization is a tenant.

**Provider** — A data source abstraction. Handles communication with external data sources.

**DataManager** — The central data access layer. Handles cache, search, filter, validate, normalize.

**EventBus** — The communication backbone. Components communicate only through events.

---

## Economic Entities

**Partner Profile** — A business's ecosystem participation record. Includes contribution history, eco-seal status, and reputation.

**Contextual Discovery** — Non-advertising recommendation system. Shows relevant businesses based on context, not payment.

**Experience Economy** — Revenue model based on experiences, not accommodations. Values activities over lodging.

**Community Economy** — Revenue generated through community participation. Local guides, cultural workshops, conservation tourism.

---

## Avoid These Terms

| Do Not Use | Use Instead |
|------------|-------------|
| User | Visitor, Explorer, Community Member |
| Listing | Place, Experience |
| Booking | Reservation |
| Rating | Review |
| Push notification | Communication |
| Dashboard | Portal |
| Admin panel | Governance Portal |
| Feature | Capability |
| Plugin | Capability (unless truly external) |
| API endpoint | Event, Capability interface |
| Database record | Entity, Resource |
| CRUD | Lifecycle operations |
| Login | Authentication |
| Permission | Entitlement |
