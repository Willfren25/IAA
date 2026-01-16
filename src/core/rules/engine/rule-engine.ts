/**
 * Rule Engine - Motor de reglas central
 *
 * Orquesta la ejecución de todas las reglas.
 * Implementa patrón Strategy + Registry.
 */

import {
  RuleCategory,
  type Rule,
  type RuleContext,
  type RuleEngineConfig,
  type RuleEngineResult,
  type RuleExecutionResult,
  type RuleRegistry,
} from '../../domain/types/rules.types.js';
import type { WorkflowValidationError } from '../../domain/types/workflow.types.js';

/**
 * Configuración por defecto del motor
 */
const DEFAULT_CONFIG: RuleEngineConfig = {
  enabledCategories: [
    RuleCategory.INPUT,
    RuleCategory.STRUCTURAL,
    RuleCategory.NODE,
    RuleCategory.FLOW,
    RuleCategory.OUTPUT,
  ],
  strictMode: false,
  failFast: false,
  maxErrors: 100,
};

/**
 * Motor de Reglas Principal
 *
 * Responsabilidades:
 * - Registrar reglas
 * - Ejecutar reglas en orden
 * - Agregar resultados
 * - Reportar errores y warnings
 */
export class RuleEngine {
  private readonly registry: RuleRegistry;
  private readonly config: RuleEngineConfig;

  constructor(config?: Partial<RuleEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = {
      rules: new Map(),
      byCategory: new Map([
        [RuleCategory.INPUT, []],
        [RuleCategory.STRUCTURAL, []],
        [RuleCategory.NODE, []],
        [RuleCategory.FLOW, []],
        [RuleCategory.OUTPUT, []],
      ]),
    };
  }

  /**
   * Registra una regla en el motor
   */
  registerRule(rule: Rule): void {
    if (this.registry.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' is already registered`);
    }

    this.registry.rules.set(rule.id, rule);

    const categoryRules = this.registry.byCategory.get(rule.category);
    if (categoryRules) {
      categoryRules.push(rule);
    }
  }

  /**
   * Registra múltiples reglas
   */
  registerRules(rules: Rule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Elimina una regla del motor
   */
  unregisterRule(ruleId: string): boolean {
    const rule = this.registry.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.registry.rules.delete(ruleId);

    const categoryRules = this.registry.byCategory.get(rule.category);
    if (categoryRules) {
      const index = categoryRules.findIndex((r: Rule) => r.id === ruleId);
      if (index !== -1) {
        categoryRules.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Ejecuta todas las reglas habilitadas
   */
  async execute(context: RuleContext): Promise<RuleEngineResult> {
    const startTime = Date.now();
    const results: RuleExecutionResult[] = [];
    const errors: WorkflowValidationError[] = [];
    const warnings: string[] = [];

    let passedCount = 0;
    let failedCount = 0;

    // Obtener reglas ordenadas por categoría
    const orderedRules = this.getOrderedRules();

    for (const rule of orderedRules) {
      // Skip reglas deshabilitadas
      if (!rule.enabled) {
        continue;
      }

      // Skip categorías no habilitadas
      if (!this.config.enabledCategories.includes(rule.category)) {
        continue;
      }

      try {
        const result = await rule.execute(context);
        results.push(result);

        if (result.passed) {
          passedCount++;
        } else {
          failedCount++;

          // Convertir a error de workflow (mapear 'info' a 'warning')
          const errorSeverity = result.severity === 'info' ? 'warning' : result.severity;
          errors.push({
            code: result.ruleId,
            message: result.message ?? `Rule ${rule.name} failed`,
            severity: errorSeverity,
            path: result.details?.['path'] as string | undefined,
            nodeName: result.details?.['nodeName'] as string | undefined,
          });

          // Agregar sugerencias como warnings
          if (result.suggestions) {
            warnings.push(...result.suggestions);
          }

          // Fail fast si está configurado
          if (this.config.failFast && result.severity === 'error') {
            break;
          }

          // Límite de errores
          if (errors.length >= this.config.maxErrors) {
            warnings.push(`Maximum error limit (${this.config.maxErrors}) reached`);
            break;
          }
        }
      } catch (error) {
        // Error en la ejecución de la regla
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        errors.push({
          code: 'RULE_EXECUTION_ERROR',
          message: `Rule '${rule.name}' threw an error: ${errorMessage}`,
          severity: 'error',
        });

        failedCount++;

        if (this.config.failFast) {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: failedCount === 0 || errors.every((e) => e.severity === 'warning'),
      totalRules: results.length,
      passedRules: passedCount,
      failedRules: failedCount,
      results,
      errors,
      warnings,
      executionTimeMs,
    };
  }

  /**
   * Ejecuta reglas de una categoría específica
   */
  async executeCategory(category: RuleCategory, context: RuleContext): Promise<RuleEngineResult> {
    const startTime = Date.now();
    const rules = this.registry.byCategory.get(category) ?? [];
    const results: RuleExecutionResult[] = [];
    const errors: WorkflowValidationError[] = [];
    const warnings: string[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const rule of rules) {
      if (rule.enabled) {
        const result = await rule.execute(context);
        results.push(result);

        if (result.passed) {
          passedCount++;
        } else {
          failedCount++;
          const errorSeverity = result.severity === 'info' ? 'warning' : result.severity;
          errors.push({
            code: result.ruleId,
            message: result.message ?? `Rule ${rule.name} failed`,
            severity: errorSeverity,
            path: result.details?.['path'] as string | undefined,
            nodeName: result.details?.['nodeName'] as string | undefined,
          });
          if (result.suggestions) {
            warnings.push(...result.suggestions);
          }
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: failedCount === 0 || errors.every((e) => e.severity === 'warning'),
      totalRules: results.length,
      passedRules: passedCount,
      failedRules: failedCount,
      results,
      errors,
      warnings,
      executionTimeMs,
    };
  }

  /**
   * Obtiene todas las reglas ordenadas por categoría
   */
  private getOrderedRules(): Rule[] {
    const categoryOrder: RuleCategory[] = [
      RuleCategory.INPUT,
      RuleCategory.STRUCTURAL,
      RuleCategory.NODE,
      RuleCategory.FLOW,
      RuleCategory.OUTPUT,
    ];
    const orderedRules: Rule[] = [];

    for (const category of categoryOrder) {
      const rules = this.registry.byCategory.get(category);
      if (rules) {
        orderedRules.push(...rules);
      }
    }

    return orderedRules;
  }

  /**
   * Obtiene estadísticas del registro
   */
  getStats(): {
    totalRules: number;
    byCategory: Record<RuleCategory, number>;
    enabledRules: number;
  } {
    const byCategory = {} as Record<RuleCategory, number>;
    let enabledCount = 0;

    for (const [category, rules] of this.registry.byCategory) {
      byCategory[category] = rules.length;
      enabledCount += rules.filter((r: Rule) => r.enabled).length;
    }

    return {
      totalRules: this.registry.rules.size,
      byCategory,
      enabledRules: enabledCount,
    };
  }

  /**
   * Obtiene una regla por ID
   */
  getRule(ruleId: string): Rule | undefined {
    return this.registry.rules.get(ruleId);
  }

  /**
   * Lista todas las reglas registradas
   */
  listRules(): Rule[] {
    return Array.from(this.registry.rules.values());
  }

  /**
   * Actualiza la configuración del motor
   */
  updateConfig(config: Partial<RuleEngineConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): RuleEngineConfig {
    return { ...this.config };
  }
}
