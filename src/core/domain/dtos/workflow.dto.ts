/**
 * Workflow DTOs - Data Transfer Objects for Workflow transformations
 */

import type { WorkflowSettings } from '../types/workflow.types.js';
import type { CreateNodeDTO, NodeSummaryDTO } from './node.dto.js';
import type { CreateConnectionDTO } from './connection.dto.js';

/**
 * DTO para crear un nuevo workflow
 */
export interface CreateWorkflowDTO {
  readonly name: string;
  readonly nodes?: readonly CreateNodeDTO[];
  readonly connections?: readonly CreateConnectionDTO[];
  readonly settings?: Partial<WorkflowSettings>;
  readonly tags?: readonly string[];
  readonly active?: boolean;
}

/**
 * DTO para actualizar un workflow
 */
export interface UpdateWorkflowDTO {
  readonly id: string;
  readonly name?: string;
  readonly settings?: Partial<WorkflowSettings>;
  readonly tags?: readonly string[];
  readonly active?: boolean;
}

/**
 * DTO de respuesta para un workflow
 */
export interface WorkflowResponseDTO {
  readonly id: string;
  readonly name: string;
  readonly nodeCount: number;
  readonly connectionCount: number;
  readonly isActive: boolean;
  readonly hasTrigger: boolean;
  readonly triggerType?: string;
  readonly complexity: string;
  readonly tags: readonly string[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * DTO completo del workflow con detalles
 */
export interface WorkflowDetailDTO {
  readonly id: string;
  readonly name: string;
  readonly nodes: readonly NodeSummaryDTO[];
  readonly connectionCount: number;
  readonly isActive: boolean;
  readonly settings: WorkflowSettings;
  readonly tags: readonly string[];
  readonly stats: WorkflowStatsDTO;
}

/**
 * DTO de estadísticas del workflow
 */
export interface WorkflowStatsDTO {
  readonly totalNodes: number;
  readonly triggerNodes: number;
  readonly coreNodes: number;
  readonly dataNodes: number;
  readonly integrationNodes: number;
  readonly totalConnections: number;
  readonly orphanNodes: number;
  readonly complexity: string;
}

/**
 * DTO para exportar workflow
 */
export interface ExportWorkflowDTO {
  readonly format: 'json' | 'yaml' | 'pretty-json';
  readonly includeCredentials: boolean;
  readonly includeSettings: boolean;
  readonly includePinnedData: boolean;
}

/**
 * DTO de resultado de generación de workflow
 */
export interface GenerationResultDTO {
  readonly success: boolean;
  readonly workflowJson?: string;
  readonly workflow?: WorkflowResponseDTO;
  readonly validationErrors: readonly ValidationErrorDTO[];
  readonly warnings: readonly string[];
  readonly generationTimeMs: number;
}

/**
 * DTO de error de validación
 */
export interface ValidationErrorDTO {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly nodeName?: string;
  readonly severity: 'error' | 'warning';
}
