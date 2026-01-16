/**
 * Base Rule - Clase abstracta base para todas las reglas
 *
 * Implementa el patrón Strategy para reglas intercambiables.
 */

import type {
  Rule,
  RuleCategory,
  RuleSeverity,
  RuleContext,
  RuleExecutionResult,
} from '../../domain/types/rules.types.js';

/**
 * Clase abstracta base para reglas
 * Todas las reglas del motor deben extender esta clase
 */
export abstract class BaseRule implements Rule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly enabled: boolean;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    category: RuleCategory;
    severity: RuleSeverity;
    enabled?: boolean;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.severity = config.severity;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Método abstracto que cada regla debe implementar
   */
  abstract execute(context: RuleContext): RuleExecutionResult | Promise<RuleExecutionResult>;

  /**
   * Helper para crear resultado exitoso
   */
  protected createSuccessResult(message?: string): RuleExecutionResult {
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      passed: true,
      severity: this.severity,
      message: message ?? `Rule ${this.name} passed`,
    };
  }

  /**
   * Helper para crear resultado fallido
   */
  protected createFailureResult(
    message: string,
    details?: Record<string, unknown>,
    suggestions?: string[]
  ): RuleExecutionResult {
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      passed: false,
      severity: this.severity,
      message,
      details,
      suggestions,
    };
  }

  /**
   * Valida que el contexto tenga los datos necesarios
   */
  protected validateContext(
    context: RuleContext,
    requirements: {
      needsPromptContract?: boolean;
      needsWorkflow?: boolean;
    }
  ): { valid: boolean; error?: string } {
    if (requirements.needsPromptContract && !context.promptContract) {
      return { valid: false, error: 'Prompt contract is required for this rule' };
    }
    if (requirements.needsWorkflow && !context.workflow) {
      return { valid: false, error: 'Workflow is required for this rule' };
    }
    return { valid: true };
  }
}
