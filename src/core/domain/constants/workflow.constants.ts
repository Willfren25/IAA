/**
 * Workflow Constants - Constantes de configuración de workflows
 */

import { WorkflowComplexityEnum } from '../enums/workflow.enums.js';

/**
 * Versiones de n8n soportadas
 */
export const SUPPORTED_N8N_VERSIONS = ['1.0.0', '1.1.0', '1.2.0'] as const;
export type SupportedN8nVersion = (typeof SUPPORTED_N8N_VERSIONS)[number];

/**
 * Versión por defecto de n8n
 */
export const DEFAULT_N8N_VERSION: SupportedN8nVersion = '1.0.0';

/**
 * Límites del workflow
 */
export const WORKFLOW_LIMITS = {
  MAX_NODES: 100,
  MAX_CONNECTIONS: 500,
  MAX_NAME_LENGTH: 128,
  MAX_NOTE_LENGTH: 1000,
  MAX_FUNCTION_CODE_LENGTH: 50000,
  MIN_POSITION_X: -10000,
  MAX_POSITION_X: 10000,
  MIN_POSITION_Y: -10000,
  MAX_POSITION_Y: 10000,
} as const;

/**
 * Umbrales de complejidad
 */
export const COMPLEXITY_THRESHOLDS = {
  [WorkflowComplexityEnum.SIMPLE]: { min: 1, max: 5 },
  [WorkflowComplexityEnum.MODERATE]: { min: 6, max: 15 },
  [WorkflowComplexityEnum.COMPLEX]: { min: 16, max: Infinity },
} as const;

/**
 * Configuración por defecto del workflow
 */
export const DEFAULT_WORKFLOW_SETTINGS = {
  executionOrder: 'v1',
  saveDataErrorExecution: 'all',
  saveDataSuccessExecution: 'all',
  saveManualExecutions: false,
  saveExecutionProgress: false,
  callerPolicy: 'workflowsFromSameOwner',
} as const;

/**
 * Posición inicial para nodos
 */
export const DEFAULT_NODE_POSITION = {
  x: 250,
  y: 300,
} as const;

/**
 * Espaciado entre nodos (para generación automática)
 */
export const NODE_SPACING = {
  horizontal: 200,
  vertical: 150,
} as const;

/**
 * Timeout por defecto (en milisegundos)
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Número máximo de reintentos por defecto
 */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Tiempo de espera entre reintentos (en milisegundos)
 */
export const DEFAULT_RETRY_WAIT_MS = 1000;
