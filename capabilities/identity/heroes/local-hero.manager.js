import { HERO_TYPE, RECOGNITION_LEVEL } from '../identity.schema.js';
import { IDENTITY_EVENTS, createIdentityEvent } from '../identity.events.js';

export default class LocalHeroManager {
  constructor(context) {
    this.context = context;
    this.heroes = new Map();
  }

  async addHero(destinationId, name, type, data = {}) {
    const id = 'hero-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const hero = {
      id, destinationId, name, type,
      role: data.role || '',
      story: data.story || '',
      contribution: data.contribution || '',
      location: data.location || null,
      media: data.media || [],
      recognitionLevel: data.recognitionLevel || RECOGNITION_LEVEL.LOCAL,
      verified: false,
      createdAt: new Date()
    };
    this.heroes.set(id, hero);
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.HERO_ADDED, { heroId: id, destinationId, name, type }));
    return hero;
  }

  async verifyHero(heroId, verifierId) {
    const hero = this.heroes.get(heroId);
    if (!hero) return null;
    hero.verified = true;
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.HERO_VERIFIED, { heroId, destinationId: hero.destinationId, verifierId }));
    return hero;
  }

  async updateRecognition(heroId, level) {
    const hero = this.heroes.get(heroId);
    if (!hero) return null;
    const previousLevel = hero.recognitionLevel;
    hero.recognitionLevel = level;
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.HERO_RECOGNIZED, { heroId, destinationId: hero.destinationId, previousLevel, newLevel: level }));
    return hero;
  }

  async addMedia(heroId, media) {
    const hero = this.heroes.get(heroId);
    if (!hero) return null;
    hero.media.push({ id: 'media-' + Date.now(), ...media, addedAt: new Date() });
    return hero;
  }

  async updateStory(heroId, story) {
    const hero = this.heroes.get(heroId);
    if (!hero) return null;
    hero.story = story;
    return hero;
  }

  getHero(heroId) {
    return this.heroes.get(heroId) || null;
  }

  getHeroesByDestination(destinationId) {
    return Array.from(this.heroes.values()).filter(h => h.destinationId === destinationId);
  }

  getHeroesByType(destinationId, type) {
    return Array.from(this.heroes.values()).filter(h => h.destinationId === destinationId && h.type === type);
  }

  getVerifiedHeroes(destinationId) {
    return Array.from(this.heroes.values()).filter(h => h.destinationId === destinationId && h.verified);
  }

  getHeroesByRecognition(destinationId, level) {
    return Array.from(this.heroes.values()).filter(h => h.destinationId === destinationId && h.recognitionLevel === level);
  }

  getHeroStats(destinationId) {
    const heroes = this.getHeroesByDestination(destinationId);
    return {
      total: heroes.length,
      verified: heroes.filter(h => h.verified).length,
      byType: Object.fromEntries(Object.values(HERO_TYPE).map(t => [t, heroes.filter(h => h.type === t).length])),
      byRecognition: Object.fromEntries(Object.values(RECOGNITION_LEVEL).map(l => [l, heroes.filter(h => h.recognitionLevel === l).length]))
    };
  }
}
