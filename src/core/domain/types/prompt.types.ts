/**
 * Prompt Contract Types - DSL Input Types
 *
 * Tipos para el contrato semiestructurado de entrada.
 * DSL: @meta, @trigger, @workflow, @constraints, @assumptions
 */

/**
 * Formato de salida soportado
 */
export type OutputFormat = 'json' | 'yaml' | 'pretty-json';

/**
 * Modo de ejecución
 */
export type ExecutionMode = 'strict' | 'relaxed';

/**
 * Metadatos del prompt (@meta)
 */
export interface PromptMeta {
  readonly n8nVersion: string;
  readonly output: OutputFormat;
  readonly strict: boolean;
}

/**
 * HTTP Methods soportados
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Tipos de trigger soportados
 */
export type PromptTriggerType = 'webhook' | 'cron' | 'manual' | 'custom';

/**
 * Definición del trigger (@trigger)
 */
export interface PromptTrigger {
  readonly type: PromptTriggerType;
  readonly method?: HttpMethod;
  readonly path?: string;
  readonly schedule?: string;
  readonly options?: Record<string, unknown>;
}

/**
 * Paso individual del workflow (@workflow)
 */
export interface WorkflowStep {
  readonly stepNumber: number;
  readonly action: string;
  readonly nodeType?: string;
  readonly parameters?: Record<string, unknown>;
  readonly conditions?: string;
  readonly outputs?: string[];
}

/**
 * Restricciones del workflow (@constraints)
 */
export interface PromptConstraints {
  readonly maxNodes?: number;
  readonly allowedNodeTypes?: string[];
  readonly forbiddenNodeTypes?: string[];
  readonly requireCredentials?: boolean;
  readonly timeoutSeconds?: number;
  readonly customRules?: string[];
}

/**
 * Supuestos del workflow (@assumptions)
 */
export interface PromptAssumptions {
  readonly defaultErrorHandling?: 'stop' | 'continue' | 'retry';
  readonly defaultRetries?: number;
  readonly assumeCredentialsExist?: boolean;
  readonly environmentVariables?: string[];
  readonly customAssumptions?: string[];
}

/**
 * Contrato completo del prompt
 */
export interface PromptContract {
  readonly meta: PromptMeta;
  readonly trigger: PromptTrigger;
  readonly workflow: readonly WorkflowStep[];
  readonly constraints?: PromptConstraints;
  readonly assumptions?: PromptAssumptions;
  readonly rawInput?: string;
}

/**
 * Resultado del parsing del prompt
 */
export interface PromptParseResult {
  readonly success: boolean;
  readonly contract?: PromptContract;
  readonly errors?: PromptParseError[];
  readonly warnings?: string[];
}

/**
 * Error de parsing del prompt
 */
export interface PromptParseError {
  readonly line?: number;
  readonly section?: string;
  readonly message: string;
  readonly code: PromptErrorCode;
}

/**
 * Códigos de error de parsing
 */
export type PromptErrorCode =
  | 'MISSING_META'
  | 'MISSING_TRIGGER'
  | 'MISSING_WORKFLOW'
  | 'INVALID_VERSION'
  | 'INVALID_TRIGGER_TYPE'
  | 'INVALID_STEP'
  | 'AMBIGUOUS_INPUT'
  | 'CONSTRAINT_VIOLATION'
  | 'SYNTAX_ERROR'
  | 'UNKNOWN_SECTION';
