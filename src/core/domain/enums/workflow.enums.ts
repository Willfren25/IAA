/**
 * Workflow Enums - Enumeraciones de workflow n8n
 */

/**
 * Estado de ejecución del workflow
 */
export enum WorkflowExecutionStatusEnum {
  NEW = 'new',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  WAITING = 'waiting',
  CANCELED = 'canceled',
}

/**
 * Orden de ejecución del workflow
 */
export enum ExecutionOrderEnum {
  V0 = 'v0',
  V1 = 'v1',
}

/**
 * Política de guardado de datos
 */
export enum SaveDataPolicyEnum {
  ALL = 'all',
  NONE = 'none',
}

/**
 * Política de llamadas entre workflows
 */
export enum CallerPolicyEnum {
  ANY = 'any',
  NONE = 'none',
  FROM_LIST = 'workflowsFromAList',
  SAME_OWNER = 'workflowsFromSameOwner',
}

/**
 * Niveles de complejidad del workflow
 */
export enum WorkflowComplexityEnum {
  SIMPLE = 'simple', // 1-5 nodos
  MODERATE = 'moderate', // 6-15 nodos
  COMPLEX = 'complex', // 16+ nodos
}
