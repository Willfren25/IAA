/**
 * Connection DTOs - Data Transfer Objects for Connection transformations
 */

import type { ConnectionType } from '../types/connection.types.js';

/**
 * DTO para crear una conexión
 */
export interface CreateConnectionDTO {
  readonly fromNode: string;
  readonly toNode: string;
  readonly fromOutput?: number;
  readonly toInput?: number;
  readonly type?: ConnectionType;
}

/**
 * DTO de respuesta para una conexión
 */
export interface ConnectionResponseDTO {
  readonly from: string;
  readonly to: string;
  readonly fromOutput: number;
  readonly toInput: number;
  readonly type: ConnectionType;
}

/**
 * DTO de análisis de conectividad
 */
export interface ConnectivityAnalysisDTO {
  readonly isFullyConnected: boolean;
  readonly orphanNodes: readonly string[];
  readonly unreachableNodes: readonly string[];
  readonly hasCycles: boolean;
  readonly cycleDescription?: string;
  readonly entryPoints: readonly string[];
  readonly exitPoints: readonly string[];
}

/**
 * DTO para bulk creation de conexiones
 */
export interface BulkConnectionDTO {
  readonly connections: readonly CreateConnectionDTO[];
}
