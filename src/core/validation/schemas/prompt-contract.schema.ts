/**
 * Prompt Contract JSON Schema
 *
 * Schema para validar el DSL de contratos de prompt del sistema.
 */

/**
 * Schema para @meta del contrato
 */
export const metaContractSchema = {
  type: 'object',
  properties: {
    n8n_version: {
      type: 'string',
      pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
      description: 'Versión de n8n en formato semver',
    },
    strict_mode: {
      type: 'boolean',
      description: 'Si es true, el LLM solo puede usar lo especificado',
    },
  },
  required: ['n8n_version'],
  additionalProperties: false,
} as const;

/**
 * Schema para configuración de webhook
 */
export const webhookTriggerContractSchema = {
  type: 'object',
  properties: {
    type: { const: 'webhook' },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    path: { type: 'string', minLength: 1 },
    authentication: {
      type: 'string',
      enum: ['none', 'basicAuth', 'headerAuth', 'jwtAuth'],
    },
  },
  required: ['type'],
  additionalProperties: true,
} as const;

/**
 * Schema para configuración de cron
 */
export const cronTriggerContractSchema = {
  type: 'object',
  properties: {
    type: { const: 'cron' },
    expression: { type: 'string' },
    timezone: { type: 'string' },
    interval: {
      type: 'object',
      properties: {
        every: { type: 'number', minimum: 1 },
        unit: {
          type: 'string',
          enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
        },
        at: { type: 'string' },
      },
      additionalProperties: true,
    },
  },
  required: ['type'],
  additionalProperties: true,
} as const;

/**
 * Schema para configuración de trigger manual
 */
export const manualTriggerContractSchema = {
  type: 'object',
  properties: {
    type: { const: 'manual' },
  },
  required: ['type'],
  additionalProperties: false,
} as const;

/**
 * Schema para @trigger del contrato
 */
export const triggerContractSchema = {
  oneOf: [webhookTriggerContractSchema, cronTriggerContractSchema, manualTriggerContractSchema],
} as const;

/**
 * Schema para un paso del workflow
 */
export const workflowStepContractSchema = {
  type: 'object',
  properties: {
    description: { type: 'string', minLength: 1 },
    input: {
      oneOf: [{ type: 'string' }, { type: 'object', additionalProperties: true }],
    },
    output: {
      oneOf: [{ type: 'string' }, { type: 'object', additionalProperties: true }],
    },
    required: { type: 'boolean' },
    order: { type: 'integer', minimum: 1 },
  },
  required: ['description'],
  additionalProperties: true,
} as const;

/**
 * Schema para @workflow del contrato
 */
export const workflowContractSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 128 },
    description: { type: 'string', maxLength: 1000 },
    steps: {
      type: 'array',
      items: workflowStepContractSchema,
      minItems: 1,
    },
  },
  required: ['name', 'steps'],
  additionalProperties: true,
} as const;

/**
 * Schema para @constraints del contrato
 */
export const constraintsContractSchema = {
  type: 'object',
  properties: {
    forbidden_nodes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lista de tipos de nodos prohibidos',
    },
    required_nodes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lista de tipos de nodos requeridos',
    },
    max_nodes: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      description: 'Máximo número de nodos permitidos',
    },
    allowed_credentials: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lista de credenciales permitidas',
    },
    max_depth: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
      description: 'Profundidad máxima del workflow',
    },
    allow_loops: {
      type: 'boolean',
      description: 'Si se permiten ciclos en el workflow',
    },
    timeout_ms: {
      type: 'integer',
      minimum: 1000,
      description: 'Timeout máximo de ejecución',
    },
  },
  additionalProperties: true,
} as const;

/**
 * Schema para @assumptions del contrato
 */
export const assumptionsContractSchema = {
  type: 'object',
  properties: {
    input_format: {
      type: 'object',
      additionalProperties: true,
      description: 'Formato esperado de los datos de entrada',
    },
    output_format: {
      type: 'object',
      additionalProperties: true,
      description: 'Formato esperado de los datos de salida',
    },
    environment: {
      type: 'object',
      properties: {
        has_credentials: {
          type: 'array',
          items: { type: 'string' },
        },
        variables: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      additionalProperties: true,
    },
    data_examples: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
      description: 'Ejemplos de datos para el workflow',
    },
  },
  additionalProperties: true,
} as const;

/**
 * Schema completo del Prompt Contract
 */
export const promptContractSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://iaa.dev/schemas/prompt-contract.json',
  title: 'Prompt Contract',
  description: 'JSON Schema for IAA prompt contract DSL validation',
  type: 'object',
  properties: {
    '@meta': metaContractSchema,
    '@trigger': triggerContractSchema,
    '@workflow': workflowContractSchema,
    '@constraints': constraintsContractSchema,
    '@assumptions': assumptionsContractSchema,
  },
  required: ['@meta', '@trigger', '@workflow'],
  additionalProperties: false,
} as const;

/**
 * Tipo TypeScript para el schema del contrato
 */
export type PromptContractSchemaType = typeof promptContractSchema;
