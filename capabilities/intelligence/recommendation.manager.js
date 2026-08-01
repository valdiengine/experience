/**
 * Recommendation Manager — Generates actionable recommendations
 *
 * Business-agnostic: works with any resource type
 * Consumes data through DataManager only
 */
import { RECOMMENDATION_PRIORITY } from './intelligence.schema.js'

export class RecommendationManager {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Generate recommendations for a resource
   * @param {string} resourceId - Resource ID
   * @param {object} metrics - Availability metrics
   * @param {object[]} demandSignals - Demand signals
   * @param {object[]} opportunities - Identified opportunities
   * @returns {object[]} - Recommendations
   */
  generate(resourceId, metrics, demandSignals = [], opportunities = []) {
    const recommendations = []

    if (metrics.occupancyRate < 30) {
      recommendations.push(this.#createRecommendation(
        resourceId,
        RECOMMENDATION_PRIORITY.HIGH,
        'occupancy',
        'Baja ocupación detectada',
        `La ocupación es del ${metrics.occupancyRate.toFixed(1)}%. Considere promociones o ajustar precios.`
      ))
    }

    if (metrics.emptyPeriods.length > 0) {
      const longPeriods = metrics.emptyPeriods.filter(p => p.days >= 7)
      if (longPeriods.length > 0) {
        recommendations.push(this.#createRecommendation(
          resourceId,
          RECOMMENDATION_PRIORITY.MEDIUM,
          'availability',
          'Períodos largos disponibles',
          `${longPeriods.length} períodos de 7+ días consecutivos disponibles. Considere ofertas especiales.`
        ))
      }
    }

    const highDemandDates = demandSignals.filter(s =>
      s.level === 'high' || s.level === 'very_high'
    )

    if (highDemandDates.length > 0) {
      recommendations.push(this.#createRecommendation(
        resourceId,
        RECOMMENDATION_PRIORITY.HIGH,
        'demand',
        'Alta demanda detectada',
        `${highDemandDates.length} fechas con alta demanda. Considere aumentar precios o priorizar reservas.`
      ))
    }

    if (metrics.responseTime > 24 * 60 * 60 * 1000) {
      recommendations.push(this.#createRecommendation(
        resourceId,
        RECOMMENDATION_PRIORITY.MEDIUM,
        'response',
        'Tiempo de respuesta lento',
        `Tiempo promedio de respuesta: ${(metrics.responseTime / (1000 * 60 * 60)).toFixed(1)} horas. Responda más rápido para capturar más reservas.`
      ))
    }

    if (opportunities.length > 0) {
      const highImpact = opportunities.filter(o => o.potentialImpact > 50)
      if (highImpact.length > 0) {
        recommendations.push(this.#createRecommendation(
          resourceId,
          RECOMMENDATION_PRIORITY.HIGH,
          'opportunity',
          'Oportunidades de alto impacto',
          `${highImpact.length} oportunidades identificadas con potencial significativo.`
        ))
      }
    }

    if (metrics.occupancyRate >= 80) {
      recommendations.push(this.#createRecommendation(
        resourceId,
        RECOMMENDATION_PRIORITY.LOW,
        'performance',
        'Alta ocupación',
        `La ocupación es del ${metrics.occupancyRate.toFixed(1)}%. Considere agregar más recursos o aumentar precios.`
      ))
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  /**
   * Generate recommendations for all resources
   * @param {object} analyticsData - Analytics data per resource
   * @returns {object[]} - All recommendations
   */
  generateAll(analyticsData) {
    const allRecommendations = []

    for (const [resourceId, data] of Object.entries(analyticsData)) {
      const recommendations = this.generate(
        resourceId,
        data.metrics,
        data.demandSignals,
        data.opportunities
      )
      allRecommendations.push(...recommendations)
    }

    return allRecommendations
  }

  /**
   * Create a recommendation object
   * @private
   */
  #createRecommendation(resourceId, priority, category, title, description) {
    return {
      id: `rec_${resourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      resourceId,
      tenantId: this.#context?.tenant?.id,
      priority,
      category,
      title,
      description,
      action: this.#getAction(category),
      metadata: {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  /**
   * Get suggested action based on category
   * @private
   */
  #getAction(category) {
    const actions = {
      occupancy: 'Revisar precios y promociones',
      availability: 'Contactar para confirmar disponibilidad',
      demand: 'Ajustar precios para maximizar ingresos',
      response: 'Configurar respuestas automáticas',
      opportunity: 'Actuar sobre la oportunidad identificada',
      performance: 'Evaluar expansión de recursos',
    }
    return actions[category] || 'Revisar recomendación'
  }
}
