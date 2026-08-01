import * as schemas from '../intelligence.schema.js';
import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from '../intelligence.events.js';

export default class DestinationAIManager {
  constructor(context) {
    this.context = context;
    this.conversations = new Map();
    this.knowledgeBase = new Map();
  }

  async startConversation(visitorId, mode = schemas.ASSISTANT_MODE.VISITOR) {
    const convId = 'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const conversation = {
      id: convId, visitorId, mode, messages: [],
      context: {}, startedAt: new Date(), lastMessageAt: new Date()
    };
    this.conversations.set(convId, conversation);
    return conversation;
  }

  async processQuery(conversationId, query) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return null;
    conv.messages.push({ role: 'user', content: query, timestamp: new Date() });
    const intent = this._classifyIntent(query);
    const response = this._generateResponse(conv, intent, query);
    conv.messages.push({ role: 'assistant', content: response.answer, timestamp: new Date(), metadata: response.metadata });
    conv.lastMessageAt = new Date();
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.AI_ASSISTANT_REQUESTED, { conversationId, intent }));
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.AI_ASSISTANT_RESPONDED, { conversationId, intent }));
    return response;
  }

  async loadKnowledge(destinationId, entityType, entityId, data) {
    const key = destinationId + ':' + entityType + ':' + entityId;
    this.knowledgeBase.set(key, { destinationId, entityType, entityId, data, loadedAt: new Date() });
  }

  async queryKnowledge(destinationId, entityType, filter = {}) {
    const results = [];
    for (const [, entry] of this.knowledgeBase) {
      if (entry.destinationId === destinationId && entry.entityType === entityType) {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if (entry.data[k] !== v) { match = false; break; }
        }
        if (match) results.push(entry);
      }
    }
    return results;
  }

  async getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  async getVisitorConversations(visitorId) {
    return Array.from(this.conversations.values()).filter(c => c.visitorId === visitorId);
  }

  _classifyIntent(query) {
    const lower = query.toLowerCase();
    if (lower.includes('what can i do') || lower.includes('recommend') || lower.includes('suggestion')) return 'recommendation';
    if (lower.includes('where') && (lower.includes('see') || lower.includes('find') || lower.includes('go'))) return 'location_query';
    if (lower.includes('book') || lower.includes('reserve') || lower.includes('availability')) return 'booking';
    if (lower.includes('species') || lower.includes('animal') || lower.includes('bird') || lower.includes('plant')) return 'ecology_query';
    if (lower.includes('hike') || lower.includes('kayak') || lower.includes('surf') || lower.includes('sport')) return 'activity_query';
    if (lower.includes('weather') || lower.includes('season') || lower.includes('temperature')) return 'weather_query';
    if (lower.includes('business') || lower.includes('restaurant') || lower.includes('hotel') || lower.includes('guide')) return 'business_query';
    if (lower.includes('challenge') || lower.includes('mission') || lower.includes('badge')) return 'challenge_query';
    if (lower.includes('help') || lower.includes('how')) return 'help';
    return 'general';
  }

  _generateResponse(conv, intent, query) {
    switch (intent) {
      case 'recommendation':
        return { answer: 'Based on your profile, I recommend exploring the local experiences. Check the Discover section for personalized suggestions.', metadata: { type: 'recommendation', sources: ['visitor_profile', 'destination_data'] } };
      case 'location_query':
        return { answer: 'I can help you find places. Check the map view or let me know what type of place you are looking for.', metadata: { type: 'location', sources: ['destination_places'] } };
      case 'booking':
        return { answer: 'I can help you check availability. Which experience or service are you interested in?', metadata: { type: 'booking', sources: ['availability'] } };
      case 'ecology_query':
        return { answer: 'Great interest in nature! Check the Nature section for species guides and habitat information. You can also log observations.', metadata: { type: 'ecology', sources: ['ecology_data'] } };
      case 'activity_query':
        return { answer: 'For outdoor activities, check the Experiences section. Routes are available for all skill levels.', metadata: { type: 'activity', sources: ['experiences', 'routes'] } };
      case 'weather_query':
        return { answer: 'Check the destination home screen for current weather and seasonal recommendations.', metadata: { type: 'weather', sources: ['weather_api'] } };
      case 'business_query':
        return { answer: 'Local businesses are shown contextually as you explore. Check the Businesses section for ecosystem partners.', metadata: { type: 'business', sources: ['partner_data'] } };
      case 'challenge_query':
        return { answer: 'Active challenges are shown in the Challenges section. Complete them to earn EcoTokens and EcoScore!', metadata: { type: 'challenge', sources: ['engagement_data'] } };
      case 'help':
        return { answer: 'I am your destination assistant. I can help with recommendations, locations, bookings, ecology, activities, and more. What would you like to know?', metadata: { type: 'help' } };
      default:
        return { answer: 'I can help you explore this destination. Try asking about places, experiences, species, or services.', metadata: { type: 'general' } };
    }
  }
}
