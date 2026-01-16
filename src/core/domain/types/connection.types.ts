/**
 * Connection Types - n8n Connection Domain Types
 *
 * Definición de tipos para conexiones entre nodos n8n.
 */

/**
 * Tipo de conexión en n8n
 */
export type ConnectionType = 'main' | 'ai_tool' | 'ai_agent' | 'ai_memory' | 'ai_outputParser';

/**
 * Información de una conexión de salida
 */
export interface ConnectionInfo {
  readonly node: string;
  readonly type: ConnectionType;
  readonly index: number;
}

/**
 * Conexiones desde un nodo específico
 * Mapea nombre del nodo → tipo de conexión → índice de salida → array de destinos
 */
export interface NodeConnections {
  readonly [outputType: string]: Array<ConnectionInfo[]>;
}

/**
 * Mapa completo de conexiones del workflow
 * Mapea nombre del nodo origen → sus conexiones de salida
 */
export interface WorkflowConnections {
  readonly [sourceNodeName: string]: NodeConnections;
}

/**
 * Conexión simplificada para validación
 */
export interface SimpleConnection {
  readonly from: string;
  readonly to: string;
  readonly fromOutput: number;
  readonly toInput: number;
  readonly type: ConnectionType;
}

/**
 * Grafo de conexiones para análisis de flujo
 */
export interface ConnectionGraph {
  readonly nodes: Set<string>;
  readonly edges: Map<string, string[]>;
  readonly reverseEdges: Map<string, string[]>;
}

/**
 * Resultado de análisis de conectividad
 */
export interface ConnectivityAnalysis {
  readonly isConnected: boolean;
  readonly orphanNodes: string[];
  readonly unreachableNodes: string[];
  readonly hasCycles: boolean;
  readonly cycleNodes?: string[];
}
