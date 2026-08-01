import { HERITAGE_CATEGORY, TANGIBLE_TYPE, INTANGIBLE_TYPE, VALIDATION_STATUS } from '../identity.schema.js';
import { IDENTITY_EVENTS, createIdentityEvent } from '../identity.events.js';

export default class HeritageManager {
  constructor(context) {
    this.context = context;
    this.items = new Map();
  }

  async addHeritageItem(destinationId, category, subcategory, name, description, data = {}) {
    const id = 'heritage-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const item = {
      id, destinationId, category, subcategory, name, description,
      history: data.history || '',
      media: data.media || [],
      importance: data.importance || 'local',
      validationStatus: VALIDATION_STATUS.PENDING,
      location: data.location || null,
      associatedPeople: data.associatedPeople || [],
      conservationStatus: data.conservationStatus || 'unknown',
      createdAt: new Date()
    };
    this.items.set(id, item);
    this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.HERITAGE_ITEM_ADDED, { itemId: id, destinationId, category }));
    return item;
  }

  async validateHeritageItem(itemId, validatorId, status) {
    const item = this.items.get(itemId);
    if (!item) return null;
    item.validationStatus = status;
    if (status === VALIDATION_STATUS.CULTURALLY_VALIDATED) {
      this.context.eventBus?.emit(createIdentityEvent(IDENTITY_EVENTS.HERITAGE_ITEM_VALIDATED, { itemId, destinationId: item.destinationId, validatorId }));
    }
    return item;
  }

  async updateHeritageItem(itemId, updates) {
    const item = this.items.get(itemId);
    if (!item) return null;
    Object.assign(item, updates);
    return item;
  }

  async addMedia(itemId, media) {
    const item = this.items.get(itemId);
    if (!item) return null;
    item.media.push({ id: 'media-' + Date.now(), ...media, addedAt: new Date() });
    return item;
  }

  async associatePerson(itemId, person) {
    const item = this.items.get(itemId);
    if (!item) return null;
    item.associatedPeople.push(person);
    return item;
  }

  getHeritageItem(itemId) {
    return this.items.get(itemId) || null;
  }

  getHeritageByDestination(destinationId) {
    return Array.from(this.items.values()).filter(i => i.destinationId === destinationId);
  }

  getHeritageByCategory(destinationId, category) {
    return Array.from(this.items.values()).filter(i => i.destinationId === destinationId && i.category === category);
  }

  getHeritageByType(destinationId, subcategory) {
    return Array.from(this.items.values()).filter(i => i.destinationId === destinationId && i.subcategory === subcategory);
  }

  getValidatedHeritage(destinationId) {
    return Array.from(this.items.values()).filter(i => i.destinationId === destinationId && i.validationStatus === VALIDATION_STATUS.CULTURALLY_VALIDATED);
  }

  getHeritageByLocation(destinationId, locationId) {
    return Array.from(this.items.values()).filter(i => i.destinationId === destinationId && i.location?.id === locationId);
  }

  getHeritageStats(destinationId) {
    const items = this.getHeritageByDestination(destinationId);
    return {
      total: items.length,
      tangible: items.filter(i => i.category === HERITAGE_CATEGORY.TANGIBLE).length,
      intangible: items.filter(i => i.category === HERITAGE_CATEGORY.INTANGIBLE).length,
      validated: items.filter(i => i.validationStatus === VALIDATION_STATUS.CULTURALLY_VALIDATED).length,
      bySubcategory: {
        buildings: items.filter(i => i.subcategory === TANGIBLE_TYPE.BUILDING).length,
        monuments: items.filter(i => i.subcategory === TANGIBLE_TYPE.MONUMENT).length,
        traditions: items.filter(i => i.subcategory === INTANGIBLE_TYPE.TRADITION).length,
        food: items.filter(i => i.subcategory === INTANGIBLE_TYPE.FOOD).length,
        crafts: items.filter(i => i.subcategory === INTANGIBLE_TYPE.CRAFT).length,
        knowledge: items.filter(i => i.subcategory === INTANGIBLE_TYPE.KNOWLEDGE).length
      }
    };
  }
}
