/**
 * Input Rules - Reglas de validación de entrada/metadata
 */

import { BaseRule } from '../base/base-rule.js';
import {
  RuleCategory,
  type RuleContext,
  type RuleExecutionResult,
} from '../../domain/types/rules.types.js';
import { SUPPORTED_N8N_VERSIONS } from '../../domain/constants/workflow.constants.js';

/**
 * Regla: Validar que existe metadata del prompt
 */
export class MetaExistsRule extends BaseRule {
  constructor() {
    super({
      id: 'input-meta-exists',
      name: 'Meta Exists',
      description: 'Validates that prompt metadata exists',
      category: RuleCategory.INPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsPromptContract: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { promptContract } = context;
    if (!promptContract?.meta) {
      return this.createFailureResult('Missing @meta section in prompt', { section: 'meta' }, [
        'Add @meta section with n8n_version, output, and strict mode',
      ]);
    }

    return this.createSuccessResult('Meta section exists');
  }
}

/**
 * Regla: Validar versión de n8n
 */
export class ValidN8nVersionRule extends BaseRule {
  constructor() {
    super({
      id: 'input-valid-version',
      name: 'Valid n8n Version',
      description: 'Validates that n8n version is supported',
      category: RuleCategory.INPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const { n8nVersion } = context;

    if (!n8nVersion) {
      return this.createFailureResult('n8n version not specified', { providedVersion: undefined }, [
        'Specify n8n version in @meta section',
      ]);
    }

    const isSupported = SUPPORTED_N8N_VERSIONS.includes(
      n8nVersion as (typeof SUPPORTED_N8N_VERSIONS)[number]
    );

    if (!isSupported) {
      return this.createFailureResult(
        `Unsupported n8n version: ${n8nVersion}`,
        {
          providedVersion: n8nVersion,
          supportedVersions: SUPPORTED_N8N_VERSIONS,
        },
        [`Use one of the supported versions: ${SUPPORTED_N8N_VERSIONS.join(', ')}`]
      );
    }

    return this.createSuccessResult(`n8n version ${n8nVersion} is supported`);
  }
}

/**
 * Regla: Validar que existe trigger en el prompt
 */
export class TriggerExistsRule extends BaseRule {
  constructor() {
    super({
      id: 'input-trigger-exists',
      name: 'Trigger Exists',
      description: 'Validates that trigger definition exists',
      category: RuleCategory.INPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsPromptContract: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { promptContract } = context;
    if (!promptContract?.trigger) {
      return this.createFailureResult(
        'Missing @trigger section in prompt',
        { section: 'trigger' },
        ['Add @trigger section with type (webhook, cron, or manual)']
      );
    }

    if (!promptContract.trigger.type) {
      return this.createFailureResult('Trigger type not specified', { section: 'trigger' }, [
        'Specify trigger type: webhook, cron, or manual',
      ]);
    }

    return this.createSuccessResult('Trigger section exists');
  }
}

/**
 * Regla: Validar que existe workflow steps
 */
export class WorkflowStepsExistRule extends BaseRule {
  constructor() {
    super({
      id: 'input-workflow-exists',
      name: 'Workflow Steps Exist',
      description: 'Validates that workflow steps are defined',
      category: RuleCategory.INPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    const validation = this.validateContext(context, { needsPromptContract: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { promptContract } = context;
    if (!promptContract?.workflow || promptContract.workflow.length === 0) {
      return this.createFailureResult(
        'Missing @workflow section or empty workflow',
        { section: 'workflow' },
        ['Add @workflow section with numbered steps']
      );
    }

    return this.createSuccessResult(`Found ${promptContract.workflow.length} workflow steps`);
  }
}

/**
 * Regla: Validar strict mode sin ambigüedades
 */
export class StrictModeNoAmbiguityRule extends BaseRule {
  constructor() {
    super({
      id: 'input-strict-no-ambiguity',
      name: 'Strict Mode No Ambiguity',
      description: 'In strict mode, rejects ambiguous inputs',
      category: RuleCategory.INPUT,
      severity: 'error',
    });
  }

  execute(context: RuleContext): RuleExecutionResult {
    if (!context.strictMode) {
      return this.createSuccessResult('Not in strict mode, skipping ambiguity check');
    }

    const validation = this.validateContext(context, { needsPromptContract: true });
    if (!validation.valid) {
      return this.createFailureResult(validation.error ?? 'Invalid context');
    }

    const { promptContract } = context;
    const ambiguities: string[] = [];

    // Check for ambiguous workflow steps
    if (promptContract?.workflow) {
      for (const step of promptContract.workflow) {
        if (!step.nodeType && !step.action) {
          ambiguities.push(`Step ${step.stepNumber}: No clear action or node type`);
        }
      }
    }

    // Check for ambiguous trigger
    if (promptContract?.trigger.type === 'webhook' && !promptContract.trigger.path) {
      ambiguities.push('Webhook trigger without path');
    }

    if (ambiguities.length > 0) {
      return this.createFailureResult(
        `Strict mode: ${ambiguities.length} ambiguities found`,
        { ambiguities },
        ambiguities.map((a) => `Resolve: ${a}`)
      );
    }

    return this.createSuccessResult('No ambiguities found in strict mode');
  }
}

/**
 * Factory para crear todas las reglas de entrada
 */
export function createInputRules(): BaseRule[] {
  return [
    new MetaExistsRule(),
    new ValidN8nVersionRule(),
    new TriggerExistsRule(),
    new WorkflowStepsExistRule(),
    new StrictModeNoAmbiguityRule(),
  ];
}
