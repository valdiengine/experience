export const INTELLIGENCE_EVENTS = Object.freeze({
  VISITOR_PROFILE_CREATED: 'intelligence.visitor.profile.created',
  VISITOR_PROFILE_UPDATED: 'intelligence.visitor.profile.updated',
  VISITOR_INTEREST_DETECTED: 'intelligence.visitor.interest.detected',
  VISITOR_BEHAVIOR_TRACKED: 'intelligence.visitor.behavior.tracked',

  RECOMMENDATION_GENERATED: 'intelligence.recommendation.generated',
  EXPERIENCE_RECOMMENDED: 'intelligence.experience.recommended',
  PLACE_RECOMMENDED: 'intelligence.place.recommended',
  BUSINESS_RECOMMENDED: 'intelligence.business.recommended',
  SPECIES_RECOMMENDED: 'intelligence.species.recommended',

  DESTINATION_INSIGHT_CREATED: 'intelligence.destination.insight.created',
  TOURISM_PATTERN_DETECTED: 'intelligence.tourism.pattern.detected',
  ECOLOGY_PATTERN_DETECTED: 'intelligence.ecology.pattern.detected',
  ECONOMIC_PATTERN_DETECTED: 'intelligence.economic.pattern.detected',

  DEMAND_PREDICTED: 'intelligence.demand.predicted',
  VISITOR_PREDICTION_CREATED: 'intelligence.visitor.prediction.created',
  SEASONAL_PREDICTION_CREATED: 'intelligence.seasonal.prediction.created',

  AI_ASSISTANT_REQUESTED: 'intelligence.ai.assistant.requested',
  AI_ASSISTANT_RESPONDED: 'intelligence.ai.assistant.responded',
  AI_ASSISTANT_FEEDBACK: 'intelligence.ai.assistant.feedback',

  KNOWLEDGE_GRAPH_UPDATED: 'intelligence.knowledge.graph.updated',
  CONNECTION_DISCOVERED: 'intelligence.knowledge.connection.discovered',

  INTELLIGENCE_SYNC_STARTED: 'intelligence.sync.started',
  INTELLIGENCE_SYNC_COMPLETED: 'intelligence.sync.completed',
  INTELLIGENCE_OFFLINE_QUEUED: 'intelligence.sync.offline.queued'
});

export function createIntelligenceEvent(type, data) {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    source: 'intelligence-capability'
  };
}
