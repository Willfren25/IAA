/**
 * Rules Types - Motor de Reglas Domain Types
 *
 * Tipos para el motor de reglas y validaciones.
 */

import type { N8nWorkflow, WorkflowValidationError } from './workflow.types.js';
import type { PromptContract } from './prompt.types.js';

/**
 * Categoría de regla
 */
export enum RuleCategory {
  INPUT = 'input', // Validación de entrada/metadata
  STRUCTURAL = 'structural', // Conectividad entre nodos
  NODE = 'node', // Constraints por tipo de nodo
  FLOW = 'flow', // Ciclos, trigger único
  OUTPUT = 'output', // Compatibilidad JSON Schema
}

/**
 * Severidad de la regla
 */
export type RuleSeverity = 'error' | 'warning' | 'info';

/**
 * Resultado de ejecución de una regla
 */
export interface RuleExecutionResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly category: RuleCategory;
  readonly passed: boolean;
  readonly severity: RuleSeverity;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
  readonly suggestions?: string[];
}

/**
 * Contexto para ejecución de reglas
 */
export interface RuleContext {
  readonly promptContract?: PromptContract;
  readonly workflow?: Partial<N8nWorkflow>;
  readonly n8nVersion?: string;
  readonly strictMode?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Interfaz base para todas las reglas
 */
export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;
  readonly severity: RuleSeverity;
  readonly enabled: boolean;

  execute(context: RuleContext): RuleExecutionResult | Promise<RuleExecutionResult>;
}

/**
 * Configuración del motor de reglas
 */
export interface RuleEngineConfig {
  readonly enabledCategories: RuleCategory[];
  readonly strictMode: boolean;
  readonly failFast: boolean;
  readonly maxErrors: number;
  readonly customRules?: Rule[];
}

/**
 * Resultado completo del motor de reglas
 */
export interface RuleEngineResult {
  readonly success: boolean;
  readonly totalRules: number;
  readonly passedRules: number;
  readonly failedRules: number;
  readonly results: readonly RuleExecutionResult[];
  readonly errors: readonly WorkflowValidationError[];
  readonly warnings: readonly string[];
  readonly executionTimeMs: number;
}

/**
 * Estado del motor de reglas
 */
export interface RuleEngineState {
  readonly isRunning: boolean;
  readonly currentRule?: string;
  readonly progress: number;
  readonly startTime?: Date;
}

/**
 * Registro de reglas disponibles
 */
export interface RuleRegistry {
  readonly rules: Map<string, Rule>;
  readonly byCategory: Map<RuleCategory, Rule[]>;
}
