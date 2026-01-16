/**
 * Validation Schemas - Public API
 *
 * Exporta todos los JSON Schemas para validación.
 */

// n8n Workflow Schemas
export {
  n8nWorkflowSchema,
  n8nNodeSchema,
  nodePositionSchema,
  connectionInfoSchema,
  nodeCredentialsSchema,
  workflowConnectionsSchema,
  workflowSettingsSchema,
  workflowTagSchema,
  workflowMetaSchema,
  type N8nWorkflowSchemaType,
} from './n8n-workflow.schema.js';

// Node Parameter Schemas
export {
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
} from './node-parameters.schema.js';

// Prompt Contract Schemas
export {
  promptContractSchema,
  metaContractSchema,
  triggerContractSchema,
  webhookTriggerContractSchema,
  cronTriggerContractSchema,
  manualTriggerContractSchema,
  workflowContractSchema,
  workflowStepContractSchema,
  constraintsContractSchema,
  assumptionsContractSchema,
  type PromptContractSchemaType,
} from './prompt-contract.schema.js';
