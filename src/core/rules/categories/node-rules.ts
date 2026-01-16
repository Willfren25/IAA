/**
 * Node Rules - Reglas de validación por tipo de nodo
 */

import { BaseRule } from '../base/base-rule.js';
import {
  RuleCategory,
  type RuleContext,
  type RuleExecutionResult,
} from '../../domain/types/rules.types.js';
import { getNodeMetadata } from '../../domain/constants/node.constants.js';

/**
 * Regla: Tipos de nodo válidos
 */
export class ValidNodeTypesRule extends BaseRule {
  constructor() {
    super({
      id: 'node-valid-types',
      name: 'Valid Node Types',
      description: 'Validates that all nodes have recognized types',
      category: RuleCategory.NODE,
      severity: 'warning',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const unknownTypes: Array<{ name: string; type: string }> = [];

    for (const node of workflow?.nodes ?? []) {
      const metadata = getNodeMetadata(node.type);
      if (!metadata) {
        unknownTypes.push({ name: node.name, type: node.type });
      }
    }

    if (unknownTypes.length > 0) {
      return this.createFailureResult(
        `Found ${unknownTypes.length} nodes with unknown types`,
        { unknownTypes },
        unknownTypes.map((u) => `Node '${u.name}' has unrecognized type: ${u.type}`)
      );
    }

    return this.createSuccessResult('All node types are recognized');
  }
}

/**
 * Regla: Parámetros requeridos presentes
 */
export class RequiredParametersRule extends BaseRule {
  constructor() {
    super({
      id: 'node-required-params',
      name: 'Required Parameters',
      description: 'Validates that required parameters are present for each node type',
      category: RuleCategory.NODE,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const missingParams: Array<{ nodeName: string; nodeType: string; missing: string[] }> = [];

    for (const node of workflow?.nodes ?? []) {
      const metadata = getNodeMetadata(node.type);
      if (!metadata) {
        continue; // Unknown type handled by another rule
      }

      const missing: string[] = [];
      for (const requiredParam of metadata.requiredParams) {
        if (!(requiredParam in (node.parameters ?? {}))) {
          missing.push(requiredParam);
        }
      }

      if (missing.length > 0) {
        missingParams.push({
          nodeName: node.name,
          nodeType: node.type,
          missing,
        });
      }
    }

    if (missingParams.length > 0) {
      return this.createFailureResult(
        `Found ${missingParams.length} nodes with missing required parameters`,
        { missingParams },
        missingParams.map((m) => `Node '${m.nodeName}' missing: ${m.missing.join(', ')}`)
      );
    }

    return this.createSuccessResult('All required parameters are present');
  }
}

/**
 * Regla: Versión de nodo válida
 */
export class ValidNodeVersionRule extends BaseRule {
  constructor() {
    super({
      id: 'node-valid-version',
      name: 'Valid Node Version',
      description: 'Validates that node versions are valid',
      category: RuleCategory.NODE,
      severity: 'warning',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const invalidVersions: Array<{ nodeName: string; version: number }> = [];

    for (const node of workflow?.nodes ?? []) {
      if (node.typeVersion < 1) {
        invalidVersions.push({ nodeName: node.name, version: node.typeVersion });
      }
    }

    if (invalidVersions.length > 0) {
      return this.createFailureResult(
        `Found ${invalidVersions.length} nodes with invalid versions`,
        { invalidVersions },
        invalidVersions.map((v) => `Node '${v.nodeName}' has invalid version: ${v.version}`)
      );
    }

    return this.createSuccessResult('All node versions are valid');
  }
}

/**
 * Regla: Posiciones válidas de nodos
 */
export class ValidNodePositionsRule extends BaseRule {
  constructor() {
    super({
      id: 'node-valid-positions',
      name: 'Valid Node Positions',
      description: 'Validates that node positions are within bounds',
      category: RuleCategory.NODE,
      severity: 'info',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const MIN = -10000;
    const MAX = 10000;
    const outOfBounds: Array<{ nodeName: string; position: { x: number; y: number } }> = [];

    for (const node of workflow?.nodes ?? []) {
      const { x, y } = node.position;
      if (x < MIN || x > MAX || y < MIN || y > MAX) {
        outOfBounds.push({ nodeName: node.name, position: { x, y } });
      }
    }

    if (outOfBounds.length > 0) {
      return this.createFailureResult(
        `Found ${outOfBounds.length} nodes with out-of-bounds positions`,
        { outOfBounds },
        outOfBounds.map(
          (o) => `Node '${o.nodeName}' position (${o.position.x}, ${o.position.y}) is out of bounds`
        )
      );
    }

    return this.createSuccessResult('All node positions are within bounds');
  }
}

/**
 * Regla: IDs de nodo válidos
 */
export class ValidNodeIdsRule extends BaseRule {
  constructor() {
    super({
      id: 'node-valid-ids',
      name: 'Valid Node IDs',
      description: 'Validates that all nodes have valid unique IDs',
      category: RuleCategory.NODE,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsWorkflow: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { workflow } = context;
    const ids = new Set<string>();
    const duplicateIds: string[] = [];
    const emptyIds: string[] = [];

    for (const node of workflow?.nodes ?? []) {
      if (!node.id || node.id.trim() === '') {
        emptyIds.push(node.name);
      } else if (ids.has(node.id)) {
        duplicateIds.push(node.id);
      } else {
        ids.add(node.id);
      }
    }

    if (emptyIds.length > 0 || duplicateIds.length > 0) {
      return this.createFailureResult(
        'Found nodes with invalid or duplicate IDs',
        { emptyIds, duplicateIds },
        [
          ...emptyIds.map((n) => `Node '${n}' has empty ID`),
          ...duplicateIds.map((id) => `Duplicate node ID: ${id}`),
        ]
      );
    }

    return this.createSuccessResult('All node IDs are valid and unique');
  }
}

/**
 * Factory para crear todas las reglas de nodos
 */
export function createNodeRules(): BaseRule[] {
  return [
    new ValidNodeTypesRule(),
    new RequiredParametersRule(),
    new ValidNodeVersionRule(),
    new ValidNodePositionsRule(),
    new ValidNodeIdsRule(),
  ];
}
