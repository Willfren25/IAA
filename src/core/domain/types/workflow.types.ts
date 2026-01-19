/**
 * Workflow Types - n8n Workflow Domain Types
 *
 * Definición de tipos para workflows completos de n8n.
 * Representa la estructura raíz del JSON exportable.
 */

import type { N8nNode } from './node.types.js';
import type { WorkflowConnections } from './connection.types.js';

/**
 * Metadatos del workflow
 */
export interface WorkflowMeta {
  readonly instanceId?: string;
  readonly templateId?: string;
  readonly templateCredsSetupCompleted?: boolean;
}

/**
 * Configuración de ejecución del workflow
 */
export interface WorkflowSettings {
  readonly executionOrder?: 'v0' | 'v1';
  readonly saveDataErrorExecution?: 'all' | 'none';
  readonly saveDataSuccessExecution?: 'all' | 'none';
  readonly saveManualExecutions?: boolean;
  readonly saveExecutionProgress?: boolean;
  readonly callerPolicy?: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
  readonly callerIds?: string;
  readonly timezone?: string;
  readonly errorWorkflow?: string;
}

/**
 * Datos estáticos del workflow (opcional)
 */
export interface WorkflowStaticData {
  readonly [key: string]: unknown;
}

/**
 * Tags del workflow
 */
export interface WorkflowTag {
  readonly id: string;
  readonly name: string;
}

/**
 * Pieza de datos pinneada para testing
 */
export interface PinnedData {
  readonly [nodeName: string]: Array<{
    readonly json: Record<string, unknown>;
    readonly binary?: Record<string, unknown>;
  }>;
}

/**
 * Workflow completo de n8n - Estructura raíz del JSON
 */
export interface N8nWorkflow {
  readonly id?: string;
  readonly name: string;
  readonly nodes: readonly N8nNode[];
  readonly connections: WorkflowConnections;
  readonly active?: boolean;
  readonly settings?: WorkflowSettings;
  readonly staticData?: WorkflowStaticData;
  readonly tags?: readonly WorkflowTag[];
  readonly pinnedData?: PinnedData;
  readonly meta?: WorkflowMeta;
  readonly versionId?: string;
}

/**
 * Workflow con información de versión para importación/exportación
 */
export interface ExportableWorkflow extends N8nWorkflow {
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Respuesta de creación de workflow
 */
export interface WorkflowCreationResult {
  readonly success: boolean;
  readonly workflow?: N8nWorkflow;
  readonly errors?: WorkflowValidationError[];
  readonly warnings?: string[];
}

/**
 * Error de validación de workflow
 */
export interface WorkflowValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly nodeName?: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Estadísticas del workflow
 */
export interface WorkflowStats {
  readonly nodeCount: number;
  readonly connectionCount: number;
  readonly triggerCount: number;
  readonly hasCredentials: boolean;
  readonly nodeTypes: string[];
  readonly complexity: 'simple' | 'moderate' | 'complex';
}
