/**
 * N8N Workflow Types - Tipos para generación de workflows n8n
 */

/**
 * Workflow n8n completo
 */
export interface N8nWorkflow {
  readonly name: string;
  readonly nodes: readonly N8nNode[];
  readonly connections: N8nConnections;
  readonly active: boolean;
  readonly settings: N8nWorkflowSettings;
  readonly versionId?: string;
  readonly meta?: N8nWorkflowMeta;
  readonly tags?: readonly N8nTag[];
  readonly pinData?: Record<string, unknown>;
  readonly staticData?: Record<string, unknown>;
}

/**
 * Nodo n8n
 */
export interface N8nNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeVersion: number;
  readonly position: readonly [number, number];
  readonly parameters: Record<string, unknown>;
  readonly credentials?: Record<string, N8nCredentialRef>;
  readonly webhookId?: string;
  readonly disabled?: boolean;
  readonly notesInFlow?: boolean;
  readonly notes?: string;
}

/**
 * Referencia a credenciales
 */
export interface N8nCredentialRef {
  readonly id: string;
  readonly name: string;
}

/**
 * Conexiones entre nodos (mutable durante construcción)
 */
export interface N8nConnections {
  [nodeName: string]: N8nNodeConnections;
}

/**
 * Conexiones de un nodo específico
 */
export interface N8nNodeConnections {
  readonly main?: readonly N8nConnectionTarget[][];
  readonly ai_tool?: readonly N8nConnectionTarget[][];
  readonly ai_memory?: readonly N8nConnectionTarget[][];
  readonly ai_document?: readonly N8nConnectionTarget[][];
}

/**
 * Destino de conexión
 */
export interface N8nConnectionTarget {
  readonly node: string;
  readonly type: string;
  readonly index: number;
}

/**
 * Configuración del workflow
 */
export interface N8nWorkflowSettings {
  readonly executionOrder?: 'v0' | 'v1';
  readonly saveExecutionProgress?: boolean;
  readonly saveManualExecutions?: boolean;
  readonly saveDataErrorExecution?: 'all' | 'none';
  readonly saveDataSuccessExecution?: 'all' | 'none';
  readonly timeout?: number;
  readonly timezone?: string;
  readonly errorWorkflow?: string;
}

/**
 * Metadata del workflow
 */
export interface N8nWorkflowMeta {
  readonly templateCredsSetupCompleted?: boolean;
  readonly instanceId?: string;
  readonly generatedBy?: string;
  readonly generatedAt?: string;
  readonly n8nVersion?: string;
}

/**
 * Tag de workflow
 */
export interface N8nTag {
  readonly id: string;
  readonly name: string;
}

/**
 * Opciones de generación
 */
export interface N8nGeneratorOptions {
  /** Versión de n8n objetivo */
  readonly n8nVersion?: string;
  /** Auto-layout de nodos */
  readonly autoLayout?: boolean;
  /** Espaciado horizontal entre nodos */
  readonly horizontalSpacing?: number;
  /** Espaciado vertical entre nodos */
  readonly verticalSpacing?: number;
  /** Posición inicial X */
  readonly startX?: number;
  /** Posición inicial Y */
  readonly startY?: number;
  /** Incluir metadata de generación */
  readonly includeMetadata?: boolean;
  /** ID del workflow */
  readonly workflowId?: string;
  /** Nombre del workflow */
  readonly workflowName?: string;
  /** Tags a incluir */
  readonly tags?: readonly string[];
  /** Versión del nodo por defecto */
  readonly defaultNodeVersion?: number;
}

/**
 * Opciones por defecto de generación
 */
export const DEFAULT_GENERATOR_OPTIONS: Required<N8nGeneratorOptions> = {
  n8nVersion: '1.0.0',
  autoLayout: true,
  horizontalSpacing: 250,
  verticalSpacing: 100,
  startX: 250,
  startY: 300,
  includeMetadata: true,
  workflowId: '',
  workflowName: 'Generated Workflow',
  tags: [],
  defaultNodeVersion: 1,
} as const;

/**
 * Resultado de generación
 */
export interface N8nGenerationResult {
  readonly success: boolean;
  readonly workflow?: N8nWorkflow;
  readonly errors?: readonly string[];
  readonly warnings?: readonly string[];
  readonly stats?: N8nGenerationStats;
}

/**
 * Estadísticas de generación
 */
export interface N8nGenerationStats {
  readonly nodesGenerated: number;
  readonly connectionsGenerated: number;
  readonly generationTimeMs: number;
  readonly nodeTypes: readonly string[];
}

/**
 * Mapeo de tipos de nodo comunes
 */
export const N8N_NODE_TYPES = {
  // Triggers
  MANUAL_TRIGGER: 'n8n-nodes-base.manualTrigger',
  WEBHOOK: 'n8n-nodes-base.webhook',
  CRON: 'n8n-nodes-base.cron',
  SCHEDULE: 'n8n-nodes-base.scheduleTrigger',
  
  // Core
  HTTP_REQUEST: 'n8n-nodes-base.httpRequest',
  CODE: 'n8n-nodes-base.code',
  SET: 'n8n-nodes-base.set',
  IF: 'n8n-nodes-base.if',
  SWITCH: 'n8n-nodes-base.switch',
  MERGE: 'n8n-nodes-base.merge',
  SPLIT_IN_BATCHES: 'n8n-nodes-base.splitInBatches',
  WAIT: 'n8n-nodes-base.wait',
  NO_OP: 'n8n-nodes-base.noOp',
  
  // Apps
  GMAIL: 'n8n-nodes-base.gmail',
  SLACK: 'n8n-nodes-base.slack',
  GOOGLE_SHEETS: 'n8n-nodes-base.googleSheets',
  POSTGRES: 'n8n-nodes-base.postgres',
  MYSQL: 'n8n-nodes-base.mySql',
  MONGODB: 'n8n-nodes-base.mongoDb',
  REDIS: 'n8n-nodes-base.redis',
  
  // Respuesta
  RESPOND_TO_WEBHOOK: 'n8n-nodes-base.respondToWebhook',
} as const;

/**
 * Versiones de tipo de nodo por defecto
 */
export const N8N_NODE_VERSIONS: Record<string, number> = {
  [N8N_NODE_TYPES.MANUAL_TRIGGER]: 1,
  [N8N_NODE_TYPES.WEBHOOK]: 2,
  [N8N_NODE_TYPES.CRON]: 1,
  [N8N_NODE_TYPES.SCHEDULE]: 1,
  [N8N_NODE_TYPES.HTTP_REQUEST]: 4,
  [N8N_NODE_TYPES.CODE]: 2,
  [N8N_NODE_TYPES.SET]: 3,
  [N8N_NODE_TYPES.IF]: 2,
  [N8N_NODE_TYPES.SWITCH]: 3,
  [N8N_NODE_TYPES.MERGE]: 3,
  [N8N_NODE_TYPES.GMAIL]: 2,
  [N8N_NODE_TYPES.SLACK]: 2,
  [N8N_NODE_TYPES.RESPOND_TO_WEBHOOK]: 1,
};
