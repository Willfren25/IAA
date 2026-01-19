/**
 * Validation Module - Public API
 *
 * Módulo de validación completo con JSON Schema y AJV.
 */

// Types
export {
  ValidationSeverity,
  type FormattedValidationError,
  type ValidationSuccessResult,
  type ValidationFailureResult,
  type ValidationResult,
  type ValidatorOptions,
  type ValidationContext,
  formatAjvErrors,
  createSuccessResult,
  createFailureResult,
  isValidationSuccess,
  isValidationFailure,
} from './types/index.js';

// Schemas
export {
  // n8n Workflow
  n8nWorkflowSchema,
  n8nNodeSchema,
  nodePositionSchema,
  connectionInfoSchema,
  workflowConnectionsSchema,
  workflowSettingsSchema,
  type N8nWorkflowSchemaType,
  // Node Parameters
  webhookParametersSchema,
  cronParametersSchema,
  httpRequestParametersSchema,
  ifParametersSchema,
  switchParametersSchema,
  setParametersSchema,
  codeParametersSchema,
  mergeParametersSchema,
  nodeParameterSchemas,
  getNodeParameterSchema,
  hasNodeParameterSchema,
  // Prompt Contract
  promptContractSchema,
  metaContractSchema,
  triggerContractSchema,
  workflowContractSchema,
  constraintsContractSchema,
  assumptionsContractSchema,
  type PromptContractSchemaType,
} from './schemas/index.js';

// Validators
export {
  SchemaValidator,
  SchemaType,
  getDefaultValidator,
  createValidator,
  WorkflowValidator,
  createWorkflowValidator,
  validateWorkflow,
  type WorkflowValidatorOptions,
  type WorkflowValidationResult,
} from './validators/index.js';
