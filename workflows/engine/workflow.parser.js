/**
 * Workflow Engine — Parser
 *
 * Parses workflow definitions and validates structure
 * Business-agnostic: parser is generic, no business logic
 */
import { NODE_TYPES } from './workflow.schema.js'
import { TriggerNode } from './nodes/trigger.node.js'
import { ConditionNode } from './nodes/condition.node.js'
import { ActionNode } from './nodes/action.node.js'
import { DelayNode } from './nodes/delay.node.js'

const NODE_EXECUTORS = {
  [NODE_TYPES.TRIGGER]: TriggerNode,
  [NODE_TYPES.CONDITION]: ConditionNode,
  [NODE_TYPES.ACTION]: ActionNode,
  [NODE_TYPES.DELAY]: DelayNode,
}

export class WorkflowParser {
  /**
   * Parse and validate a workflow definition
   * @param {object} definition - Raw workflow definition
   * @returns {{ valid: boolean, errors?: string[], workflow?: object }}
   */
  static parse(definition) {
    const errors = []

    if (!definition.id) errors.push('Workflow must have an id')
    if (!definition.name) errors.push('Workflow must have a name')
    if (!definition.nodes || !Array.isArray(definition.nodes)) {
      errors.push('Workflow must have a nodes array')
    }
    if (!definition.edges || !Array.isArray(definition.edges)) {
      errors.push('Workflow must have an edges array')
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // Validate nodes
    for (const node of definition.nodes) {
      if (!node.id) errors.push(`Node missing id`)
      if (!node.type) errors.push(`Node ${node.id} missing type`)
      if (!NODE_EXECUTORS[node.type]) {
        errors.push(`Node ${node.id} has unknown type: ${node.type}`)
      }
      if (!node.name) errors.push(`Node ${node.id} missing name`)
    }

    // Validate edges reference existing nodes
    const nodeIds = new Set(definition.nodes.map(n => n.id))
    for (const edge of definition.edges) {
      if (!edge.source) errors.push('Edge missing source')
      if (!edge.target) errors.push('Edge missing target')
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references unknown source node: ${edge.source}`)
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references unknown target node: ${edge.target}`)
      }
    }

    // Check for trigger node
    const hasTrigger = definition.nodes.some(n => n.type === NODE_TYPES.TRIGGER)
    if (!hasTrigger) {
      errors.push('Workflow must have at least one trigger node')
    }

    // Check for end node
    const hasEnd = definition.nodes.some(n => n.type === NODE_TYPES.END || n.type === NODE_TYPES.TRIGGER)
    if (!hasEnd && definition.nodes.length > 0) {
      // Not an error, but warn — workflow may not terminate
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return {
      valid: true,
      workflow: {
        ...definition,
        version: definition.version || 1,
        status: definition.status || 'draft',
        createdAt: definition.createdAt || new Date().toISOString(),
      },
    }
  }

  /**
   * Get node executor by type
   * @param {string} type
   * @returns {object|null}
   */
  static getNodeExecutor(type) {
    return NODE_EXECUTORS[type] || null
  }

  /**
   * Get available node types with definitions
   * @returns {object[]}
   */
  static getNodeTypes() {
    return Object.values(NODE_EXECUTORS).map(executor => executor.getDefinition())
  }

  /**
   * Find the next node(s) from a given node
   * @param {string} nodeId
   * @param {string} branch - Branch result ('true'/'false') for condition nodes
   * @param {object} edges
   * @returns {string[]} - Target node IDs
   */
  static getNextNodes(nodeId, branch, edges) {
    const matchingEdges = edges.filter(e => e.source === nodeId)

    if (branch) {
      // For condition nodes, find edge matching branch label
      const branchEdge = matchingEdges.find(e => e.label === branch)
      if (branchEdge) return [branchEdge.target]
    }

    return matchingEdges.map(e => e.target)
  }
}
