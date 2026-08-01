import { MEMORY_CATEGORY, VALIDATION_STATUS } from '../identity.schema.js';
import { IDENTITY_EVENTS, createIdentityEvent } from '../identity.events.js';

export default class CulturalMemoryManager {
  constructor(context) {
    this.context = context;
    this.memories = new Map();
  }

  async createCulturalMemory(destinationId, visitorId, category, data) {
    const id = 'cmem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const memory = {
      id, destinationId, visitorId, category,
      title: data.title || '',
      content: data.content || '',
      media: data.media || [],
      location: data.location || null,
      date: data.date || new Date(),
      relatedEntities: data.relatedEntities || [],
      culturalSignificance: data.culturalSignificance || 'personal',
      validationStatus: VALIDATION_STATUS.PENDING,
      contributionToHeritage: data.contributionToHeritage || '',
      createdAt: new Date()
    };
    this.memories.set(id, memory);
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.CULTURAL_MEMORY_CREATED, { memoryId: id, destinationId, category }));
    return memory;
  }

  async validateCulturalMemory(memoryId, validatorId, status) {
    const memory = this.memories.get(memoryId);
    if (!memory) return null;
    memory.validationStatus = status;
    if (status === VALIDATION_STATUS.CULTURALLY_VALIDATED) {
      this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.CULTURAL_MEMORY_VALIDATED, { memoryId, destinationId: memory.destinationId, validatorId }));
    }
    return memory;
  }

  async addMedia(memoryId, media) {
    const memory = this.memories.get(memoryId);
    if (!memory) return null;
    memory.media.push({ id: 'media-' + Date.now(), ...media, addedAt: new Date() });
    return memory;
  }

  async addRelatedEntity(memoryId, entity) {
    const memory = this.memories.get(memoryId);
    if (!memory) return null;
    memory.relatedEntities.push(entity);
    return memory;
  }

  getCulturalMemory(memoryId) {
    return this.memories.get(memoryId) || null;
  }

  getCulturalMemoriesByDestination(destinationId) {
    return Array.from(this.memories.values()).filter(m => m.destinationId === destinationId);
  }

  getCulturalMemoriesByCategory(destinationId, category) {
    return Array.from(this.memories.values()).filter(m => m.destinationId === destinationId && m.category === category);
  }

  getCulturalMemoriesByVisitor(visitorId) {
    return Array.from(this.memories.values()).filter(m => m.visitorId === visitorId);
  }

  getValidatedMemories(destinationId) {
    return Array.from(this.memories.values()).filter(m => m.destinationId === destinationId && m.validationStatus === VALIDATION_STATUS.CULTURALLY_VALIDATED);
  }

  getCulturalMemoryStats(destinationId) {
    const memories = this.getCulturalMemoriesByDestination(destinationId);
    return {
      total: memories.length,
      validated: memories.filter(m => m.validationStatus === VALIDATION_STATUS.CULTURALLY_VALIDATED).length,
      byCategory: Object.fromEntries(Object.values(MEMORY_CATEGORY).map(c => [c, memories.filter(m => m.category === c).length])),
      contributors: new Set(memories.map(m => m.visitorId)).size
    };
  }
}
