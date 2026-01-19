/**
 * Validation Result Types
 *
 * Tipos para resultados de validación con AJV.
 */

import type { ErrorObject } from 'ajv';

/**
 * Severidad del error de validación
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Error de validación formateado
 */
export interface FormattedValidationError {
  /** Ruta JSON al campo con error */
  path: string;
  /** Mensaje de error legible */
  message: string;
  /** Severidad del error */
  severity: ValidationSeverity;
  /** Valor que causó el error */
  value?: unknown;
  /** Palabra clave del schema que falló */
  keyword: string;
  /** Parámetros adicionales del error */
  params?: Record<string, unknown>;
}

/**
 * Resultado de validación exitosa
 */
export interface ValidationSuccessResult<T = unknown> {
  success: true;
  data: T;
  warnings: FormattedValidationError[];
}

/**
 * Resultado de validación fallida
 */
export interface ValidationFailureResult {
  success: false;
  errors: FormattedValidationError[];
  warnings: FormattedValidationError[];
}

/**
 * Resultado de validación
 */
export type ValidationResult<T = unknown> = ValidationSuccessResult<T> | ValidationFailureResult;

/**
 * Opciones para el validador
 */
export interface ValidatorOptions {
  /** Incluir warnings además de errores */
  includeWarnings?: boolean;
  /** Eliminar propiedades adicionales */
  removeAdditional?: boolean;
  /** Usar valores por defecto del schema */
  useDefaults?: boolean;
  /** Coercer tipos automáticamente */
  coerceTypes?: boolean;
  /** Permitir formato estricto */
  strict?: boolean;
  /** Validar todos los errores, no solo el primero */
  allErrors?: boolean;
}

/**
 * Contexto de validación
 */
export interface ValidationContext {
  /** Versión de n8n objetivo */
  n8nVersion?: string;
  /** Si es modo estricto */
  strictMode?: boolean;
  /** Ruta base para los errores */
  basePath?: string;
}

/**
 * Formatea errores de AJV a formato legible
 */
export function formatAjvErrors(
  errors: ErrorObject[] | null | undefined,
  basePath: string = ''
): FormattedValidationError[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((error) => {
    const path = basePath ? `${basePath}${error.instancePath}` : error.instancePath || '/';

    let message = error.message || 'Unknown validation error';
    const params = error.params as Record<string, unknown> | undefined;

    // Mejorar mensajes para errores comunes
    switch (error.keyword) {
      case 'required':
        message = `Missing required property: ${params?.['missingProperty']}`;
        break;
      case 'type':
        message = `Expected type "${params?.['type']}" but got "${typeof error.data}"`;
        break;
      case 'enum':
        message = `Value must be one of: ${(params?.['allowedValues'] as string[])?.join(', ')}`;
        break;
      case 'minLength':
        message = `String must be at least ${params?.['limit']} characters`;
        break;
      case 'maxLength':
        message = `String must not exceed ${params?.['limit']} characters`;
        break;
      case 'minimum':
        message = `Value must be >= ${params?.['limit']}`;
        break;
      case 'maximum':
        message = `Value must be <= ${params?.['limit']}`;
        break;
      case 'additionalProperties':
        message = `Unknown property: ${params?.['additionalProperty']}`;
        break;
      case 'pattern':
        message = `Value does not match pattern: ${params?.['pattern']}`;
        break;
      case 'format':
        message = `Invalid format, expected: ${params?.['format']}`;
        break;
    }

    return {
      path,
      message,
      severity: ValidationSeverity.ERROR,
      value: error.data,
      keyword: error.keyword,
      params: params as Record<string, unknown>,
    };
  });
}

/**
 * Crea resultado de validación exitosa
 */
export function createSuccessResult<T>(
  data: T,
  warnings: FormattedValidationError[] = []
): ValidationSuccessResult<T> {
  return {
    success: true,
    data,
    warnings,
  };
}

/**
 * Crea resultado de validación fallida
 */
export function createFailureResult(
  errors: FormattedValidationError[],
  warnings: FormattedValidationError[] = []
): ValidationFailureResult {
  return {
    success: false,
    errors,
    warnings,
  };
}

/**
 * Verifica si el resultado es exitoso
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccessResult<T> {
  return result.success === true;
}

/**
 * Verifica si el resultado es fallido
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationFailureResult {
  return result.success === false;
}
