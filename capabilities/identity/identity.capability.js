import { BaseCapability } from '../core/base.capability.js';
import IdentityManager from './identity.manager.js';
import StoryManager from './stories/story.manager.js';
import HeritageManager from './heritage/heritage.manager.js';
import CulturalMemoryManager from './culture/cultural-memory.manager.js';
import LocalHeroManager from './heroes/local-hero.manager.js';
import IdentityAnalytics from './dashboards/identity.analytics.js';

export class IdentityCapability extends BaseCapability {
  static id = 'destination-identity';
  static name = 'Destination Identity';
  static version = '1.0.0';
  static dependencies = [];

  constructor() {
    super();
    this.identity = null;
    this.stories = null;
    this.heritage = null;
    this.culturalMemory = null;
    this.heroes = null;
    this.analytics = null;
    this._listeners = null;
  }

  async init(context) {
    await super.init(context);
    this.identity = new IdentityManager(context);
    this.stories = new StoryManager(context);
    this.heritage = new HeritageManager(context);
    this.culturalMemory = new CulturalMemoryManager(context);
    this.heroes = new LocalHeroManager(context);
    this.analytics = new IdentityAnalytics(context);
    return this;
  }

  async activate() {
    await super.activate();
    this._setupEventListeners();
    return this;
  }

  async deactivate() {
    this._removeEventListeners();
    await super.deactivate();
    return this;
  }

  async destroy() {
    this._removeEventListeners();
    await super.destroy();
    return this;
  }

  get identityManager() { return this.identity; }
  get storyManager() { return this.stories; }
  get heritageManager() { return this.heritage; }
  get culturalMemoryManager() { return this.culturalMemory; }
  get localHeroManager() { return this.heroes; }
  get analyticsManager() { return this.analytics; }

  _setupEventListeners() {
    const bus = this.context.eventBus;
    if (!bus) return;
    this._listeners = {
      onDestinationCreated: (data) => this._handleDestinationCreated(data),
      onMemoryCreated: (data) => this._handleMemoryCreated(data),
      onStoryCreated: (data) => this._handleStoryCreated(data),
      onHeritageAdded: (data) => this._handleHeritageAdded(data),
      onExperienceCompleted: (data) => this._handleExperienceCompleted(data),
      onVisitorDiscovered: (data) => this._handleVisitorDiscovery(data)
    };
    bus.on('destination.created', this._listeners.onDestinationCreated);
    bus.on('community.memory.created', this._listeners.onMemoryCreated);
    bus.on('community.story.created', this._listeners.onStoryCreated);
    bus.on('ecology.heritage.added', this._listeners.onHeritageAdded);
    bus.on('exploration.activity.completed', this._listeners.onExperienceCompleted);
    bus.on('exploration.place.discovered', this._listeners.onVisitorDiscovered);
  }

  _removeEventListeners() {
    const bus = this.context.eventBus;
    if (!bus || !this._listeners) return;
    bus.off('destination.created', this._listeners.onDestinationCreated);
    bus.off('community.memory.created', this._listeners.onMemoryCreated);
    bus.off('community.story.created', this._listeners.onStoryCreated);
    bus.off('ecology.heritage.added', this._listeners.onHeritageAdded);
    bus.off('exploration.activity.completed', this._listeners.onExperienceCompleted);
    bus.off('exploration.place.discovered', this._listeners.onVisitorDiscovered);
  }

  async _handleDestinationCreated(data) {
    if (data.destinationId) {
      await this.identity.createIdentity(data.destinationId, { name: data.name || '' });
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':identity_created');
    }
  }

  async _handleMemoryCreated(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':cultural_memories');
    }
  }

  async _handleStoryCreated(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':stories');
    }
  }

  async _handleHeritageAdded(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':heritage_items');
    }
  }

  async _handleExperienceCompleted(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':cultural_discoveries');
    }
  }

  async _handleVisitorDiscovery(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':heritage_visits');
    }
  }
}
