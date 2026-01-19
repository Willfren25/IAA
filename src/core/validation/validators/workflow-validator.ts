/**
 * Workflow Validator
 *
 * Validador especializado para workflows n8n que combina
 * validación de schema JSON con reglas de negocio.
 */

import {
  type ValidationResult,
  type FormattedValidationError,
  ValidationSeverity,
} from '../types/index.js';
import { SchemaValidator, createValidator } from './schema-validator.js';
import {
  RuleEngine,
  createConfiguredRuleEngine,
  RuleCategory,
  type RuleContext,
  type RuleEngineResult,
  type RuleExecutionResult,
} from '../../rules/index.js';
import type { N8nWorkflow, WorkflowValidationError } from '../../domain/types/index.js';

/**
 * Opciones de validación de workflow
 */
export interface WorkflowValidatorOptions {
  /** Validar schema JSON */
  validateSchema?: boolean;
  /** Validar parámetros de nodos */
  validateNodeParameters?: boolean;
  /** Ejecutar reglas de negocio */
  executeRules?: boolean;
  /** Categorías de reglas a ejecutar */
  ruleCategories?: RuleCategory[];
  /** Versión de n8n objetivo */
  n8nVersion?: string;
  /** Modo estricto (sin suposiciones) */
  strictMode?: boolean;
}

/**
 * Resultado de validación completa del workflow
 */
export interface WorkflowValidationResult {
  /** Si la validación fue exitosa */
  isValid: boolean;
  /** Resultado de validación de schema */
  schemaValidation: ValidationResult | undefined;
  /** Resultado de ejecución de reglas */
  rulesValidation: RuleEngineResult | undefined;
  /** Todos los errores combinados */
  errors: FormattedValidationError[];
  /** Todos los warnings combinados */
  warnings: FormattedValidationError[];
  /** Resumen de validación */
  summary: {
    totalErrors: number;
    totalWarnings: number;
    schemaErrors: number;
    ruleErrors: number;
    passedRules: number;
    failedRules: number;
  };
}

/**
 * Todas las categorías de reglas disponibles
 */
const ALL_RULE_CATEGORIES = [
  RuleCategory.INPUT,
  RuleCategory.STRUCTURAL,
  RuleCategory.NODE,
  RuleCategory.FLOW,
  RuleCategory.OUTPUT,
];

/**
 * Opciones por defecto
 */
const DEFAULT_OPTIONS: Required<WorkflowValidatorOptions> = {
  validateSchema: true,
  validateNodeParameters: true,
  executeRules: true,
  ruleCategories: ALL_RULE_CATEGORIES,
  n8nVersion: '1.0.0',
  strictMode: false,
};

/**
 * Workflow Validator - Validador completo de workflows n8n
 */
export class WorkflowValidator {
  private readonly schemaValidator: SchemaValidator;
  private readonly ruleEngine: RuleEngine;
  private readonly options: Required<WorkflowValidatorOptions>;

  constructor(options: Partial<WorkflowValidatorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.schemaValidator = createValidator();
    this.ruleEngine = createConfiguredRuleEngine();
  }

  /**
   * Valida un workflow completo
   */
  async validate(workflow: unknown): Promise<WorkflowValidationResult> {
    const errors: FormattedValidationError[] = [];
    const warnings: FormattedValidationError[] = [];
    let schemaValidation: ValidationResult | undefined;
    let rulesValidation: RuleEngineResult | undefined;
    let schemaErrors = 0;
    let ruleErrors = 0;
    let passedRules = 0;
    let failedRules = 0;

    // Fase 1: Validación de Schema
    if (this.options.validateSchema) {
      schemaValidation = this.options.validateNodeParameters
        ? this.schemaValidator.validateWorkflowDeep(workflow)
        : this.schemaValidator.validateWorkflow(workflow);

      if (!schemaValidation.success) {
        errors.push(...schemaValidation.errors);
        schemaErrors = schemaValidation.errors.length;
      }
      warnings.push(...schemaValidation.warnings);
    }

    // Fase 2: Validación de Reglas de Negocio
    if (this.options.executeRules && workflow) {
      const ruleContext: RuleContext = {
        workflow: workflow as Partial<N8nWorkflow>,
        promptContract: undefined,
        n8nVersion: this.options.n8nVersion,
        strictMode: this.options.strictMode,
      };

      // Ejecutar solo categorías especificadas o todas
      if (this.options.ruleCategories.length === ALL_RULE_CATEGORIES.length) {
        rulesValidation = await this.ruleEngine.execute(ruleContext);
      } else {
        // Ejecutar categorías específicas
        const categoryResults: RuleEngineResult[] = [];
        for (const category of this.options.ruleCategories) {
          const result = await this.ruleEngine.executeCategory(category, ruleContext);
          categoryResults.push(result);
        }

        // Combinar resultados
        rulesValidation = this.combineRuleResults(categoryResults);
      }

      // Convertir resultados de reglas a errores formateados
      for (const result of rulesValidation.results) {
        if (!result.passed) {
          failedRules++;
          errors.push({
            path: '/',
            message: `[Rule: ${result.ruleName}] ${result.message}`,
            severity: ValidationSeverity.ERROR,
            keyword: 'rule',
            params: { category: result.category },
          });
          ruleErrors++;
        } else {
          passedRules++;
          if (result.message && this.options.strictMode) {
            warnings.push({
              path: '/',
              message: `[Rule: ${result.ruleName}] ${result.message}`,
              severity: ValidationSeverity.INFO,
              keyword: 'rule',
            });
          }
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      schemaValidation,
      rulesValidation,
      errors,
      warnings,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        schemaErrors,
        ruleErrors,
        passedRules,
        failedRules,
      },
    };
  }

  /**
   * Validación rápida - solo schema
   */
  validateSchemaOnly(workflow: unknown): ValidationResult {
    return this.schemaValidator.validateWorkflow(workflow);
  }

  /**
   * Validación de reglas - solo reglas de negocio
   */
  async validateRulesOnly(workflow: unknown, promptContract?: unknown): Promise<RuleEngineResult> {
    const context: RuleContext = {
      workflow: workflow as Partial<N8nWorkflow>,
      promptContract: promptContract as RuleContext['promptContract'],
      n8nVersion: this.options.n8nVersion,
      strictMode: this.options.strictMode,
    };

    return this.ruleEngine.execute(context);
  }

  /**
   * Combina múltiples resultados de reglas
   */
  private combineRuleResults(results: RuleEngineResult[]): RuleEngineResult {
    const allResults: RuleExecutionResult[] = [];
    const allErrors: WorkflowValidationError[] = [];
    const allWarnings: string[] = [];
    let totalRules = 0;
    let passedRulesCount = 0;
    let failedRulesCount = 0;
    let totalTime = 0;
    let success = true;

    for (const result of results) {
      allResults.push(...result.results);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      totalRules += result.totalRules;
      passedRulesCount += result.passedRules;
      failedRulesCount += result.failedRules;
      totalTime += result.executionTimeMs;

      if (!result.success) {
        success = false;
      }
    }

    return {
      success,
      results: allResults,
      errors: allErrors,
      warnings: allWarnings,
      totalRules,
      passedRules: passedRulesCount,
      failedRules: failedRulesCount,
      executionTimeMs: totalTime,
    };
  }
}

/**
 * Crea una instancia del validador de workflow
 */
export function createWorkflowValidator(
  options?: Partial<WorkflowValidatorOptions>
): WorkflowValidator {
  return new WorkflowValidator(options);
}

/**
 * Función de conveniencia para validación rápida
 */
export async function validateWorkflow(
  workflow: unknown,
  options?: Partial<WorkflowValidatorOptions>
): Promise<WorkflowValidationResult> {
  const validator = createWorkflowValidator(options);
  return validator.validate(workflow);
}
