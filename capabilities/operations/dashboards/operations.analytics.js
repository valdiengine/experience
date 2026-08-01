import { OPERATIONS_EVENTS, createOperationsEvent } from '../operations.events.js';

export default class OperationsAnalytics {
  constructor(context) {
    this.context = context;
    this.metrics = new Map();
    this.counters = new Map();
  }

  async recordMetric(category, name, value, tags = {}) {
    const key = category + ':' + name;
    const history = this.metrics.get(key) || [];
    history.push({ value, tags, recordedAt: new Date() });
    if (history.length > 5000) history.splice(0, history.length - 5000);
    this.metrics.set(key, history);
  }

  async incrementCounter(category, name, amount = 1) {
    const key = category + ':' + name;
    this.counters.set(key, (this.counters.get(key) || 0) + amount);
  }

  async getDestinationManagerDashboard(destinationId) {
    return {
      destinationId,
      visitors: this._getCounter('dest:' + destinationId + ':visitors'),
      economy: {
        reservations: this._getCounter('dest:' + destinationId + ':reservations'),
        revenue: this._getAverageMetric('dest:' + destinationId + ':revenue')
      },
      ecology: {
        observations: this._getCounter('dest:' + destinationId + ':observations'),
        conservationActions: this._getCounter('dest:' + destinationId + ':conservation')
      },
      community: {
        memories: this._getCounter('dest:' + destinationId + ':memories'),
        activeMembers: this._getCounter('dest:' + destinationId + ':active_members')
      },
      governance: {
        pendingApprovals: this._getCounter('dest:' + destinationId + ':pending_approvals'),
        completedWorkflows: this._getCounter('dest:' + destinationId + ':completed_workflows')
      }
    };
  }

  async getMunicipalityDashboard(destinationId) {
    return {
      destinationId,
      tourismIndicators: {
        totalVisitors: this._getCounter('dest:' + destinationId + ':total_visitors'),
        averageStay: this._getAverageMetric('dest:' + destinationId + ':avg_stay'),
        returnRate: this._getAverageMetric('dest:' + destinationId + ':return_rate')
      },
      development: {
        newBusinesses: this._getCounter('dest:' + destinationId + ':new_businesses'),
        jobsCreated: this._getCounter('dest:' + destinationId + ':jobs')
      },
      impact: {
        economicImpact: this._getCounter('dest:' + destinationId + ':economic_impact'),
        environmentalImpact: this._getAverageMetric('dest:' + destinationId + ':env_impact')
      }
    };
  }

  async getScientificDashboard(destinationId) {
    return {
      destinationId,
      biodiversity: {
        totalSpecies: this._getCounter('dest:' + destinationId + ':total_species'),
        observations: this._getCounter('dest:' + destinationId + ':observations'),
        validated: this._getCounter('dest:' + destinationId + ':validated_observations')
      },
      conservation: {
        activePrograms: this._getCounter('dest:' + destinationId + ':conservation_programs'),
        progress: this._getAverageMetric('dest:' + destinationId + ':conservation_progress')
      },
      research: {
        publications: this._getCounter('dest:' + destinationId + ':publications'),
        partnerships: this._getCounter('dest:' + destinationId + ':research_partnerships')
      }
    };
  }

  async getBusinessDashboard(destinationId) {
    return {
      destinationId,
      visibility: {
        profileViews: this._getCounter('dest:' + destinationId + ':profile_views'),
        searchAppearances: this._getCounter('dest:' + destinationId + ':search_appearances')
      },
      experiences: {
        total: this._getCounter('dest:' + destinationId + ':experiences'),
        booked: this._getCounter('dest:' + destinationId + ':experience_bookings')
      },
      engagement: {
        reviews: this._getCounter('dest:' + destinationId + ':reviews'),
        averageRating: this._getAverageMetric('dest:' + destinationId + ':avg_rating')
      }
    };
  }

  getMetricHistory(category, name) {
    return this.metrics.get(category + ':' + name) || [];
  }

  _getCounter(key) {
    return this.counters.get(key) || 0;
  }

  _getAverageMetric(key) {
    const history = this.metrics.get(key) || [];
    if (history.length === 0) return 0;
    return history.reduce((acc, m) => acc + m.value, 0) / history.length;
  }
}
