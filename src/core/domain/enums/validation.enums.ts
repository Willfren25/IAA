/**
 * Validation Enums - Enumeraciones para validación
 */

/**
 * Códigos de error de validación
 */
export enum ValidationErrorCodeEnum {
  // Errores de estructura
  MISSING_NODES = 'MISSING_NODES',
  MISSING_CONNECTIONS = 'MISSING_CONNECTIONS',
  MISSING_NAME = 'MISSING_NAME',

  // Errores de trigger
  NO_TRIGGER = 'NO_TRIGGER',
  MULTIPLE_TRIGGERS = 'MULTIPLE_TRIGGERS',
  INVALID_TRIGGER_TYPE = 'INVALID_TRIGGER_TYPE',

  // Errores de nodos
  INVALID_NODE_TYPE = 'INVALID_NODE_TYPE',
  INVALID_NODE_PARAMS = 'INVALID_NODE_PARAMS',
  DUPLICATE_NODE_NAME = 'DUPLICATE_NODE_NAME',
  MISSING_REQUIRED_PARAM = 'MISSING_REQUIRED_PARAM',

  // Errores de conexiones
  ORPHAN_NODE = 'ORPHAN_NODE',
  UNREACHABLE_NODE = 'UNREACHABLE_NODE',
  INVALID_CONNECTION = 'INVALID_CONNECTION',
  CYCLE_DETECTED = 'CYCLE_DETECTED',

  // Errores de flujo
  DEAD_END = 'DEAD_END',
  INFINITE_LOOP = 'INFINITE_LOOP',

  // Errores de schema
  SCHEMA_VIOLATION = 'SCHEMA_VIOLATION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',

  // Errores generales
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Categorías de validación
 */
export enum ValidationCategoryEnum {
  SYNTAX = 'syntax',
  STRUCTURE = 'structure',
  CONNECTIVITY = 'connectivity',
  NODE_SPECIFIC = 'node_specific',
  FLOW = 'flow',
  SCHEMA = 'schema',
}

/**
 * Severidad de errores
 */
export enum SeverityEnum {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}
