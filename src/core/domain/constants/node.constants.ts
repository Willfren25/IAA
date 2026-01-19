/**
 * Node Constants - Constantes de configuración de nodos n8n
 *
 * Catálogo completo de nodos MVP con sus metadatos.
 */

import {
  NodeTypeEnum,
  TriggerTypeEnum,
  NodeCategoryEnum,
  N8N_NODE_PREFIX,
} from '../enums/node.enums.js';

/**
 * Metadatos de un tipo de nodo
 */
export interface NodeTypeMetadata {
  readonly type: string;
  readonly displayName: string;
  readonly category: NodeCategoryEnum;
  readonly description: string;
  readonly version: number;
  readonly inputs: number;
  readonly outputs: number;
  readonly isTrigger: boolean;
  readonly requiredParams: readonly string[];
  readonly optionalParams: readonly string[];
}

/**
 * Helper para construir el tipo completo de nodo
 */
const buildNodeType = (name: string): string => `${N8N_NODE_PREFIX}.${name}`;

/**
 * Catálogo de nodos Trigger
 */
export const TRIGGER_NODES: Record<TriggerTypeEnum, NodeTypeMetadata> = {
  [TriggerTypeEnum.WEBHOOK]: {
    type: buildNodeType(TriggerTypeEnum.WEBHOOK),
    displayName: 'Webhook',
    category: NodeCategoryEnum.TRIGGER,
    description: 'Starts workflow when webhook is called',
    version: 1,
    inputs: 0,
    outputs: 1,
    isTrigger: true,
    requiredParams: ['httpMethod', 'path'],
    optionalParams: ['responseMode', 'responseData', 'options'],
  },
  [TriggerTypeEnum.CRON]: {
    type: buildNodeType(TriggerTypeEnum.CRON),
    displayName: 'Schedule Trigger',
    category: NodeCategoryEnum.TRIGGER,
    description: 'Starts workflow at scheduled times',
    version: 1,
    inputs: 0,
    outputs: 1,
    isTrigger: true,
    requiredParams: ['rule'],
    optionalParams: [],
  },
  [TriggerTypeEnum.MANUAL]: {
    type: buildNodeType(TriggerTypeEnum.MANUAL),
    displayName: 'Manual Trigger',
    category: NodeCategoryEnum.TRIGGER,
    description: 'Starts workflow manually',
    version: 1,
    inputs: 0,
    outputs: 1,
    isTrigger: true,
    requiredParams: [],
    optionalParams: [],
  },
} as const;

/**
 * Catálogo de nodos Core
 */
export const CORE_NODES: Record<NodeTypeEnum, NodeTypeMetadata> = {
  [NodeTypeEnum.IF]: {
    type: buildNodeType(NodeTypeEnum.IF),
    displayName: 'IF',
    category: NodeCategoryEnum.CORE,
    description: 'Splits flow based on conditions',
    version: 2,
    inputs: 1,
    outputs: 2, // true, false
    isTrigger: false,
    requiredParams: ['conditions'],
    optionalParams: ['combineOperation'],
  },
  [NodeTypeEnum.SWITCH]: {
    type: buildNodeType(NodeTypeEnum.SWITCH),
    displayName: 'Switch',
    category: NodeCategoryEnum.CORE,
    description: 'Routes to different outputs based on value',
    version: 2,
    inputs: 1,
    outputs: 4, // configurable, default 4
    isTrigger: false,
    requiredParams: ['dataType', 'value1', 'rules'],
    optionalParams: ['fallbackOutput'],
  },
  [NodeTypeEnum.MERGE]: {
    type: buildNodeType(NodeTypeEnum.MERGE),
    displayName: 'Merge',
    category: NodeCategoryEnum.CORE,
    description: 'Merges data from multiple inputs',
    version: 2,
    inputs: 2,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['mode'],
    optionalParams: ['join', 'propertyName1', 'propertyName2', 'options'],
  },
  [NodeTypeEnum.NO_OP]: {
    type: buildNodeType(NodeTypeEnum.NO_OP),
    displayName: 'No Operation',
    category: NodeCategoryEnum.UTILITY,
    description: 'Does nothing, passes data through',
    version: 1,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: [],
    optionalParams: [],
  },
  [NodeTypeEnum.SET]: {
    type: buildNodeType(NodeTypeEnum.SET),
    displayName: 'Set',
    category: NodeCategoryEnum.DATA,
    description: 'Sets values on items',
    version: 3,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['values'],
    optionalParams: ['mode', 'duplicateItem', 'options'],
  },
  [NodeTypeEnum.FUNCTION]: {
    type: buildNodeType(NodeTypeEnum.FUNCTION),
    displayName: 'Function',
    category: NodeCategoryEnum.DATA,
    description: 'Runs custom JavaScript code on all items',
    version: 1,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['functionCode'],
    optionalParams: [],
  },
  [NodeTypeEnum.FUNCTION_ITEM]: {
    type: buildNodeType(NodeTypeEnum.FUNCTION_ITEM),
    displayName: 'Function Item',
    category: NodeCategoryEnum.DATA,
    description: 'Runs custom JavaScript code on each item',
    version: 1,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['functionCode'],
    optionalParams: [],
  },
  [NodeTypeEnum.CODE]: {
    type: buildNodeType(NodeTypeEnum.CODE),
    displayName: 'Code',
    category: NodeCategoryEnum.DATA,
    description: 'Runs custom JavaScript or Python code',
    version: 2,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['jsCode'],
    optionalParams: ['mode', 'language'],
  },
  [NodeTypeEnum.HTTP_REQUEST]: {
    type: buildNodeType(NodeTypeEnum.HTTP_REQUEST),
    displayName: 'HTTP Request',
    category: NodeCategoryEnum.INTEGRATION,
    description: 'Makes HTTP requests',
    version: 4,
    inputs: 1,
    outputs: 1,
    isTrigger: false,
    requiredParams: ['url', 'method'],
    optionalParams: [
      'authentication',
      'sendQuery',
      'queryParameters',
      'sendHeaders',
      'headerParameters',
      'sendBody',
      'bodyContentType',
      'body',
      'options',
    ],
  },
} as const;

/**
 * Lista de todos los tipos de trigger soportados
 */
export const SUPPORTED_TRIGGERS = Object.values(TriggerTypeEnum);

/**
 * Lista de todos los tipos de nodos soportados
 */
export const SUPPORTED_NODE_TYPES = Object.values(NodeTypeEnum);

/**
 * Mapa completo de todos los nodos
 */
export const ALL_NODES: Map<string, NodeTypeMetadata> = new Map([
  ...Object.entries(TRIGGER_NODES).map(([_, meta]) => [meta.type, meta] as const),
  ...Object.entries(CORE_NODES).map(([_, meta]) => [meta.type, meta] as const),
]);

/**
 * Verifica si un tipo de nodo es un trigger
 */
export const isTriggerNode = (nodeType: string): boolean => {
  const meta = ALL_NODES.get(nodeType);
  return meta?.isTrigger ?? false;
};

/**
 * Obtiene metadatos de un nodo por tipo
 */
export const getNodeMetadata = (nodeType: string): NodeTypeMetadata | undefined => {
  return ALL_NODES.get(nodeType);
};
