/**
 * n8n Workflow JSON Schema
 *
 * Schema completo para validar workflows n8n con AJV.
 */

/**
 * Schema para posición de nodo
 */
export const nodePositionSchema = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
  },
  required: ['x', 'y'],
  additionalProperties: false,
} as const;

/**
 * Schema para información de conexión
 */
export const connectionInfoSchema = {
  type: 'object',
  properties: {
    node: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['main', 'ai_tool', 'ai_agent', 'ai_memory', 'ai_outputParser'] },
    index: { type: 'integer', minimum: 0 },
  },
  required: ['node', 'type', 'index'],
  additionalProperties: false,
} as const;

/**
 * Schema para credenciales de nodo
 */
export const nodeCredentialsSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
    },
    required: ['id', 'name'],
    additionalProperties: false,
  },
} as const;

/**
 * Schema para un nodo n8n
 */
export const n8nNodeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1, maxLength: 128 },
    type: { type: 'string', minLength: 1 },
    typeVersion: { type: 'number', minimum: 1 },
    position: nodePositionSchema,
    parameters: { type: 'object', additionalProperties: true },
    credentials: nodeCredentialsSchema,
    disabled: { type: 'boolean' },
    notes: { type: 'string', maxLength: 1000 },
    notesInFlow: { type: 'boolean' },
    retryOnFail: { type: 'boolean' },
    maxTries: { type: 'integer', minimum: 1, maximum: 10 },
    waitBetweenTries: { type: 'integer', minimum: 0 },
    alwaysOutputData: { type: 'boolean' },
    executeOnce: { type: 'boolean' },
    onError: {
      type: 'string',
      enum: ['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'],
    },
  },
  required: ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
  additionalProperties: false,
} as const;

/**
 * Schema para conexiones del workflow
 */
export const workflowConnectionsSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'array',
        items: connectionInfoSchema,
      },
    },
  },
} as const;

/**
 * Schema para configuración del workflow
 */
export const workflowSettingsSchema = {
  type: 'object',
  properties: {
    executionOrder: { type: 'string', enum: ['v0', 'v1'] },
    saveDataErrorExecution: { type: 'string', enum: ['all', 'none'] },
    saveDataSuccessExecution: { type: 'string', enum: ['all', 'none'] },
    saveManualExecutions: { type: 'boolean' },
    saveExecutionProgress: { type: 'boolean' },
    callerPolicy: {
      type: 'string',
      enum: ['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'],
    },
    callerIds: { type: 'string' },
    timezone: { type: 'string' },
    errorWorkflow: { type: 'string' },
  },
  additionalProperties: false,
} as const;

/**
 * Schema para tags del workflow
 */
export const workflowTagSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
  additionalProperties: false,
} as const;

/**
 * Schema para metadata del workflow
 */
export const workflowMetaSchema = {
  type: 'object',
  properties: {
    instanceId: { type: 'string' },
    templateId: { type: 'string' },
    templateCredsSetupCompleted: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

/**
 * Schema completo del workflow n8n
 */
export const n8nWorkflowSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://iaa.dev/schemas/n8n-workflow.json',
  title: 'n8n Workflow',
  description: 'JSON Schema for n8n workflow validation',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', minLength: 1, maxLength: 128 },
    nodes: {
      type: 'array',
      items: n8nNodeSchema,
      minItems: 0,
    },
    connections: workflowConnectionsSchema,
    active: { type: 'boolean' },
    settings: workflowSettingsSchema,
    staticData: { type: 'object', additionalProperties: true },
    tags: {
      type: 'array',
      items: workflowTagSchema,
    },
    pinnedData: { type: 'object', additionalProperties: true },
    meta: workflowMetaSchema,
    versionId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['name', 'nodes', 'connections'],
  additionalProperties: false,
} as const;

/**
 * Tipo TypeScript para el schema del workflow
 */
export type N8nWorkflowSchemaType = typeof n8nWorkflowSchema;
