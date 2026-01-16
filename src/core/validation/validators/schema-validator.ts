/**
 * Schema Validator Service
 *
 * Servicio de validación con AJV para JSON Schemas.
 * Implementa el patrón Strategy para diferentes tipos de validación.
 */

import Ajv, { type ValidateFunction, type Options as AjvOptions } from 'ajv';
import addFormats from 'ajv-formats';

import {
  type ValidationResult,
  type ValidatorOptions,
  type FormattedValidationError,
  formatAjvErrors,
  createSuccessResult,
  createFailureResult,
  ValidationSeverity,
} from '../types/index.js';
import {
  n8nWorkflowSchema,
  promptContractSchema,
  nodeParameterSchemas,
  hasNodeParameterSchema,
} from '../schemas/index.js';

/**
 * Tipo de schema disponible
 */
export enum SchemaType {
  N8N_WORKFLOW = 'n8n-workflow',
  PROMPT_CONTRACT = 'prompt-contract',
  NODE_PARAMETERS = 'node-parameters',
}

/**
 * Configuración del validador por defecto
 */
const DEFAULT_AJV_OPTIONS: AjvOptions = {
  allErrors: true,
  verbose: true,
  strict: false,
  validateFormats: true,
};

/**
 * Opciones por defecto del validador
 */
const DEFAULT_VALIDATOR_OPTIONS: Required<ValidatorOptions> = {
  includeWarnings: true,
  removeAdditional: false,
  useDefaults: true,
  coerceTypes: false,
  strict: false,
  allErrors: true,
};

/**
 * Schema Validator - Servicio principal de validación
 */
export class SchemaValidator {
  private readonly ajv: Ajv;
  private readonly validators: Map<string, ValidateFunction>;
  private readonly options: Required<ValidatorOptions>;

  constructor(options: Partial<ValidatorOptions> = {}) {
    this.options = { ...DEFAULT_VALIDATOR_OPTIONS, ...options };

    const ajvOptions: AjvOptions = {
      ...DEFAULT_AJV_OPTIONS,
      allErrors: this.options.allErrors,
      removeAdditional: this.options.removeAdditional,
      useDefaults: this.options.useDefaults,
      coerceTypes: this.options.coerceTypes,
    };

    this.ajv = new Ajv(ajvOptions);
    addFormats(this.ajv);

    this.validators = new Map();
    this.registerSchemas();
  }

  /**
   * Registra los schemas predefinidos
   */
  private registerSchemas(): void {
    // Schema de workflow n8n
    this.validators.set(SchemaType.N8N_WORKFLOW, this.ajv.compile(n8nWorkflowSchema));

    // Schema de contrato de prompt
    this.validators.set(SchemaType.PROMPT_CONTRACT, this.ajv.compile(promptContractSchema));

    // Schemas de parámetros de nodos
    for (const [nodeType, schema] of Object.entries(nodeParameterSchemas)) {
      this.validators.set(`${SchemaType.NODE_PARAMETERS}:${nodeType}`, this.ajv.compile(schema));
    }
  }

  /**
   * Valida datos contra un schema registrado
   */
  validate<T = unknown>(
    schemaType: SchemaType,
    data: unknown,
    nodeType?: string
  ): ValidationResult<T> {
    const schemaKey =
      schemaType === SchemaType.NODE_PARAMETERS && nodeType
        ? `${schemaType}:${nodeType}`
        : schemaType;

    const validator = this.validators.get(schemaKey);

    if (!validator) {
      return createFailureResult([
        {
          path: '/',
          message: `No validator found for schema: ${schemaKey}`,
          severity: ValidationSeverity.ERROR,
          keyword: 'schema',
        },
      ]);
    }

    const isValid = validator(data);

    if (isValid) {
      return createSuccessResult(data as T);
    }

    const errors = formatAjvErrors(validator.errors);
    return createFailureResult(errors);
  }

  /**
   * Valida un workflow n8n completo
   */
  validateWorkflow<T = unknown>(workflow: unknown): ValidationResult<T> {
    return this.validate<T>(SchemaType.N8N_WORKFLOW, workflow);
  }

  /**
   * Valida un contrato de prompt
   */
  validatePromptContract<T = unknown>(contract: unknown): ValidationResult<T> {
    return this.validate<T>(SchemaType.PROMPT_CONTRACT, contract);
  }

  /**
   * Valida parámetros de un nodo específico
   */
  validateNodeParameters<T = unknown>(nodeType: string, parameters: unknown): ValidationResult<T> {
    if (!hasNodeParameterSchema(nodeType)) {
      // Si no hay schema específico, retorna éxito con warning
      return createSuccessResult(parameters as T, [
        {
          path: '/',
          message: `No specific schema for node type: ${nodeType}. Using permissive validation.`,
          severity: ValidationSeverity.WARNING,
          keyword: 'schema',
        },
      ]);
    }

    return this.validate<T>(SchemaType.NODE_PARAMETERS, parameters, nodeType);
  }

  /**
   * Valida un workflow con validación profunda de nodos
   */
  validateWorkflowDeep<T = unknown>(workflow: unknown): ValidationResult<T> {
    // Primero validar estructura del workflow
    const workflowResult = this.validateWorkflow(workflow);

    if (!workflowResult.success) {
      return workflowResult as ValidationResult<T>;
    }

    const typedWorkflow = workflow as {
      nodes?: Array<{ type?: string; parameters?: unknown; name?: string }>;
    };
    const allWarnings: FormattedValidationError[] = [...workflowResult.warnings];
    const nodeErrors: FormattedValidationError[] = [];

    // Validar parámetros de cada nodo
    if (typedWorkflow.nodes && Array.isArray(typedWorkflow.nodes)) {
      for (const [index, node] of typedWorkflow.nodes.entries()) {
        if (node.type && node.parameters) {
          const nodeResult = this.validateNodeParameters(node.type, node.parameters);

          if (!nodeResult.success) {
            // Agregar contexto del nodo a los errores
            const contextualErrors = nodeResult.errors.map((error) => ({
              ...error,
              path: `/nodes/${index}${error.path}`,
              message: `[Node: ${node.name || index}] ${error.message}`,
            }));
            nodeErrors.push(...contextualErrors);
          } else {
            allWarnings.push(...nodeResult.warnings);
          }
        }
      }
    }

    if (nodeErrors.length > 0) {
      return createFailureResult(nodeErrors, allWarnings);
    }

    return createSuccessResult(workflow as T, allWarnings);
  }

  /**
   * Compila y registra un schema personalizado
   */
  registerSchema(name: string, schema: object): void {
    const validator = this.ajv.compile(schema);
    this.validators.set(name, validator);
  }

  /**
   * Verifica si existe un validador para un schema
   */
  hasValidator(schemaType: string): boolean {
    return this.validators.has(schemaType);
  }

  /**
   * Obtiene los schemas registrados
   */
  getRegisteredSchemas(): string[] {
    return Array.from(this.validators.keys());
  }
}

/**
 * Instancia singleton del validador con configuración por defecto
 */
let defaultValidator: SchemaValidator | null = null;

/**
 * Obtiene el validador por defecto (singleton)
 */
export function getDefaultValidator(): SchemaValidator {
  if (!defaultValidator) {
    defaultValidator = new SchemaValidator();
  }
  return defaultValidator;
}

/**
 * Crea un nuevo validador con opciones personalizadas
 */
export function createValidator(options?: Partial<ValidatorOptions>): SchemaValidator {
  return new SchemaValidator(options);
}
