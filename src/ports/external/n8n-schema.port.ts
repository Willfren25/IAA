/**
 * N8n Schema Port - Acceso a definiciones y schemas de n8n
 *
 * Define el contrato para acceder a metadatos, schemas y
 * definiciones de nodos de n8n.
 */

import { NodeCategoryEnum } from '#core/domain/enums/node.enums.js';

/**
 * Definición de nodo n8n
 */
export interface N8nNodeDefinition {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly group: readonly string[];
  readonly version: number | readonly number[];
  readonly defaults: NodeDefaults;
  readonly inputs: readonly NodeInput[];
  readonly outputs: readonly NodeOutput[];
  readonly properties: readonly NodeProperty[];
  readonly credentials?: readonly NodeCredentialDefinition[];
  readonly documentationUrl?: string;
  readonly codex?: NodeCodex;
}

/**
 * Valores por defecto del nodo
 */
export interface NodeDefaults {
  readonly name: string;
  readonly color?: string;
}

/**
 * Entrada del nodo
 */
export interface NodeInput {
  readonly type: string;
  readonly displayName?: string;
  readonly required?: boolean;
  readonly maxConnections?: number;
}

/**
 * Salida del nodo
 */
export interface NodeOutput {
  readonly type: string;
  readonly displayName?: string;
}

/**
 * Propiedad de nodo
 */
export interface NodeProperty {
  readonly name: string;
  readonly displayName: string;
  readonly type: NodePropertyType;
  readonly default?: unknown;
  readonly description?: string;
  readonly required?: boolean;
  readonly options?: readonly NodePropertyOption[];
  readonly displayOptions?: DisplayOptions;
  readonly typeOptions?: TypeOptions;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly noDataExpression?: boolean;
}

/**
 * Tipo de propiedad
 */
export type NodePropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'collection'
  | 'fixedCollection'
  | 'options'
  | 'multiOptions'
  | 'json'
  | 'dateTime'
  | 'color'
  | 'hidden'
  | 'notice'
  | 'resourceLocator'
  | 'resourceMapper'
  | 'filter'
  | 'assignmentCollection'
  | 'credentials';

/**
 * Opción de propiedad
 */
export interface NodePropertyOption {
  readonly name: string;
  readonly value: string | number | boolean;
  readonly description?: string;
  readonly action?: string;
}

/**
 * Opciones de visualización
 */
export interface DisplayOptions {
  readonly show?: Record<string, readonly unknown[]>;
  readonly hide?: Record<string, readonly unknown[]>;
}

/**
 * Opciones de tipo
 */
export interface TypeOptions {
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly multipleValues?: boolean;
  readonly multipleValueButtonText?: string;
  readonly loadOptionsMethod?: string;
  readonly loadOptionsDependsOn?: readonly string[];
  readonly password?: boolean;
  readonly alwaysOpenEditWindow?: boolean;
  readonly rows?: number;
  readonly editor?: string;
}

/**
 * Definición de credencial del nodo
 */
export interface NodeCredentialDefinition {
  readonly name: string;
  readonly required?: boolean;
  readonly displayOptions?: DisplayOptions;
}

/**
 * Codex del nodo (metadatos de búsqueda)
 */
export interface NodeCodex {
  readonly categories?: readonly string[];
  readonly subcategories?: Record<string, readonly string[]>;
  readonly alias?: readonly string[];
  readonly resources?: {
    readonly primaryDocumentation?: readonly { readonly url: string }[];
    readonly credentialDocumentation?: readonly { readonly url: string }[];
  };
}

/**
 * Definición de credencial n8n
 */
export interface N8nCredentialDefinition {
  readonly name: string;
  readonly displayName: string;
  readonly documentationUrl?: string;
  readonly properties: readonly CredentialProperty[];
  readonly authenticate?: CredentialAuthConfig;
  readonly test?: CredentialTestConfig;
}

/**
 * Propiedad de credencial
 */
export interface CredentialProperty {
  readonly name: string;
  readonly displayName: string;
  readonly type: NodePropertyType;
  readonly default?: unknown;
  readonly required?: boolean;
  readonly description?: string;
  readonly placeholder?: string;
}

/**
 * Configuración de autenticación
 */
export interface CredentialAuthConfig {
  readonly type: 'generic' | 'custom';
  readonly properties?: Record<string, unknown>;
}

/**
 * Configuración de test de credencial
 */
export interface CredentialTestConfig {
  readonly request: {
    readonly baseURL?: string;
    readonly url: string;
    readonly method?: string;
  };
}

/**
 * Información de categoría de nodos
 */
export interface NodeCategoryInfo {
  readonly name: NodeCategoryEnum;
  readonly displayName: string;
  readonly description: string;
  readonly nodes: readonly string[];
  readonly icon?: string;
}

/**
 * Resultado de búsqueda de nodos
 */
export interface NodeSearchResult {
  readonly nodes: readonly N8nNodeDefinition[];
  readonly totalCount: number;
  readonly categories: readonly NodeCategoryInfo[];
  readonly searchTimeMs: number;
}

/**
 * Filtros de búsqueda de nodos
 */
export interface NodeSearchFilters {
  readonly category?: NodeCategoryEnum;
  readonly group?: string;
  readonly hasCredentials?: boolean;
  readonly isTrigger?: boolean;
  readonly query?: string;
  readonly version?: string;
}

/**
 * Compatibilidad de versión
 */
export interface VersionCompatibility {
  readonly nodeType: string;
  readonly minVersion: string;
  readonly maxVersion?: string;
  readonly deprecatedIn?: string;
  readonly removedIn?: string;
  readonly replacedBy?: string;
}

/**
 * Resultado de validación de schema
 */
export interface SchemaValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly SchemaError[];
  readonly warnings: readonly SchemaWarning[];
}

/**
 * Error de schema
 */
export interface SchemaError {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
  readonly params?: Record<string, unknown>;
}

/**
 * Advertencia de schema
 */
export interface SchemaWarning {
  readonly path: string;
  readonly message: string;
  readonly suggestion?: string;
}

/**
 * Estadísticas del registro de nodos
 */
export interface NodeRegistryStats {
  readonly totalNodes: number;
  readonly totalTriggers: number;
  readonly totalActions: number;
  readonly byCategory: Record<string, number>;
  readonly byGroup: Record<string, number>;
  readonly lastUpdated: Date;
}

/**
 * Puerto de Schema N8n
 *
 * Define el contrato para acceder a definiciones de n8n.
 * Provee metadatos de nodos, credenciales y schemas.
 */
export interface N8nSchemaPort {
  /**
   * Obtiene definición de un nodo por tipo
   * @param nodeType - Tipo de nodo (ej: 'n8n-nodes-base.httpRequest')
   * @returns Definición del nodo o undefined
   */
  getNodeDefinition(nodeType: string): N8nNodeDefinition | undefined;

  /**
   * Obtiene todas las definiciones de nodos
   * @returns Array de definiciones
   */
  getAllNodeDefinitions(): readonly N8nNodeDefinition[];

  /**
   * Busca nodos por filtros
   * @param filters - Filtros de búsqueda
   * @returns Resultado de búsqueda
   */
  searchNodes(filters: NodeSearchFilters): NodeSearchResult;

  /**
   * Obtiene nodos por categoría
   * @param category - Categoría de nodos
   * @returns Array de definiciones
   */
  getNodesByCategory(category: NodeCategoryEnum): readonly N8nNodeDefinition[];

  /**
   * Obtiene nodos trigger
   * @returns Array de triggers
   */
  getTriggerNodes(): readonly N8nNodeDefinition[];

  /**
   * Verifica si un tipo de nodo existe
   * @param nodeType - Tipo de nodo
   * @returns true si existe
   */
  hasNode(nodeType: string): boolean;

  /**
   * Obtiene definición de credencial
   * @param credentialType - Tipo de credencial
   * @returns Definición o undefined
   */
  getCredentialDefinition(credentialType: string): N8nCredentialDefinition | undefined;

  /**
   * Obtiene credenciales requeridas por un nodo
   * @param nodeType - Tipo de nodo
   * @returns Array de tipos de credencial
   */
  getRequiredCredentials(nodeType: string): readonly string[];

  /**
   * Valida parámetros de nodo contra schema
   * @param nodeType - Tipo de nodo
   * @param parameters - Parámetros a validar
   * @returns Resultado de validación
   */
  validateNodeParameters(
    nodeType: string,
    parameters: Record<string, unknown>
  ): SchemaValidationResult;

  /**
   * Obtiene schema JSON de workflow n8n
   * @param version - Versión de n8n
   * @returns Schema JSON
   */
  getWorkflowSchema(version?: string): Record<string, unknown>;

  /**
   * Verifica compatibilidad de versión
   * @param nodeType - Tipo de nodo
   * @param n8nVersion - Versión de n8n
   * @returns Información de compatibilidad
   */
  checkVersionCompatibility(nodeType: string, n8nVersion: string): VersionCompatibility;

  /**
   * Obtiene información de todas las categorías
   * @returns Array de categorías
   */
  getCategories(): readonly NodeCategoryInfo[];

  /**
   * Obtiene estadísticas del registro
   * @returns Estadísticas
   */
  getStats(): NodeRegistryStats;

  /**
   * Recarga definiciones desde fuente
   * @returns Número de nodos cargados
   */
  reload(): Promise<number>;

  /**
   * Registra definición de nodo personalizado
   * @param definition - Definición a registrar
   */
  registerCustomNode(definition: N8nNodeDefinition): void;

  /**
   * Obtiene valores por defecto de parámetros
   * @param nodeType - Tipo de nodo
   * @returns Parámetros con valores por defecto
   */
  getDefaultParameters(nodeType: string): Record<string, unknown>;

  /**
   * Sugiere nodos basado en descripción
   * @param description - Descripción de la acción deseada
   * @param limit - Máximo de sugerencias
   * @returns Array de sugerencias
   */
  suggestNodes(
    description: string,
    limit?: number
  ): readonly { nodeType: string; confidence: number; reason: string }[];

  /**
   * Obtiene documentación de un nodo
   * @param nodeType - Tipo de nodo
   * @returns URL de documentación o undefined
   */
  getNodeDocumentation(nodeType: string): string | undefined;

  /**
   * Mapea alias a tipo de nodo real
   * @param alias - Alias del nodo
   * @returns Tipo de nodo o undefined
   */
  resolveAlias(alias: string): string | undefined;
}

/**
 * Tipos de nodos comunes
 */
export const COMMON_NODE_TYPES = {
  // Triggers
  WEBHOOK: 'n8n-nodes-base.webhook',
  CRON: 'n8n-nodes-base.cron',
  SCHEDULE_TRIGGER: 'n8n-nodes-base.scheduleTrigger',
  MANUAL_TRIGGER: 'n8n-nodes-base.manualTrigger',

  // HTTP
  HTTP_REQUEST: 'n8n-nodes-base.httpRequest',

  // Data
  SET: 'n8n-nodes-base.set',
  CODE: 'n8n-nodes-base.code',
  FUNCTION: 'n8n-nodes-base.function',
  FUNCTION_ITEM: 'n8n-nodes-base.functionItem',

  // Flow
  IF: 'n8n-nodes-base.if',
  SWITCH: 'n8n-nodes-base.switch',
  MERGE: 'n8n-nodes-base.merge',
  SPLIT_IN_BATCHES: 'n8n-nodes-base.splitInBatches',
  NO_OP: 'n8n-nodes-base.noOp',

  // External Services
  SLACK: 'n8n-nodes-base.slack',
  GMAIL: 'n8n-nodes-base.gmail',
  GOOGLE_SHEETS: 'n8n-nodes-base.googleSheets',
  AIRTABLE: 'n8n-nodes-base.airtable',
  NOTION: 'n8n-nodes-base.notion',
  POSTGRES: 'n8n-nodes-base.postgres',
  MYSQL: 'n8n-nodes-base.mySql',
  MONGODB: 'n8n-nodes-base.mongoDb',
} as const;

/**
 * Grupos de nodos
 */
export const NODE_GROUPS = {
  TRIGGER: 'trigger',
  INPUT: 'input',
  OUTPUT: 'output',
  TRANSFORM: 'transform',
  FLOW: 'flow',
} as const;
