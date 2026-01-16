/**
 * Node DTOs - Data Transfer Objects for Node transformations
 *
 * DTOs para transformar datos entre capas.
 */

import type { NodePosition, NodeParameters, NodeCredentials } from '../types/node.types.js';

/**
 * DTO para crear un nuevo nodo
 */
export interface CreateNodeDTO {
  readonly name: string;
  readonly type: string;
  readonly typeVersion?: number;
  readonly position?: NodePosition;
  readonly parameters?: NodeParameters;
  readonly credentials?: NodeCredentials;
  readonly disabled?: boolean;
  readonly notes?: string;
}

/**
 * DTO para actualizar un nodo existente
 */
export interface UpdateNodeDTO {
  readonly id: string;
  readonly name?: string;
  readonly position?: NodePosition;
  readonly parameters?: Partial<NodeParameters>;
  readonly credentials?: NodeCredentials;
  readonly disabled?: boolean;
  readonly notes?: string;
}

/**
 * DTO de respuesta para un nodo
 */
export interface NodeResponseDTO {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly displayType: string;
  readonly typeVersion: number;
  readonly position: NodePosition;
  readonly isDisabled: boolean;
  readonly isTrigger: boolean;
  readonly hasCredentials: boolean;
  readonly parameterCount: number;
}

/**
 * DTO para validación de nodo
 */
export interface NodeValidationDTO {
  readonly id: string;
  readonly type: string;
  readonly isValid: boolean;
  readonly missingParams: readonly string[];
  readonly invalidParams: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * DTO simplificado de nodo para listados
 */
export interface NodeSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: string;
}
