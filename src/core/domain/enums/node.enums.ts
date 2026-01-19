/**
 * Node Enums - Enumeraciones de tipos de nodos n8n
 *
 * Catálogo de nodos soportados en el MVP.
 */

/**
 * Tipos de nodos Trigger
 */
export enum TriggerTypeEnum {
  WEBHOOK = 'webhook',
  CRON = 'scheduleTrigger',
  MANUAL = 'manualTrigger',
}

/**
 * Tipos de nodos Core
 */
export enum NodeTypeEnum {
  // Control Flow
  IF = 'if',
  SWITCH = 'switch',
  MERGE = 'merge',
  NO_OP = 'noOp',

  // Data Manipulation
  SET = 'set',
  FUNCTION = 'function',
  FUNCTION_ITEM = 'functionItem',
  CODE = 'code',

  // Integration
  HTTP_REQUEST = 'httpRequest',
}

/**
 * Todas las categorías de nodos
 */
export enum NodeCategoryEnum {
  TRIGGER = 'trigger',
  CORE = 'core',
  DATA = 'data',
  INTEGRATION = 'integration',
  UTILITY = 'utility',
}

/**
 * Estados de un nodo
 */
export enum NodeStateEnum {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

/**
 * Comportamiento en caso de error
 */
export enum OnErrorEnum {
  STOP_WORKFLOW = 'stopWorkflow',
  CONTINUE_REGULAR = 'continueRegularOutput',
  CONTINUE_ERROR = 'continueErrorOutput',
}

/**
 * Prefijo estándar de nodos n8n
 */
export const N8N_NODE_PREFIX = 'n8n-nodes-base' as const;

/**
 * Versiones de nodos soportadas
 */
export enum NodeVersionEnum {
  V1 = 1,
  V2 = 2,
  V3 = 3,
}
