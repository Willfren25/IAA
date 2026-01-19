/**
 * Input Validator Port - Validación de entrada contra contrato
 *
 * Define el contrato para validar entrada del usuario
 * contra el contrato de prompt y schemas definidos.
 */

import type { PromptContract } from '#core/domain/types/prompt.types.js';
import type { ValidationResult } from '#core/validation/types/validation.types.js';

/**
 * Nivel de severidad de validación
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Tipo de validación
 */
export type ValidationType =
  | 'syntax' // Errores de sintaxis DSL
  | 'schema' // Validación contra JSON Schema
  | 'semantic' // Validación semántica (lógica de negocio)
  | 'completeness' // Campos requeridos faltantes
  | 'consistency' // Inconsistencias internas
  | 'compatibility'; // Compatibilidad con n8n

/**
 * Issue de validación
 */
export interface ValidationIssue {
  readonly type: ValidationType;
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
  readonly suggestion?: string;
  readonly documentation?: string;
}

/**
 * Resultado de validación de entrada
 */
export interface InputValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly infos: readonly ValidationIssue[];
  readonly validatedAt: Date;
  readonly validationTimeMs: number;
}

/**
 * Regla de validación
 */
export interface ValidationRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: ValidationType;
  readonly severity: ValidationSeverity;
  readonly enabled: boolean;
  readonly validate: (input: unknown, context: ValidationContext) => ValidationRuleResult;
}

/**
 * Resultado de una regla de validación
 */
export interface ValidationRuleResult {
  readonly passed: boolean;
  readonly issues: readonly ValidationIssue[];
}

/**
 * Contexto de validación
 */
export interface ValidationContext {
  readonly strictMode: boolean;
  readonly targetN8nVersion?: string;
  readonly allowedNodeTypes?: readonly string[];
  readonly customRules?: readonly ValidationRule[];
  readonly locale?: 'es' | 'en';
}

/**
 * Opciones de validación de entrada
 */
export interface InputValidationOptions {
  /** Modo estricto - más riguroso */
  readonly strictMode?: boolean;
  /** Validar sintaxis DSL */
  readonly validateSyntax?: boolean;
  /** Validar contra JSON Schema */
  readonly validateSchema?: boolean;
  /** Validar semántica */
  readonly validateSemantic?: boolean;
  /** Validar completitud */
  readonly validateCompleteness?: boolean;
  /** Validar consistencia */
  readonly validateConsistency?: boolean;
  /** Validar compatibilidad n8n */
  readonly validateCompatibility?: boolean;
  /** Versión de n8n objetivo */
  readonly targetN8nVersion?: string;
  /** Abortar en primer error */
  readonly failFast?: boolean;
  /** Máximo de issues a reportar */
  readonly maxIssues?: number;
  /** Reglas personalizadas */
  readonly customRules?: readonly ValidationRule[];
}

/**
 * Resultado de validación por tipo
 */
export interface ValidationResultsByType {
  readonly syntax: InputValidationResult;
  readonly schema: InputValidationResult;
  readonly semantic: InputValidationResult;
  readonly completeness: InputValidationResult;
  readonly consistency: InputValidationResult;
  readonly compatibility: InputValidationResult;
}

/**
 * Reporte de validación completo
 */
export interface ValidationReport {
  readonly summary: {
    readonly totalIssues: number;
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
    readonly isValid: boolean;
  };
  readonly resultsByType: ValidationResultsByType;
  readonly allIssues: readonly ValidationIssue[];
  readonly validatedInput: string;
  readonly validatedAt: Date;
  readonly validationTimeMs: number;
}

/**
 * Puerto de Validador de Entrada
 *
 * Define el contrato para validar entrada del usuario.
 * Soporta múltiples tipos de validación configurables.
 */
export interface InputValidatorPort {
  /**
   * Valida entrada completa
   * @param input - Input crudo del usuario
   * @param options - Opciones de validación
   * @returns Resultado de validación
   */
  validate(input: string, options?: InputValidationOptions): InputValidationResult;

  /**
   * Valida un PromptContract ya parseado
   * @param contract - Contrato parseado
   * @param options - Opciones de validación
   * @returns Resultado de validación
   */
  validateContract(
    contract: PromptContract,
    options?: InputValidationOptions
  ): InputValidationResult;

  /**
   * Genera reporte de validación detallado
   * @param input - Input crudo del usuario
   * @param options - Opciones de validación
   * @returns Reporte completo
   */
  generateReport(input: string, options?: InputValidationOptions): ValidationReport;

  /**
   * Valida solo sintaxis DSL
   * @param input - Input crudo del usuario
   * @returns Resultado de validación de sintaxis
   */
  validateSyntax(input: string): InputValidationResult;

  /**
   * Valida contra JSON Schema
   * @param input - Input crudo o parseado
   * @param schemaId - ID del schema a usar
   * @returns Resultado de validación de schema
   */
  validateAgainstSchema(input: string | PromptContract, schemaId?: string): ValidationResult;

  /**
   * Valida semántica del contrato
   * @param contract - Contrato parseado
   * @returns Resultado de validación semántica
   */
  validateSemantic(contract: PromptContract): InputValidationResult;

  /**
   * Valida completitud del contrato
   * @param contract - Contrato parseado
   * @param strictMode - Si es modo estricto
   * @returns Resultado de validación de completitud
   */
  validateCompleteness(contract: PromptContract, strictMode?: boolean): InputValidationResult;

  /**
   * Valida consistencia interna
   * @param contract - Contrato parseado
   * @returns Resultado de validación de consistencia
   */
  validateConsistency(contract: PromptContract): InputValidationResult;

  /**
   * Valida compatibilidad con versión de n8n
   * @param contract - Contrato parseado
   * @param n8nVersion - Versión de n8n
   * @returns Resultado de validación de compatibilidad
   */
  validateN8nCompatibility(contract: PromptContract, n8nVersion?: string): InputValidationResult;

  /**
   * Registra una regla de validación personalizada
   * @param rule - Regla a registrar
   */
  registerRule(rule: ValidationRule): void;

  /**
   * Desregistra una regla de validación
   * @param ruleId - ID de la regla
   * @returns true si se eliminó
   */
  unregisterRule(ruleId: string): boolean;

  /**
   * Obtiene todas las reglas registradas
   * @returns Array de reglas
   */
  getRules(): readonly ValidationRule[];

  /**
   * Habilita/deshabilita una regla
   * @param ruleId - ID de la regla
   * @param enabled - Estado deseado
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void;
}

/**
 * Códigos de error de validación predefinidos
 */
export const VALIDATION_ERROR_CODES = {
  // Sintaxis
  SYNTAX_INVALID_SECTION: 'E001',
  SYNTAX_MISSING_COLON: 'E002',
  SYNTAX_INVALID_INDENTATION: 'E003',
  SYNTAX_UNEXPECTED_TOKEN: 'E004',

  // Schema
  SCHEMA_INVALID_TYPE: 'E100',
  SCHEMA_MISSING_REQUIRED: 'E101',
  SCHEMA_INVALID_ENUM: 'E102',
  SCHEMA_PATTERN_MISMATCH: 'E103',

  // Semántica
  SEMANTIC_INVALID_TRIGGER: 'E200',
  SEMANTIC_INVALID_NODE_TYPE: 'E201',
  SEMANTIC_CIRCULAR_REFERENCE: 'E202',
  SEMANTIC_UNREACHABLE_STEP: 'E203',

  // Completitud
  COMPLETENESS_MISSING_META: 'E300',
  COMPLETENESS_MISSING_TRIGGER: 'E301',
  COMPLETENESS_MISSING_WORKFLOW: 'E302',
  COMPLETENESS_EMPTY_STEPS: 'E303',

  // Consistencia
  CONSISTENCY_DUPLICATE_STEP_ID: 'E400',
  CONSISTENCY_MISMATCHED_TYPES: 'E401',
  CONSISTENCY_INVALID_REFERENCE: 'E402',

  // Compatibilidad
  COMPAT_UNSUPPORTED_NODE: 'E500',
  COMPAT_DEPRECATED_FEATURE: 'E501',
  COMPAT_VERSION_MISMATCH: 'E502',
} as const;

/**
 * Opciones por defecto para validación
 */
export const DEFAULT_VALIDATION_OPTIONS: InputValidationOptions = {
  strictMode: false,
  validateSyntax: true,
  validateSchema: true,
  validateSemantic: true,
  validateCompleteness: true,
  validateConsistency: true,
  validateCompatibility: false,
  failFast: false,
  maxIssues: 100,
} as const;
