/**
 * Structural Rules - Reglas de conectividad y estructura
 */

import { BaseRule } from '../base/base-rule.js';
import {
  RuleCategory,
  type RuleContext,
  type RuleExecutionResult,
} from '../../domain/types/rules.types.js';
import type { N8nWorkflow } from '../../domain/types/workflow.types.js';
import type { ConnectionGraph } from '../../domain/types/connection.types.js';

/**
 * Construye un grafo de conexiones a partir del workflow
 */
function buildConnectionGraph(workflow: Partial<N8nWorkflow>): ConnectionGraph {
  const nodes = new Set<string>();
  const edges = new Map<string, string[]>();
  const reverseEdges = new Map<string, string[]>();

  // Agregar todos los nodos
  const workflowNodes = workflow.nodes ?? [];
  for (const node of workflowNodes) {
    nodes.add(node.name);
    edges.set(node.name, []);
    reverseEdges.set(node.name, []);
  }

  // Agregar conexiones
  const workflowConnections = workflow.connections ?? {};
  for (const [sourceName, connections] of Object.entries(workflowConnections)) {
    for (const outputs of Object.values(connections)) {
      for (const outputConnections of outputs) {
        for (const conn of outputConnections) {
          const targetName = conn.node;

          const sourceEdges = edges.get(sourceName);
          if (sourceEdges && !sourceEdges.includes(targetName)) {
            sourceEdges.push(targetName);
          }

          const targetReverseEdges = reverseEdges.get(targetName);
          if (targetReverseEdges && !targetReverseEdges.includes(sourceName)) {
            targetReverseEdges.push(sourceName);
          }
        }
      }
    }
  }

  return { nodes, edges, reverseEdges };
}

/**
 * Regla: Workflow debe tener nodos
 */
export class HasNodesRule extends BaseRule {
  constructor() {
    super({
      id: 'structural-has-nodes',
      name: 'Workflow Has Nodes',
      description: 'Validates that workflow contains at least one node',
      category: RuleCategory.STRUCTURAL,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    if (!workflow?.nodes || workflow.nodes.length === 0) {
      return this.createFailureResult('Workflow has no nodes', { nodeCount: 0 }, [
        'Add at least one node to the workflow',
      ]);
    }

    return this.createSuccessResult(`Workflow has ${workflow.nodes.length} nodes`);
  }
}

/**
 * Regla: Nombres de nodos únicos
 */
export class UniqueNodeNamesRule extends BaseRule {
  constructor() {
    super({
      id: 'structural-unique-names',
      name: 'Unique Node Names',
      description: 'Validates that all node names are unique',
      category: RuleCategory.STRUCTURAL,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const names = new Set<string>();
    const duplicates: string[] = [];

    for (const node of workflow?.nodes ?? []) {
      if (names.has(node.name)) {
        duplicates.push(node.name);
      } else {
        names.add(node.name);
      }
    }

    if (duplicates.length > 0) {
      return this.createFailureResult(
        `Found ${duplicates.length} duplicate node names`,
        { duplicates },
        duplicates.map((d) => `Rename duplicate node: ${d}`)
      );
    }

    return this.createSuccessResult('All node names are unique');
  }
}

/**
 * Regla: Sin nodos huérfanos (excepto triggers)
 */
export class NoOrphanNodesRule extends BaseRule {
  constructor() {
    super({
      id: 'structural-no-orphans',
      name: 'No Orphan Nodes',
      description: 'Validates that all non-trigger nodes have incoming connections',
      category: RuleCategory.STRUCTURAL,
      severity: 'warning',
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

    const graph = buildConnectionGraph(workflow);
    const orphans: string[] = [];

    // Find trigger nodes (have 0 inputs in metadata)
    const triggerTypes = [
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.scheduleTrigger',
      'n8n-nodes-base.manualTrigger',
    ];
    const nodes = workflow.nodes ?? [];

    for (const node of nodes) {
      const isTrigger = triggerTypes.some((t) => node.type.includes(t.split('.')[1] ?? ''));
      const incomingConnections = graph.reverseEdges.get(node.name) ?? [];

      if (!isTrigger && incomingConnections.length === 0) {
        orphans.push(node.name);
      }
    }

    if (orphans.length > 0) {
      return this.createFailureResult(
        `Found ${orphans.length} orphan nodes (no incoming connections)`,
        { orphanNodes: orphans },
        orphans.map((o) => `Connect node '${o}' to the workflow flow`)
      );
    }

    return this.createSuccessResult('No orphan nodes found');
  }
}

/**
 * Regla: Todas las conexiones referencian nodos existentes
 */
export class ValidConnectionReferencesRule extends BaseRule {
  constructor() {
    super({
      id: 'structural-valid-connections',
      name: 'Valid Connection References',
      description: 'Validates that all connections reference existing nodes',
      category: RuleCategory.STRUCTURAL,
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

    const nodes = workflow.nodes ?? [];
    const connections = workflow.connections ?? {};
    const nodeNames = new Set(nodes.map((n) => n.name));
    const invalidRefs: string[] = [];

    // Check source nodes in connections
    for (const sourceName of Object.keys(connections)) {
      if (!nodeNames.has(sourceName)) {
        invalidRefs.push(`Source: ${sourceName}`);
      }
    }

    // Check target nodes in connections
    for (const nodeConnections of Object.values(connections)) {
      for (const outputs of Object.values(nodeConnections)) {
        for (const outputConnections of outputs) {
          for (const conn of outputConnections) {
            if (!nodeNames.has(conn.node)) {
              invalidRefs.push(`Target: ${conn.node}`);
            }
          }
        }
      }
    }

    if (invalidRefs.length > 0) {
      return this.createFailureResult(
        `Found ${invalidRefs.length} invalid connection references`,
        { invalidReferences: invalidRefs },
        ['Ensure all connection references point to existing nodes']
      );
    }

    return this.createSuccessResult('All connection references are valid');
  }
}

/**
 * Regla: Workflow es conexo (todos los nodos alcanzables desde trigger)
 */
export class ConnectedWorkflowRule extends BaseRule {
  constructor() {
    super({
      id: 'structural-connected',
      name: 'Connected Workflow',
      description: 'Validates that all nodes are reachable from trigger',
      category: RuleCategory.STRUCTURAL,
      severity: 'warning',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    if (!workflow) {
      return this.createSuccessResult('No workflow provided, skipping connectivity check');
    }

    const nodes = workflow.nodes ?? [];
    if (nodes.length === 0) {
      return this.createSuccessResult('Empty workflow, skipping connectivity check');
    }

    const graph = buildConnectionGraph(workflow);

    // Find trigger nodes (entry points)
    const triggerTypes = ['webhook', 'scheduleTrigger', 'manualTrigger'];
    const entryNodes = nodes
      .filter((n) => triggerTypes.some((t) => n.type.includes(t)))
      .map((n) => n.name);

    if (entryNodes.length === 0) {
      return this.createFailureResult('No trigger node found as entry point', { entryNodes: [] }, [
        'Add a trigger node (Webhook, Schedule, or Manual)',
      ]);
    }

    // BFS to find all reachable nodes
    const visited = new Set<string>();
    const queue = [...entryNodes];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const neighbors = graph.edges.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    const unreachable = [...graph.nodes].filter((n) => !visited.has(n));

    if (unreachable.length > 0) {
      return this.createFailureResult(
        `Found ${unreachable.length} unreachable nodes`,
        { unreachableNodes: unreachable },
        unreachable.map((u) => `Connect node '${u}' to the main workflow flow`)
      );
    }

    return this.createSuccessResult('All nodes are reachable from trigger');
  }
}

/**
 * Factory para crear todas las reglas estructurales
 */
export function createStructuralRules(): BaseRule[] {
  return [
    new HasNodesRule(),
    new UniqueNodeNamesRule(),
    new NoOrphanNodesRule(),
    new ValidConnectionReferencesRule(),
    new ConnectedWorkflowRule(),
  ];
}
