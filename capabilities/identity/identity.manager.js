import { IDENTITY_EVENTS, createIdentityEvent } from './identity.events.js';

export default class IdentityManager {
  constructor(context) {
    this.context = context;
    this.identities = new Map();
  }

  async createIdentity(destinationId, data) {
    const existing = this.identities.get(destinationId);
    if (existing) return existing;
    const identity = {
      id: 'identity-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId,
      name: data.name || '',
      shortDescription: data.shortDescription || '',
      originStory: data.originStory || '',
      identityKeywords: data.identityKeywords || [],
      mainValues: data.mainValues || [],
      symbolism: data.symbolism || {},
      visualIdentity: data.visualIdentity || {},
      audioIdentity: data.audioIdentity || {},
      culturalProfile: data.culturalProfile || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.identities.set(destinationId, identity);
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.IDENTITY_CREATED, { destinationId, identityId: identity.id }));
    return identity;
  }

  async updateIdentity(destinationId, updates) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    Object.assign(identity, updates, { updatedAt: new Date() });
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.IDENTITY_UPDATED, { destinationId }));
    return identity;
  }

  async addKeyword(destinationId, keyword) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    if (!identity.identityKeywords.includes(keyword)) {
      identity.identityKeywords.push(keyword);
      identity.updatedAt = new Date();
    }
    return identity;
  }

  async addValue(destinationId, value) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    if (!identity.mainValues.includes(value)) {
      identity.mainValues.push(value);
      identity.updatedAt = new Date();
    }
    return identity;
  }

  async updateSymbolism(destinationId, symbolism) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    Object.assign(identity.symbolism, symbolism);
    identity.updatedAt = new Date();
    return identity;
  }

  async updateVisualIdentity(destinationId, visual) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    Object.assign(identity.visualIdentity, visual);
    identity.updatedAt = new Date();
    return identity;
  }

  async updateCulturalProfile(destinationId, profile) {
    const identity = this.identities.get(destinationId);
    if (!identity) return null;
    Object.assign(identity.culturalProfile, profile);
    identity.updatedAt = new Date();
    return identity;
  }

  getIdentity(destinationId) {
    return this.identities.get(destinationId) || null;
  }

  getAllIdentities() {
    return Array.from(this.identities.values());
  }

  searchByKeyword(keyword) {
    return Array.from(this.identities.values()).filter(i => i.identityKeywords.includes(keyword));
  }

  searchByValue(value) {
    return Array.from(this.identities.values()).filter(i => i.mainValues.includes(value));
  }
}
