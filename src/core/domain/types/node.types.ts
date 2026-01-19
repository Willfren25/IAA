/**
 * Node Types - n8n Node Domain Types
 *
 * Definición de tipos para nodos n8n.
 * Basado en la especificación oficial de n8n workflow JSON.
 */

import type { NodeTypeEnum, TriggerTypeEnum } from '../enums/node.enums.js';

/**
 * Posición del nodo en el canvas
 */
export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Credenciales referenciadas por un nodo
 */
export interface NodeCredentials {
  readonly [credentialType: string]: {
    readonly id: string;
    readonly name: string;
  };
}

/**
 * Parámetros de un nodo (configuración específica)
 */
export interface NodeParameters {
  readonly [key: string]: unknown;
}

/**
 * Tipo de nodo base - estructura común
 */
export interface BaseNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeVersion: number;
  readonly position: NodePosition;
  readonly disabled?: boolean;
  readonly notes?: string;
  readonly notesInFlow?: boolean;
  readonly retryOnFail?: boolean;
  readonly maxTries?: number;
  readonly waitBetweenTries?: number;
  readonly alwaysOutputData?: boolean;
  readonly executeOnce?: boolean;
  readonly onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
}

/**
 * Nodo completo con parámetros y credenciales
 */
export interface N8nNode extends BaseNode {
  readonly parameters: NodeParameters;
  readonly credentials?: NodeCredentials;
}

/**
 * Nodo de tipo Trigger
 */
export interface TriggerNode extends N8nNode {
  readonly type: `n8n-nodes-base.${TriggerTypeEnum}` | string;
}

/**
 * Nodo de tipo Core (IF, Switch, Merge, etc.)
 */
export interface CoreNode extends N8nNode {
  readonly type: `n8n-nodes-base.${NodeTypeEnum}` | string;
}

/**
 * Webhook Trigger - Configuración específica
 */
export interface WebhookTriggerParameters extends NodeParameters {
  readonly httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  readonly path: string;
  readonly responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
  readonly responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
  readonly options?: {
    readonly rawBody?: boolean;
    readonly responseHeaders?: Record<string, string>;
  };
}

/**
 * Cron Trigger - Configuración específica
 */
export interface CronTriggerParameters extends NodeParameters {
  readonly rule: {
    readonly interval: Array<{
      readonly field:
        | 'cronExpression'
        | 'seconds'
        | 'minutes'
        | 'hours'
        | 'days'
        | 'weeks'
        | 'months';
      readonly expression?: string;
      readonly secondsInterval?: number;
      readonly minutesInterval?: number;
      readonly hoursInterval?: number;
      readonly daysInterval?: number;
      readonly weeksInterval?: number;
      readonly monthsInterval?: number;
      readonly triggerAtHour?: number;
      readonly triggerAtMinute?: number;
      readonly triggerAtDay?: number;
    }>;
  };
}

/**
 * IF Node - Configuración específica
 */
export interface IfNodeParameters extends NodeParameters {
  readonly conditions: {
    readonly boolean?: Array<{
      readonly value1: string | boolean;
      readonly value2?: string | boolean;
      readonly operation?: 'equal' | 'notEqual';
    }>;
    readonly number?: Array<{
      readonly value1: string | number;
      readonly value2: string | number;
      readonly operation:
        | 'equal'
        | 'notEqual'
        | 'larger'
        | 'largerEqual'
        | 'smaller'
        | 'smallerEqual';
    }>;
    readonly string?: Array<{
      readonly value1: string;
      readonly value2: string;
      readonly operation:
        | 'equal'
        | 'notEqual'
        | 'contains'
        | 'notContains'
        | 'startsWith'
        | 'endsWith'
        | 'regex';
    }>;
  };
  readonly combineOperation?: 'all' | 'any';
}

/**
 * Switch Node - Configuración específica
 */
export interface SwitchNodeParameters extends NodeParameters {
  readonly dataType: 'string' | 'number' | 'boolean';
  readonly value1: string;
  readonly fallbackOutput?: 'none' | 'extra';
  readonly rules: {
    readonly rules: Array<{
      readonly value: string | number | boolean;
      readonly output: number;
    }>;
  };
}

/**
 * HTTP Request Node - Configuración específica
 */
export interface HttpRequestNodeParameters extends NodeParameters {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  readonly authentication?: 'none' | 'basicAuth' | 'headerAuth' | 'oAuth1' | 'oAuth2';
  readonly sendQuery?: boolean;
  readonly queryParameters?: {
    readonly parameters: Array<{
      readonly name: string;
      readonly value: string;
    }>;
  };
  readonly sendHeaders?: boolean;
  readonly headerParameters?: {
    readonly parameters: Array<{
      readonly name: string;
      readonly value: string;
    }>;
  };
  readonly sendBody?: boolean;
  readonly bodyContentType?: 'json' | 'form-urlencoded' | 'multipart-form-data' | 'raw';
  readonly body?: string | Record<string, unknown>;
  readonly options?: {
    readonly timeout?: number;
    readonly response?: {
      readonly response?: {
        readonly fullResponse?: boolean;
        readonly neverError?: boolean;
      };
    };
  };
}

/**
 * Set Node - Configuración específica
 */
export interface SetNodeParameters extends NodeParameters {
  readonly mode?: 'manual' | 'raw';
  readonly duplicateItem?: boolean;
  readonly values: {
    readonly string?: Array<{
      readonly name: string;
      readonly value: string;
    }>;
    readonly number?: Array<{
      readonly name: string;
      readonly value: number;
    }>;
    readonly boolean?: Array<{
      readonly name: string;
      readonly value: boolean;
    }>;
  };
  readonly options?: {
    readonly dotNotation?: boolean;
  };
}

/**
 * Function Node - Configuración específica
 */
export interface FunctionNodeParameters extends NodeParameters {
  readonly functionCode: string;
}

/**
 * Merge Node - Configuración específica
 */
export interface MergeNodeParameters extends NodeParameters {
  readonly mode:
    | 'append'
    | 'passThrough'
    | 'wait'
    | 'mergeByIndex'
    | 'mergeByKey'
    | 'multiplex'
    | 'chooseBranch';
  readonly join?: 'inner' | 'left' | 'outer';
  readonly propertyName1?: string;
  readonly propertyName2?: string;
  readonly options?: {
    readonly clashHandling?: {
      readonly values?: {
        readonly resolveClash?: 'addSuffix' | 'preferInput1' | 'preferInput2';
      };
    };
  };
}

/**
 * NoOp Node (No Operation) - Sin parámetros específicos
 */
export type NoOpNodeParameters = NodeParameters;

/**
 * Unión de todos los tipos de parámetros específicos
 */
export type SpecificNodeParameters =
  | WebhookTriggerParameters
  | CronTriggerParameters
  | IfNodeParameters
  | SwitchNodeParameters
  | HttpRequestNodeParameters
  | SetNodeParameters
  | FunctionNodeParameters
  | MergeNodeParameters
  | NoOpNodeParameters;
