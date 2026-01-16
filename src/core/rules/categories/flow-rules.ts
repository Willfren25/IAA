/**
 * Flow Rules - Reglas de flujo (ciclos, trigger único, etc.)
 */

import { BaseRule } from '../base/base-rule.js';
import {
  RuleCategory,
  type RuleContext,
  type RuleExecutionResult,
} from '../../domain/types/rules.types.js';
import type { N8nWorkflow } from '../../domain/types/workflow.types.js';

/**
 * Detecta ciclos en el workflow usando DFS
 */
function detectCycles(workflow: Partial<N8nWorkflow>): {
  hasCycles: boolean;
  cycleNodes: string[];
} {
  if (!workflow.nodes || workflow.nodes.length === 0) {
    return { hasCycles: false, cycleNodes: [] };
  }

  const nodes = new Set(workflow.nodes.map((n) => n.name));
  const edges = new Map<string, string[]>();

  // Build adjacency list
  for (const node of workflow.nodes) {
    edges.set(node.name, []);
  }

  if (workflow.connections) {
    for (const [sourceName, connections] of Object.entries(workflow.connections)) {
      for (const outputs of Object.values(connections)) {
        for (const outputConnections of outputs) {
          for (const conn of outputConnections) {
            const sourceEdges = edges.get(sourceName);
            if (sourceEdges) {
              sourceEdges.push(conn.node);
            }
          }
        }
      }
    }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = edges.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          cycleNodes.push(node);
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        cycleNodes.push(node, neighbor);
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycles: true, cycleNodes: [...new Set(cycleNodes)] };
      }
    }
  }

  return { hasCycles: false, cycleNodes: [] };
}

/**
 * Regla: Trigger único en el workflow
 */
export class SingleTriggerRule extends BaseRule {
  constructor() {
    super({
      id: 'flow-single-trigger',
      name: 'Single Trigger',
      description: 'Validates that workflow has exactly one trigger node',
      category: RuleCategory.FLOW,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const triggerTypes = ['webhook', 'scheduleTrigger', 'manualTrigger'];

    const triggers = (workflow?.nodes ?? []).filter((node) =>
      triggerTypes.some((t) => node.type.toLowerCase().includes(t.toLowerCase()))
    );

    if (triggers.length === 0) {
      return this.createFailureResult('No trigger node found', { triggerCount: 0 }, [
        'Add a trigger node (Webhook, Schedule Trigger, or Manual Trigger)',
      ]);
    }

    if (triggers.length > 1) {
      return this.createFailureResult(
        `Found ${triggers.length} trigger nodes, only one is allowed`,
        {
          triggerCount: triggers.length,
          triggerNodes: triggers.map((t) => ({ name: t.name, type: t.type })),
        },
        ['Remove extra trigger nodes, keep only one']
      );
    }

    return this.createSuccessResult(`Single trigger found: ${triggers[0]?.name ?? 'unknown'}`);
  }
}

/**
 * Regla: Sin ciclos en el flujo
 */
export class NoCyclesRule extends BaseRule {
  constructor() {
    super({
      id: 'flow-no-cycles',
      name: 'No Cycles',
      description: 'Validates that workflow has no circular dependencies',
      category: RuleCategory.FLOW,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    if (!workflow) {
      return this.createFailureResult('Workflow is required');
    }

    const { hasCycles, cycleNodes } = detectCycles(workflow);

    if (hasCycles) {
      return this.createFailureResult(
        'Workflow contains cycles (circular dependencies)',
        { cycleNodes },
        cycleNodes.map((n) => `Node '${n}' is part of a cycle`)
      );
    }

    return this.createSuccessResult('No cycles detected in workflow');
  }
}

/**
 * Regla: Sin nodos terminales sin salida (dead ends) - excepto nodos finales válidos
 */
export class NoDeadEndsRule extends BaseRule {
  constructor() {
    super({
      id: 'flow-no-dead-ends',
      name: 'No Dead Ends',
      description:
        'Validates that all nodes either have outgoing connections or are valid terminal nodes',
      category: RuleCategory.FLOW,
      severity: 'info',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    if (!workflow) {
      return this.createFailureResult('Workflow is required');
    }

    // Build set of nodes with outgoing connections
    const nodesWithOutgoing = new Set<string>();
    const connections = workflow.connections ?? {};
    for (const [sourceName, nodeConnections] of Object.entries(connections)) {
      for (const outputs of Object.values(nodeConnections)) {
        if (outputs.some((outputConns) => outputConns.length > 0)) {
          nodesWithOutgoing.add(sourceName);
        }
      }
    }

    // Find dead ends (nodes without outgoing connections that aren't typical end nodes)
    const deadEnds: string[] = [];
    const typicalEndNodes = ['httpRequest', 'set', 'noOp', 'function', 'code'];
    const nodes = workflow.nodes ?? [];

    for (const node of nodes) {
      if (!nodesWithOutgoing.has(node.name)) {
        // Check if it's a typical end node
        const isTypicalEnd = typicalEndNodes.some((t) =>
          node.type.toLowerCase().includes(t.toLowerCase())
        );
        if (!isTypicalEnd) {
          deadEnds.push(node.name);
        }
      }
    }

    if (deadEnds.length > 0) {
      return this.createFailureResult(
        `Found ${deadEnds.length} potential dead-end nodes`,
        { deadEnds },
        deadEnds.map((d) => `Node '${d}' has no outgoing connections`)
      );
    }

    return this.createSuccessResult('No unexpected dead ends found');
  }
}

/**
 * Regla: Workflow tiene nombre válido
 */
export class ValidWorkflowNameRule extends BaseRule {
  constructor() {
    super({
      id: 'flow-valid-name',
      name: 'Valid Workflow Name',
      description: 'Validates that workflow has a valid name',
      category: RuleCategory.FLOW,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;

    if (!workflow?.name || workflow.name.trim() === '') {
      return this.createFailureResult(
        'Workflow name is missing or empty',
        { name: workflow?.name },
        ['Provide a descriptive name for the workflow']
      );
    }

    if (workflow.name.length > 128) {
      return this.createFailureResult(
        'Workflow name exceeds maximum length (128 characters)',
        { nameLength: workflow.name.length },
        ['Shorten the workflow name to 128 characters or less']
      );
    }

    return this.createSuccessResult(`Workflow name is valid: "${workflow.name}"`);
  }
}

/**
 * Regla: Límite de nodos no excedido
 */
export class NodeLimitRule extends BaseRule {
  private readonly maxNodes: number;

  constructor(maxNodes: number = 100) {
    super({
      id: 'flow-node-limit',
      name: 'Node Limit',
      description: `Validates that workflow does not exceed ${maxNodes} nodes`,
      category: RuleCategory.FLOW,
      severity: 'warning',
    });
    this.maxNodes = maxNodes;
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const nodeCount = workflow?.nodes?.length ?? 0;

    if (nodeCount > this.maxNodes) {
      return this.createFailureResult(
        `Workflow exceeds node limit: ${nodeCount}/${this.maxNodes}`,
        { nodeCount, maxNodes: this.maxNodes },
        ['Consider splitting into multiple workflows']
      );
    }

    return this.createSuccessResult(`Node count within limit: ${nodeCount}/${this.maxNodes}`);
  }
}

/**
 * Factory para crear todas las reglas de flujo
 */
export function createFlowRules(): BaseRule[] {
  return [
    new SingleTriggerRule(),
    new NoCyclesRule(),
    new NoDeadEndsRule(),
    new ValidWorkflowNameRule(),
    new NodeLimitRule(),
  ];
}
