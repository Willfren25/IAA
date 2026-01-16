/**
 * JSON Generator Port - Generación de JSON n8n válido
 *
 * Define el contrato para generar estructuras JSON
 * compatibles con n8n a partir de contratos de prompt.
 */

import type { PromptContract } from '@core/domain/types/prompt.types.js';
import type { N8nWorkflow } from '@core/domain/types/workflow.types.js';
import type { N8nNode, NodeParameters } from '@core/domain/types/node.types.js';
import type { WorkflowConnections } from '@core/domain/types/connection.types.js';

/**
 * Opciones de generación JSON
 */
export interface JsonGenerationOptions {
  /** Versión de n8n objetivo */
  readonly targetN8nVersion?: string;
  /** Incluir metadatos de generación */
  readonly includeMetadata?: boolean;
  /** Minificar JSON de salida */
  readonly minify?: boolean;
  /** Ordenar propiedades alfabéticamente */
  readonly sortProperties?: boolean;
  /** Generar IDs determinísticos */
  readonly deterministicIds?: boolean;
  /** Prefijo para IDs de nodos */
  readonly nodeIdPrefix?: string;
  /** Calcular posiciones de nodos automáticamente */
  readonly autoLayout?: boolean;
  /** Configuración de layout */
  readonly layoutConfig?: LayoutConfig;
  /** Validar JSON generado */
  readonly validateOutput?: boolean;
}

/**
 * Configuración de layout automático
 */
export interface LayoutConfig {
  /** Posición X inicial */
  readonly startX?: number;
  /** Posición Y inicial */
  readonly startY?: number;
  /** Espacio horizontal entre nodos */
  readonly horizontalSpacing?: number;
  /** Espacio vertical entre nodos */
  readonly verticalSpacing?: number;
  /** Dirección del layout */
  readonly direction?: 'horizontal' | 'vertical';
  /** Alineación de nodos */
  readonly alignment?: 'start' | 'center' | 'end';
}

/**
 * Resultado de generación de nodo
 */
export interface NodeGenerationResult {
  readonly success: boolean;
  readonly node?: N8nNode;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Resultado de generación de conexiones
 */
export interface ConnectionGenerationResult {
  readonly success: boolean;
  readonly connections?: WorkflowConnections;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Resultado de generación de workflow
 */
export interface WorkflowGenerationResult {
  readonly success: boolean;
  readonly workflow?: N8nWorkflow;
  readonly errors: readonly GenerationError[];
  readonly warnings: readonly GenerationWarning[];
  readonly stats: GenerationStats;
}

/**
 * Error de generación
 */
export interface GenerationError {
  readonly code: string;
  readonly message: string;
  readonly stepIndex?: number;
  readonly nodeId?: string;
  readonly field?: string;
}

/**
 * Advertencia de generación
 */
export interface GenerationWarning {
  readonly code: string;
  readonly message: string;
  readonly stepIndex?: number;
  readonly nodeId?: string;
  readonly suggestion?: string;
}

/**
 * Estadísticas de generación
 */
export interface GenerationStats {
  readonly totalNodes: number;
  readonly totalConnections: number;
  readonly triggerCount: number;
  readonly actionCount: number;
  readonly conditionCount: number;
  readonly generationTimeMs: number;
}

/**
 * Contexto de generación
 */
export interface GenerationContext {
  readonly options: JsonGenerationOptions;
  readonly contract: PromptContract;
  readonly generatedNodes: Map<string, N8nNode>;
  readonly nodeIdCounter: number;
  readonly errors: GenerationError[];
  readonly warnings: GenerationWarning[];
}

/**
 * Resultado de serialización JSON
 */
export interface JsonSerializationResult {
  readonly success: boolean;
  readonly json?: string;
  readonly errors: readonly string[];
  readonly byteSize?: number;
}

/**
 * Plantilla de nodo
 */
export interface NodeTemplate {
  readonly type: string;
  readonly name: string;
  readonly parameters: NodeParameters;
  readonly credentials?: Record<string, unknown>;
  readonly notes?: string;
}

/**
 * Puerto de Generador JSON
 *
 * Define el contrato para generar JSON n8n válido.
 * Transforma PromptContract a N8nWorkflow.
 */
export interface JsonGeneratorPort {
  /**
   * Genera workflow n8n completo a partir de contrato
   * @param contract - Contrato de prompt parseado
   * @param options - Opciones de generación
   * @returns Resultado con N8nWorkflow o errores
   */
  generate(contract: PromptContract, options?: JsonGenerationOptions): WorkflowGenerationResult;

  /**
   * Genera un nodo n8n a partir de un paso del workflow
   * @param step - Paso del workflow (índice o datos)
   * @param context - Contexto de generación
   * @returns Resultado con N8nNode o errores
   */
  generateNode(
    step: { index: number; action: string; nodeType?: string },
    context: GenerationContext
  ): NodeGenerationResult;

  /**
   * Genera el nodo trigger a partir del contrato
   * @param contract - Contrato de prompt
   * @param options - Opciones de generación
   * @returns Resultado con N8nNode o errores
   */
  generateTrigger(contract: PromptContract, options?: JsonGenerationOptions): NodeGenerationResult;

  /**
   * Genera conexiones entre nodos
   * @param nodes - Array de nodos generados
   * @param contract - Contrato original
   * @returns Resultado con conexiones o errores
   */
  generateConnections(
    nodes: readonly N8nNode[],
    contract: PromptContract
  ): ConnectionGenerationResult;

  /**
   * Serializa workflow a JSON string
   * @param workflow - Workflow n8n
   * @param options - Opciones de serialización
   * @returns JSON string o errores
   */
  serialize(workflow: N8nWorkflow, options?: JsonGenerationOptions): JsonSerializationResult;

  /**
   * Valida workflow generado contra schema
   * @param workflow - Workflow a validar
   * @returns true si es válido
   */
  validateGenerated(workflow: N8nWorkflow): boolean;

  /**
   * Calcula layout de nodos automáticamente
   * @param nodes - Array de nodos
   * @param config - Configuración de layout
   * @returns Nodos con posiciones calculadas
   */
  calculateLayout(nodes: readonly N8nNode[], config?: LayoutConfig): readonly N8nNode[];

  /**
   * Genera ID único para nodo
   * @param prefix - Prefijo opcional
   * @returns ID generado
   */
  generateNodeId(prefix?: string): string;

  /**
   * Obtiene plantilla de nodo por tipo
   * @param nodeType - Tipo de nodo n8n
   * @returns Plantilla o undefined
   */
  getNodeTemplate(nodeType: string): NodeTemplate | undefined;

  /**
   * Registra plantilla de nodo personalizada
   * @param template - Plantilla a registrar
   */
  registerTemplate(template: NodeTemplate): void;

  /**
   * Obtiene todos los tipos de nodos soportados
   * @returns Array de tipos de nodos
   */
  getSupportedNodeTypes(): readonly string[];

  /**
   * Mapea acción de texto a tipo de nodo n8n
   * @param action - Acción en lenguaje natural
   * @returns Tipo de nodo sugerido o undefined
   */
  mapActionToNodeType(action: string): string | undefined;
}

/**
 * Configuración por defecto de generación
 */
export const DEFAULT_GENERATION_OPTIONS: JsonGenerationOptions = {
  targetN8nVersion: '1.0.0',
  includeMetadata: true,
  minify: false,
  sortProperties: false,
  deterministicIds: false,
  autoLayout: true,
  validateOutput: true,
  layoutConfig: {
    startX: 250,
    startY: 300,
    horizontalSpacing: 250,
    verticalSpacing: 100,
    direction: 'horizontal',
    alignment: 'center',
  },
} as const;

/**
 * Códigos de error de generación
 */
export const GENERATION_ERROR_CODES = {
  UNKNOWN_NODE_TYPE: 'GEN001',
  INVALID_PARAMETERS: 'GEN002',
  MISSING_REQUIRED_FIELD: 'GEN003',
  CONNECTION_ERROR: 'GEN004',
  LAYOUT_ERROR: 'GEN005',
  SERIALIZATION_ERROR: 'GEN006',
  VALIDATION_FAILED: 'GEN007',
  TRIGGER_GENERATION_FAILED: 'GEN008',
  TEMPLATE_NOT_FOUND: 'GEN009',
} as const;
