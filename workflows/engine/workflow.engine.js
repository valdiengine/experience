/**
 * Workflow Engine — Engine
 *
 * Core execution engine: runs workflows, manages state, handles delays
 * Business-agnostic: engine is a generic state machine
 */
import { WORKFLOW_STATUS, EXECUTION_STATUS, NODE_TYPES } from './workflow.schema.js'
import { WORKFLOW_EVENTS } from './workflow.events.js'
import { WorkflowParser } from './workflow.parser.js'
import { WorkflowContext } from './workflow.context.js'

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class WorkflowEngine {
  #workflows = new Map()
  #executions = new Map()
  #eventBus = null
  #services = null
  #timers = new Map()

  constructor(eventBus, services = null) {
    this.#eventBus = eventBus
    this.#services = services
  }

  /**
   * Register a workflow definition
   * @param {object} definition - Workflow definition
   * @returns {{ success: boolean, workflow?: object, error?: string }}
   */
  register(definition) {
    const result = WorkflowParser.parse(definition)
    if (!result.valid) {
      return { success: false, error: result.errors.join(', ') }
    }

    this.#workflows.set(result.workflow.id, result.workflow)
    this.#eventBus?.emit(WORKFLOW_EVENTS.CREATED, { workflow: result.workflow })
    return { success: true, workflow: result.workflow }
  }

  /**
   * Get a workflow definition
   * @param {string} workflowId
   * @returns {object|null}
   */
  get(workflowId) {
    return this.#workflows.get(workflowId) || null
  }

  /**
   * List workflows for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  list(tenantId) {
    return [...this.#workflows.values()].filter(w => w.tenantId === tenantId)
  }

  /**
   * Activate a workflow
   * @param {string} workflowId
   * @returns {{ success: boolean, error?: string }}
   */
  activate(workflowId) {
    const workflow = this.#workflows.get(workflowId)
    if (!workflow) return { success: false, error: 'Workflow not found' }

    workflow.status = WORKFLOW_STATUS.ACTIVE
    this.#eventBus?.emit(WORKFLOW_EVENTS.ACTIVATED, { workflowId })
    return { success: true }
  }

  /**
   * Pause a workflow
   * @param {string} workflowId
   * @returns {{ success: boolean, error?: string }}
   */
  pause(workflowId) {
    const workflow = this.#workflows.get(workflowId)
    if (!workflow) return { success: false, error: 'Workflow not found' }

    workflow.status = WORKFLOW_STATUS.PAUSED
    this.#eventBus?.emit(WORKFLOW_EVENTS.PAUSED, { workflowId })
    return { success: true }
  }

  /**
   * Delete a workflow
   * @param {string} workflowId
   * @returns {{ success: boolean, error?: string }}
   */
  delete(workflowId) {
    if (!this.#workflows.has(workflowId)) {
      return { success: false, error: 'Workflow not found' }
    }

    this.#workflows.delete(workflowId)
    this.#eventBus?.emit(WORKFLOW_EVENTS.DELETED, { workflowId })
    return { success: true }
  }

  /**
   * Start a workflow execution
   * @param {string} workflowId
   * @param {object} [input] - Initial trigger data
   * @returns {{ success: boolean, executionId?: string, error?: string }}
   */
  async start(workflowId, input = {}) {
    const workflow = this.#workflows.get(workflowId)
    if (!workflow) return { success: false, error: 'Workflow not found' }

    if (workflow.status !== WORKFLOW_STATUS.ACTIVE) {
      return { success: false, error: `Workflow is ${workflow.status}, must be active` }
    }

    const executionId = generateId()
    const execution = {
      id: executionId,
      workflowId,
      tenantId: workflow.tenantId,
      status: EXECUTION_STATUS.RUNNING,
      currentNodeId: null,
      variables: { ...workflow.variables, ...input },
      history: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    }

    this.#executions.set(executionId, execution)
    this.#eventBus?.emit(WORKFLOW_EVENTS.EXECUTION_STARTED, { executionId, workflowId })

    // Find trigger node(s) and start execution
    const triggerNodes = workflow.nodes.filter(n => n.type === NODE_TYPES.TRIGGER)
    if (triggerNodes.length === 0) {
      execution.status = EXECUTION_STATUS.FAILED
      execution.error = 'No trigger node found'
      return { success: false, error: 'No trigger node found' }
    }

    // Execute trigger node
    const triggerNode = triggerNodes[0]
    const context = new WorkflowContext({
      executionId,
      workflowId,
      tenantId: workflow.tenantId,
      variables: execution.variables,
      services: this.#services,
    })

    const triggerResult = await this.#executeNode(triggerNode, context, workflow, execution, input)
    if (!triggerResult.success) {
      execution.status = EXECUTION_STATUS.FAILED
      execution.error = triggerResult.error
      return { success: false, error: triggerResult.error }
    }

    // Continue execution from trigger's next nodes
    const nextNodes = WorkflowParser.getNextNodes(triggerNode.id, triggerResult.output?.branch, workflow.edges)
    await this.#processNextNodes(nextNodes, context, workflow, execution)

    return { success: true, executionId }
  }

  /**
   * Get execution state
   * @param {string} executionId
   * @returns {object|null}
   */
  getExecution(executionId) {
    return this.#executions.get(executionId) || null
  }

  /**
   * List executions for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  listExecutions(tenantId) {
    return [...this.#executions.values()].filter(e => e.tenantId === tenantId)
  }

  /**
   * Cancel an execution
   * @param {string} executionId
   * @returns {{ success: boolean, error?: string }}
   */
  cancel(executionId) {
    const execution = this.#executions.get(executionId)
    if (!execution) return { success: false, error: 'Execution not found' }

    // Cancel any pending timers
    const timer = this.#timers.get(executionId)
    if (timer) {
      clearTimeout(timer)
      this.#timers.delete(executionId)
    }

    execution.status = EXECUTION_STATUS.CANCELLED
    execution.completedAt = new Date().toISOString()
    this.#eventBus?.emit(WORKFLOW_EVENTS.EXECUTION_CANCELLED, { executionId })
    return { success: true }
  }

  async #executeNode(node, context, workflow, execution, input = {}) {
    const executor = WorkflowParser.getNodeExecutor(node.type)
    if (!executor) {
      return { success: false, error: `No executor for node type: ${node.type}` }
    }

    execution.currentNodeId = node.id
    execution.history.push({
      nodeId: node.id,
      type: node.type,
      name: node.name,
      startedAt: new Date().toISOString(),
    })

    this.#eventBus?.emit(WORKFLOW_EVENTS.NODE_STARTED, {
      executionId: execution.id,
      nodeId: node.id,
      nodeType: node.type,
    })

    try {
      const result = await executor.execute(node, context, input)

      // Store result in context
      context.setNodeResult(node.id, result.output)

      // Update history
      const historyEntry = execution.history[execution.history.length - 1]
      historyEntry.completedAt = new Date().toISOString()
      historyEntry.success = result.success
      historyEntry.output = result.output

      this.#eventBus?.emit(WORKFLOW_EVENTS.NODE_COMPLETED, {
        executionId: execution.id,
        nodeId: node.id,
        result,
      })

      // Handle delay
      if (result.delayMs && result.delayMs > 0) {
        execution.status = EXECUTION_STATUS.WAITING
        this.#eventBus?.emit(WORKFLOW_EVENTS.DELAY_SCHEDULED, {
          executionId: execution.id,
          nodeId: node.id,
          delayMs: result.delayMs,
        })

        await new Promise(resolve => {
          this.#timers.set(execution.id, setTimeout(() => {
            this.#timers.delete(execution.id)
            execution.status = EXECUTION_STATUS.RUNNING
            this.#eventBus?.emit(WORKFLOW_EVENTS.DELAY_COMPLETED, { executionId: execution.id })
            resolve()
          }, result.delayMs))
        })
      }

      return result
    } catch (error) {
      const historyEntry = execution.history[execution.history.length - 1]
      historyEntry.completedAt = new Date().toISOString()
      historyEntry.success = false
      historyEntry.error = error.message

      this.#eventBus?.emit(WORKFLOW_EVENTS.NODE_FAILED, {
        executionId: execution.id,
        nodeId: node.id,
        error: error.message,
      })

      return { success: false, error: error.message }
    }
  }

  async #processNextNodes(nodeIds, context, workflow, execution) {
    for (const nodeId of nodeIds) {
      if (!nodeId) continue

      const node = workflow.nodes.find(n => n.id === nodeId)
      if (!node) {
        execution.status = EXECUTION_STATUS.FAILED
        execution.error = `Node not found: ${nodeId}`
        return
      }

      // End node — complete execution
      if (node.type === NODE_TYPES.END) {
        execution.status = EXECUTION_STATUS.COMPLETED
        execution.completedAt = new Date().toISOString()
        this.#eventBus?.emit(WORKFLOW_EVENTS.EXECUTION_COMPLETED, {
          executionId: execution.id,
          workflowId: workflow.id,
        })
        return
      }

      const result = await this.#executeNode(node, context, workflow, execution)
      if (!result.success) {
        execution.status = EXECUTION_STATUS.FAILED
        execution.error = result.error
        this.#eventBus?.emit(WORKFLOW_EVENTS.EXECUTION_FAILED, {
          executionId: execution.id,
          error: result.error,
        })
        return
      }

      // Get next nodes
      const nextNodes = WorkflowParser.getNextNodes(nodeId, result.output?.branch, workflow.edges)
      if (nextNodes.length === 0) {
        // No more nodes — complete
        execution.status = EXECUTION_STATUS.COMPLETED
        execution.completedAt = new Date().toISOString()
        this.#eventBus?.emit(WORKFLOW_EVENTS.EXECUTION_COMPLETED, {
          executionId: execution.id,
          workflowId: workflow.id,
        })
        return
      }

      // Process next nodes (sequential for now; parallel support in future)
      await this.#processNextNodes(nextNodes, context, workflow, execution)
    }
  }

  /**
   * Clear all data
   */
  clear() {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer)
    }
    this.#timers.clear()
    this.#workflows.clear()
    this.#executions.clear()
  }
}
