# Intelligence Capability

**Version:** 1.0.0 | **Status:** Active | **Dependencies:** None

## Purpose

Destination Intelligence & Personalization Layer. Transforms the ecosystem into a dynamic, adaptive tourism intelligence platform that understands visitors, destinations, and ecosystems to create personalized experiences.

## Architecture

```
intelligence/
├── intelligence.schema.js          # Schemas and enums
├── intelligence.events.js          # Event definitions
├── intelligence.manager.js         # Core intelligence manager
├── visitor/
│   └── visitor-intelligence.manager.js  # Visitor profiling and behavior
├── recommendation/
│   └── recommendation.manager.js        # Personalized recommendations
├── prediction/
│   └── prediction.manager.js            # Demand and pattern forecasting
├── knowledge/
│   └── knowledge-graph.manager.js       # Entity relationship mapping
├── assistant/
│   └── destination-ai.manager.js        # AI conversational assistant
├── analytics/
│   └── intelligence.analytics.js        # Intelligence metrics and dashboards
├── intelligence.capability.js     # Capability entry point
└── README.md
```

## Modules

### IntelligenceManager
Core manager handling profiles, recommendations, insights, predictions, and knowledge graph connections.

### VisitorIntelligenceManager
Tracks visitor behavior, analyzes preferences, builds personality profiles.

### RecommendationManager
Generates personalized recommendations across experience, ecological, sports, community, and seasonal types.

### PredictionManager
Forecasts tourism demand, species activity, booking trends. Detects seasonal patterns.

### KnowledgeGraphManager
Maps entity relationships (visitor-experience-place-species-business). Discovers connections and paths.

### DestinationAIManager
Conversational AI assistant for visitors, businesses, destination managers, and ecological advisory.

### IntelligenceAnalytics
Metrics, dashboards, counters for visitor intelligence, destination intelligence, ecology intelligence, and partner intelligence.

## Integration

Listens to events from:
- exploration (place discovery, species observation, activity completion)
- destination (data updates)
- ecology (observations)
- reservation (bookings)

Produces events:
- intelligence.visitor.profile.updated
- intelligence.visitor.interest.detected
- intelligence.recommendation.generated
- intelligence.destination.insight.created
- intelligence.demand.predicted
- intelligence.ai.assistant.requested
- intelligence.knowledge.connection.discovered

## Key Concepts

- **Visitor Intelligence Profile**: Complete understanding of visitor interests, style, level, history
- **Personalization Engine**: Combines profile + context + availability + weather for recommendations
- **Knowledge Graph**: Entity relationships mapping territory intelligence
- **AI Assistant**: Natural language interface for destination exploration
- **Predictive Analytics**: Tourism, ecology, and economy forecasting
- **Privacy First**: Private by default, public only by explicit permission
