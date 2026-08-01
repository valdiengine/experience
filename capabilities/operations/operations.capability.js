import { BaseCapability } from '../core/base.capability.js';
import OperationsManager from './operations.manager.js';
import DestinationHealthManager from './health/destination-health.manager.js';
import CampaignManager from './campaigns/campaign.manager.js';
import SeasonalManager from './seasons/seasonal.manager.js';
import OperationsAnalytics from './dashboards/operations.analytics.js';

export class OperationsCapability extends BaseCapability {
  static id = 'destination-operations';
  static name = 'Destination Operations';
  static version = '1.0.0';
  static dependencies = [];

  constructor() {
    super();
    this.operations = null;
    this.health = null;
    this.campaigns = null;
    this.seasons = null;
    this.analytics = null;
    this._listeners = null;
  }

  async init(context) {
    await super.init(context);
    this.operations = new OperationsManager(context);
    this.health = new DestinationHealthManager(context);
    this.campaigns = new CampaignManager(context);
    this.seasons = new SeasonalManager(context);
    this.analytics = new OperationsAnalytics(context);
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

  get operationsManager() { return this.operations; }
  get healthManager() { return this.health; }
  get campaignManager() { return this.campaigns; }
  get seasonalManager() { return this.seasons; }
  get analyticsManager() { return this.analytics; }

  _setupEventListeners() {
    const bus = this.context.eventBus;
    if (!bus) return;
    this._listeners = {
      onDestinationCreated: (data) => this._handleDestinationCreated(data),
      onVisitorDiscovered: (data) => this._handleVisitorActivity(data),
      onMemoryCreated: (data) => this._handleCommunityActivity(data),
      onSpeciesObserved: (data) => this._handleEcologyActivity(data),
      onPartnerRegistered: (data) => this._handleEconomyActivity(data),
      onBookingCompleted: (data) => this._handleBookingActivity(data)
    };
    bus.on('destination.created', this._listeners.onDestinationCreated);
    bus.on('exploration.place.discovered', this._listeners.onVisitorDiscovered);
    bus.on('community.memory.created', this._listeners.onMemoryCreated);
    bus.on('ecology.observation.created', this._listeners.onSpeciesObserved);
    bus.on('economy.partner.registered', this._listeners.onPartnerRegistered);
    bus.on('reservation.confirmed', this._listeners.onBookingCompleted);
  }

  _removeEventListeners() {
    const bus = this.context.eventBus;
    if (!bus || !this._listeners) return;
    bus.off('destination.created', this._listeners.onDestinationCreated);
    bus.off('exploration.place.discovered', this._listeners.onVisitorDiscovered);
    bus.off('community.memory.created', this._listeners.onMemoryCreated);
    bus.off('ecology.observation.created', this._listeners.onSpeciesObserved);
    bus.off('economy.partner.registered', this._listeners.onPartnerRegistered);
    bus.off('reservation.confirmed', this._listeners.onBookingCompleted);
  }

  async _handleDestinationCreated(data) {
    if (data.destinationId) {
      await this.operations.activateDestination(data.destinationId);
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':created');
    }
  }

  async _handleVisitorActivity(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':visitors');
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':total_visitors');
    }
  }

  async _handleCommunityActivity(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':memories');
    }
  }

  async _handleEcologyActivity(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':observations');
    }
  }

  async _handleEconomyActivity(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':new_businesses');
    }
  }

  async _handleBookingActivity(data) {
    if (data.destinationId) {
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':reservations');
      await this.analytics.incrementCounter('dest:' + data.destinationId + ':experience_bookings');
    }
  }
}
