/**
 * Output Rules - Reglas de compatibilidad de salida y JSON Schema
 */

import { BaseRule } from '../base/base-rule.js';
import {
  RuleCategory,
  type RuleContext,
  type RuleExecutionResult,
} from '../../domain/types/rules.types.js';

/**
 * Regla: Workflow exportable (tiene estructura mínima válida)
 */
export class ExportableWorkflowRule extends BaseRule {
  constructor() {
    super({
      id: 'output-exportable',
      name: 'Exportable Workflow',
      description: 'Validates that workflow has minimum required structure for export',
      category: RuleCategory.OUTPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const missing: string[] = [];

    if (!workflow?.name) {
      missing.push('name');
    }

    if (!workflow?.nodes || !Array.isArray(workflow.nodes)) {
      missing.push('nodes array');
    }

    if (!workflow?.connections || typeof workflow.connections !== 'object') {
      missing.push('connections object');
    }

    if (missing.length > 0) {
      return this.createFailureResult(
        'Workflow missing required export properties',
        { missingProperties: missing },
        missing.map((m) => `Add required property: ${m}`)
      );
    }

    return this.createSuccessResult('Workflow has all required export properties');
  }
}

/**
 * Regla: Nodos tienen IDs para exportación
 */
export class NodesHaveIdsRule extends BaseRule {
  constructor() {
    super({
      id: 'output-nodes-have-ids',
      name: 'Nodes Have IDs',
      description: 'Validates that all nodes have IDs for proper n8n import',
      category: RuleCategory.OUTPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const nodesWithoutIds: string[] = [];

    for (const node of workflow?.nodes ?? []) {
      if (!node.id) {
        nodesWithoutIds.push(node.name);
      }
    }

    if (nodesWithoutIds.length > 0) {
      return this.createFailureResult(
        `Found ${nodesWithoutIds.length} nodes without IDs`,
        { nodesWithoutIds },
        ['Generate unique IDs for all nodes before export']
      );
    }

    return this.createSuccessResult('All nodes have IDs');
  }
}

/**
 * Regla: Posiciones válidas para renderizado
 */
export class ValidPositionsForRenderRule extends BaseRule {
  constructor() {
    super({
      id: 'output-valid-positions',
      name: 'Valid Positions for Render',
      description: 'Validates that node positions will render correctly in n8n UI',
      category: RuleCategory.OUTPUT,
      severity: 'warning',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const issues: Array<{ nodeName: string; issue: string }> = [];

    // Check for overlapping positions
    const positions = new Map<string, string>();

    for (const node of workflow?.nodes ?? []) {
      const posKey = `${node.position.x},${node.position.y}`;

      if (positions.has(posKey)) {
        issues.push({
          nodeName: node.name,
          issue: `Overlaps with node '${positions.get(posKey)}'`,
        });
      } else {
        positions.set(posKey, node.name);
      }

      // Check for negative positions (might not render well)
      if (node.position.x < 0 || node.position.y < 0) {
        issues.push({
          nodeName: node.name,
          issue: 'Has negative position coordinates',
        });
      }
    }

    if (issues.length > 0) {
      return this.createFailureResult(
        `Found ${issues.length} position issues`,
        { issues },
        issues.map((i) => `Node '${i.nodeName}': ${i.issue}`)
      );
    }

    return this.createSuccessResult('All positions are valid for rendering');
  }
}

/**
 * Regla: Conexiones en formato correcto para n8n
 */
export class ValidConnectionFormatRule extends BaseRule {
  constructor() {
    super({
      id: 'output-valid-connection-format',
      name: 'Valid Connection Format',
      description: 'Validates that connections are in correct n8n format',
      category: RuleCategory.OUTPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const issues: string[] = [];

    for (const [sourceName, connections] of Object.entries(workflow?.connections ?? {})) {
      // Connections should have 'main' or other valid keys
      for (const [connType, outputs] of Object.entries(connections)) {
        if (!Array.isArray(outputs)) {
          issues.push(`${sourceName}.${connType}: outputs should be an array`);
          continue;
        }

        for (let i = 0; i < outputs.length; i++) {
          const outputConnections = outputs[i];
          if (!Array.isArray(outputConnections)) {
            issues.push(`${sourceName}.${connType}[${i}]: should be an array`);
            continue;
          }

          for (const conn of outputConnections) {
            if (!conn.node || typeof conn.node !== 'string') {
              issues.push(`${sourceName}.${connType}[${i}]: missing or invalid 'node' property`);
            }
            if (!conn.type || typeof conn.type !== 'string') {
              issues.push(`${sourceName}.${connType}[${i}]: missing or invalid 'type' property`);
            }
            if (typeof conn.index !== 'number') {
              issues.push(`${sourceName}.${connType}[${i}]: missing or invalid 'index' property`);
            }
          }
        }
      }
    }

    if (issues.length > 0) {
      return this.createFailureResult(
        `Found ${issues.length} connection format issues`,
        { issues },
        ['Ensure connections follow n8n format: { node, type, index }']
      );
    }

    return this.createSuccessResult('All connections are in valid format');
  }
}

/**
 * Regla: JSON serializable sin errores
 */
export class JsonSerializableRule extends BaseRule {
  constructor() {
    super({
      id: 'output-json-serializable',
      name: 'JSON Serializable',
      description: 'Validates that workflow can be serialized to JSON',
      category: RuleCategory.OUTPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;

    try {
      const json = JSON.stringify(workflow);
      const parsed = JSON.parse(json) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        return this.createFailureResult('Workflow did not serialize to a valid object', {}, [
          'Ensure workflow is a valid object structure',
        ]);
      }

      return this.createSuccessResult(`Workflow serializes correctly (${json.length} bytes)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown serialization error';
      return this.createFailureResult(
        `Workflow cannot be serialized to JSON: ${message}`,
        { error: message },
        ['Remove circular references or non-serializable values']
      );
    }
  }
}

/**
 * Factory para crear todas las reglas de salida
 */
export function createOutputRules(): BaseRule[] {
  return [
    new ExportableWorkflowRule(),
    new NodesHaveIdsRule(),
    new ValidPositionsForRenderRule(),
    new ValidConnectionFormatRule(),
    new JsonSerializableRule(),
  ];
}
