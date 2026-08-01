import * as schemas from '../intelligence.schema.js';
import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from '../intelligence.events.js';

export default class PredictionManager {
  constructor(context) {
    this.context = context;
    this.predictions = new Map();
    this.historicalData = new Map();
  }

  async recordHistoricalData(destinationId, type, period, data) {
    const key = destinationId + ':' + type;
    const history = this.historicalData.get(key) || [];
    history.push({ period, data, recordedAt: new Date() });
    if (history.length > 365) history.splice(0, history.length - 365);
    this.historicalData.set(key, history);
  }

  async predictTourismDemand(destinationId, horizon) {
    const key = destinationId + ':tourism_flow';
    const history = this.historicalData.get(key) || [];
    const forecast = this._calculateForecast(history, horizon);
    const prediction = {
      id: 'pred-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type: schemas.INSIGHT_TYPE.TOURISM_FLOW, horizon, forecast,
      confidence: forecast.confidence, basedOn: ['historical_tourism_data'],
      generatedAt: new Date(), validUntil: this._calculateValidity(horizon)
    };
    this.predictions.set(prediction.id, prediction);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.DEMAND_PREDICTED, { destinationId, predictionId: prediction.id, type: 'tourism_demand' }));
    return prediction;
  }

  async predictSpeciesActivity(destinationId, horizon) {
    const key = destinationId + ':ecological_health';
    const history = this.historicalData.get(key) || [];
    const forecast = this._calculateForecast(history, horizon);
    const prediction = {
      id: 'pred-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type: schemas.INSIGHT_TYPE.ECOLOGICAL_HEALTH, horizon, forecast,
      confidence: forecast.confidence, basedOn: ['historical_ecological_data'],
      generatedAt: new Date(), validUntil: this._calculateValidity(horizon)
    };
    this.predictions.set(prediction.id, prediction);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.ECOLOGY_PATTERN_DETECTED, { destinationId, predictionId: prediction.id }));
    return prediction;
  }

  async predictBookingDemand(destinationId, horizon) {
    const key = destinationId + ':economic_health';
    const history = this.historicalData.get(key) || [];
    const forecast = this._calculateForecast(history, horizon);
    const prediction = {
      id: 'pred-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type: schemas.INSIGHT_TYPE.ECONOMIC_HEALTH, horizon, forecast,
      confidence: forecast.confidence, basedOn: ['historical_booking_data'],
      generatedAt: new Date(), validUntil: this._calculateValidity(horizon)
    };
    this.predictions.set(prediction.id, prediction);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.DEMAND_PREDICTED, { destinationId, predictionId: prediction.id, type: 'booking_demand' }));
    return prediction;
  }

  async detectSeasonalPatterns(destinationId) {
    const key = destinationId + ':tourism_flow';
    const history = this.historicalData.get(key) || [];
    if (history.length < 12) return null;
    const monthly = {};
    for (const entry of history) {
      const month = new Date(entry.recordedAt).getMonth();
      if (!monthly[month]) monthly[month] = [];
      monthly[month].push(entry.data);
    }
    const patterns = {};
    for (const [month, values] of Object.entries(monthly)) {
      patterns[month] = this._averageMetrics(values);
    }
    return {
      id: 'insight-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type: schemas.INSIGHT_TYPE.SEASONAL_PATTERN,
      period: 'annual', metrics: patterns, trends: [],
      recommendations: [], generatedAt: new Date(), confidence: 0.7
    };
  }

  getPrediction(predictionId) {
    return this.predictions.get(predictionId) || null;
  }

  getPredictionsByDestination(destinationId) {
    return Array.from(this.predictions.values()).filter(p => p.destinationId === destinationId);
  }

  _calculateForecast(history, horizon) {
    if (history.length === 0) return { predicted: 0, confidence: 0.1, trend: 'unknown' };
    const recent = history.slice(-30);
    const values = recent.map(h => this._extractNumericValue(h.data));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = values.length >= 2 ? (values[values.length - 1] - values[0]) / values.length : 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0.3, Math.min(0.95, 1 - (stdDev / (avg || 1))));
    return { predicted: avg + trend, confidence, trend: trend > 0 ? 'growing' : trend < 0 ? 'declining' : 'stable' };
  }

  _extractNumericValue(data) {
    if (typeof data === 'number') return data;
    if (typeof data === 'object' && data !== null) {
      const values = Object.values(data).filter(v => typeof v === 'number');
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    return 0;
  }

  _averageMetrics(dataArray) {
    if (dataArray.length === 0) return {};
    const result = {};
    for (const data of dataArray) {
      if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'number') {
            if (!result[key]) result[key] = { sum: 0, count: 0 };
            result[key].sum += value;
            result[key].count++;
          }
        }
      }
    }
    const averaged = {};
    for (const [key, val] of Object.entries(result)) {
      averaged[key] = val.sum / val.count;
    }
    return averaged;
  }

  _calculateValidity(horizon) {
    const now = new Date();
    switch (horizon) {
      case 'today': now.setDate(now.getDate() + 1); break;
      case 'this_week': now.setDate(now.getDate() + 7); break;
      case 'this_month': now.setMonth(now.getMonth() + 1); break;
      case 'this_season': now.setMonth(now.getMonth() + 3); break;
      case 'this_year': now.setFullYear(now.getFullYear() + 1); break;
    }
    return now;
  }
}
