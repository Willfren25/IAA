/**
 * N8N JSON Generator - Generador de workflows n8n
 * 
 * Mapea PromptContract a estructura JSON n8n válida.
 */

import type { JsonGenerationOptions } from '#ports/output/json-generator.port.js';

import type {
  PromptContract,
  WorkflowStep,
  PromptTrigger,
} from '#core/domain/types/prompt.types.js';

import type {
  N8nWorkflow,
  N8nNode,
  N8nConnections,
  N8nConnectionTarget,
  N8nGeneratorOptions,
  N8nGenerationStats,
} from './types.js';

import {
  DEFAULT_GENERATOR_OPTIONS,
  N8N_NODE_TYPES,
  N8N_NODE_VERSIONS,
} from './types.js';

/**
 * Resultado de generación simplificado para uso externo
 */
export interface GeneratorResult {
  success: boolean;
  workflow?: N8nWorkflow;
  errors?: string[];
  warnings?: string[];
  stats?: {
    nodesGenerated: number;
    connectionsGenerated: number;
    generationTimeMs: number;
  };
}

/**
 * Generador JSON n8n
 * 
 * Esta clase genera workflows n8n a partir de PromptContract.
 * No implementa directamente JsonGeneratorPort ya que provee
 * una interfaz simplificada optimizada para el caso de uso actual.
 */
export class N8nJsonGenerator {
  private options: Required<N8nGeneratorOptions>;
  private nodeIdCounter = 0;

  constructor(options: Partial<N8nGeneratorOptions> = {}) {
    this.options = { ...DEFAULT_GENERATOR_OPTIONS, ...options };
  }

  /**
   * Genera workflow n8n desde PromptContract
   */
  generate(contract: PromptContract, options?: Partial<JsonGenerationOptions>): GeneratorResult {
    const startTime = performance.now();
    this.nodeIdCounter = 0;
    
    const genOptions = {
      ...this.options,
      ...options,
      n8nVersion: contract.meta.n8nVersion,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Generar nodo trigger
      const triggerNode = this.generateTriggerNode(contract.trigger, genOptions);
      const nodes: N8nNode[] = [triggerNode];

      // 2. Generar nodos de workflow
      const workflowNodes = this.generateWorkflowNodes(
        contract.workflow,
        triggerNode,
        genOptions
      );
      nodes.push(...workflowNodes);

      // 3. Aplicar auto-layout si está habilitado
      const layoutedNodes = genOptions.autoLayout
        ? this.applyAutoLayout(nodes, genOptions)
        : nodes;

      // 4. Generar conexiones
      const connections = this.generateConnections(layoutedNodes);

      // 5. Construir workflow completo
      const workflow: N8nWorkflow = {
        name: genOptions.workflowName || 'Generated Workflow',
        nodes: layoutedNodes,
        connections,
        active: false,
        settings: {
          executionOrder: 'v1',
        },
        ...(genOptions.includeMetadata && {
          versionId: this.generateVersionId(),
          meta: {
            templateCredsSetupCompleted: true,
            generatedBy: '@iaa/n8n-workflow-generator',
            generatedAt: new Date().toISOString(),
            n8nVersion: genOptions.n8nVersion,
          },
        }),
        tags: genOptions.tags.map((name, index) => ({
          id: `tag-${index}`,
          name,
        })),
      };

      const stats: N8nGenerationStats = {
        nodesGenerated: layoutedNodes.length,
        connectionsGenerated: Object.keys(connections).length,
        generationTimeMs: performance.now() - startTime,
        nodeTypes: [...new Set(layoutedNodes.map(n => n.type))],
      };

      return {
        success: true,
        workflow,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        stats: {
          nodesGenerated: stats.nodesGenerated,
          connectionsGenerated: stats.connectionsGenerated,
          generationTimeMs: stats.generationTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown generation error'],
      };
    }
  }

  /**
   * Genera nodo trigger según configuración
   */
  private generateTriggerNode(
    trigger: PromptTrigger,
    options: Required<N8nGeneratorOptions>
  ): N8nNode {
    const id = this.generateNodeId();
    
    switch (trigger.type) {
      case 'webhook':
        return {
          id,
          name: 'Webhook',
          type: N8N_NODE_TYPES.WEBHOOK,
          typeVersion: N8N_NODE_VERSIONS[N8N_NODE_TYPES.WEBHOOK] ?? 2,
          position: [options.startX, options.startY],
          parameters: {
            httpMethod: trigger.method ?? 'POST',
            path: trigger.path ?? this.generateWebhookPath(),
            responseMode: 'onReceived',
            responseData: 'allEntries',
            ...(trigger.options ?? {}),
          },
        };

      case 'cron':
        return {
          id,
          name: 'Schedule Trigger',
          type: N8N_NODE_TYPES.SCHEDULE,
          typeVersion: N8N_NODE_VERSIONS[N8N_NODE_TYPES.SCHEDULE] ?? 1,
          position: [options.startX, options.startY],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                expression: trigger.schedule ?? '0 * * * *',
              }],
            },
          },
        };

      case 'manual':
      default:
        return {
          id,
          name: 'Manual Trigger',
          type: N8N_NODE_TYPES.MANUAL_TRIGGER,
          typeVersion: N8N_NODE_VERSIONS[N8N_NODE_TYPES.MANUAL_TRIGGER] ?? 1,
          position: [options.startX, options.startY],
          parameters: {},
        };
    }
  }

  /**
   * Genera nodos de workflow desde pasos
   */
  private generateWorkflowNodes(
    steps: readonly WorkflowStep[],
    triggerNode: N8nNode,
    options: Required<N8nGeneratorOptions>
  ): N8nNode[] {
    const nodes: N8nNode[] = [];
    let previousNode = triggerNode;

    for (const step of steps) {
      const node = this.generateNodeFromStep(step, previousNode, options);
      nodes.push(node);
      previousNode = node;
    }

    return nodes;
  }

  /**
   * Genera nodo desde un paso de workflow
   */
  private generateNodeFromStep(
    step: WorkflowStep,
    _previousNode: N8nNode,
    options: Required<N8nGeneratorOptions>
  ): N8nNode {
    const id = this.generateNodeId();
    const nodeType = this.detectNodeType(step);
    const nodeName = this.generateNodeName(step, nodeType);
    const parameters = this.generateNodeParameters(step, nodeType);

    return {
      id,
      name: nodeName,
      type: nodeType,
      typeVersion: N8N_NODE_VERSIONS[nodeType] ?? options.defaultNodeVersion,
      position: [0, 0], // Se calcula en auto-layout
      parameters,
    };
  }

  /**
   * Detecta el tipo de nodo basado en la acción
   */
  private detectNodeType(step: WorkflowStep): string {
    // Si ya tiene nodeType definido, usarlo
    if (step.nodeType) {
      return step.nodeType;
    }

    const action = step.action.toLowerCase();

    // HTTP/API
    if (action.includes('http') || action.includes('api') || 
        action.includes('request') || action.includes('llamar') ||
        action.includes('fetch') || action.includes('get') ||
        action.includes('post')) {
      return N8N_NODE_TYPES.HTTP_REQUEST;
    }

    // Condicionales
    if (action.includes('si ') || action.includes('if ') ||
        action.includes('cuando') || action.includes('condition') ||
        step.conditions) {
      return N8N_NODE_TYPES.IF;
    }

    // Switch
    if (action.includes('switch') || action.includes('casos') ||
        action.includes('según')) {
      return N8N_NODE_TYPES.SWITCH;
    }

    // Email
    if (action.includes('email') || action.includes('correo') ||
        action.includes('gmail') || action.includes('mail')) {
      return N8N_NODE_TYPES.GMAIL;
    }

    // Slack
    if (action.includes('slack') || action.includes('notificar') ||
        action.includes('mensaje')) {
      return N8N_NODE_TYPES.SLACK;
    }

    // Base de datos
    if (action.includes('postgres') || action.includes('database') ||
        action.includes('sql') || action.includes('base de datos')) {
      return N8N_NODE_TYPES.POSTGRES;
    }

    // Google Sheets
    if (action.includes('sheet') || action.includes('spreadsheet') ||
        action.includes('hoja de cálculo')) {
      return N8N_NODE_TYPES.GOOGLE_SHEETS;
    }

    // Código
    if (action.includes('codigo') || action.includes('code') ||
        action.includes('javascript') || action.includes('script')) {
      return N8N_NODE_TYPES.CODE;
    }

    // Transformar/Set
    if (action.includes('transformar') || action.includes('transform') ||
        action.includes('set') || action.includes('mapear') ||
        action.includes('convertir') || action.includes('asignar')) {
      return N8N_NODE_TYPES.SET;
    }

    // Merge
    if (action.includes('merge') || action.includes('combinar') ||
        action.includes('unir')) {
      return N8N_NODE_TYPES.MERGE;
    }

    // Wait
    if (action.includes('esperar') || action.includes('wait') ||
        action.includes('delay') || action.includes('pausa')) {
      return N8N_NODE_TYPES.WAIT;
    }

    // Responder webhook
    if (action.includes('responder') || action.includes('respond') ||
        action.includes('retornar') || action.includes('return')) {
      return N8N_NODE_TYPES.RESPOND_TO_WEBHOOK;
    }

    // Por defecto: Set node
    return N8N_NODE_TYPES.SET;
  }

  /**
   * Genera nombre único para el nodo
   */
  private generateNodeName(step: WorkflowStep, nodeType: string): string {
    // Extraer nombre base del tipo
    const typeBaseName = nodeType.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() ?? 'Node';
    
    // Usar acción como nombre si es corta
    if (step.action.length < 30) {
      return step.action.slice(0, 50);
    }

    return `${typeBaseName} ${step.stepNumber}`;
  }

  /**
   * Genera parámetros del nodo según su tipo
   */
  private generateNodeParameters(
    step: WorkflowStep,
    nodeType: string
  ): Record<string, unknown> {
    switch (nodeType) {
      case N8N_NODE_TYPES.HTTP_REQUEST:
        return this.generateHttpRequestParams(step);

      case N8N_NODE_TYPES.IF:
        return this.generateIfParams(step);

      case N8N_NODE_TYPES.SET:
        return this.generateSetParams(step);

      case N8N_NODE_TYPES.CODE:
        return this.generateCodeParams(step);

      case N8N_NODE_TYPES.GMAIL:
        return this.generateGmailParams(step);

      case N8N_NODE_TYPES.SLACK:
        return this.generateSlackParams(step);

      case N8N_NODE_TYPES.RESPOND_TO_WEBHOOK:
        return {
          respondWith: 'allIncomingItems',
          options: {},
        };

      default:
        return {};
    }
  }

  private generateHttpRequestParams(step: WorkflowStep): Record<string, unknown> {
    const action = step.action.toLowerCase();
    
    // Detectar método
    let method = 'GET';
    if (action.includes('post')) {
      method = 'POST';
    }
    if (action.includes('put')) {
      method = 'PUT';
    }
    if (action.includes('delete')) {
      method = 'DELETE';
    }
    if (action.includes('patch')) {
      method = 'PATCH';
    }

    return {
      method,
      url: '={{ $json.url || "https://api.example.com" }}',
      options: {},
    };
  }

  private generateIfParams(_step: WorkflowStep): Record<string, unknown> {
    return {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
        },
        conditions: [
          {
            id: crypto.randomUUID(),
            leftValue: '={{ $json.condition }}',
            rightValue: 'true',
            operator: {
              type: 'string',
              operation: 'equals',
            },
          },
        ],
        combinator: 'and',
      },
      options: {},
    };
  }

  private generateSetParams(_step: WorkflowStep): Record<string, unknown> {
    return {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: crypto.randomUUID(),
            name: 'data',
            value: '={{ $json }}',
            type: 'any',
          },
        ],
      },
      options: {},
    };
  }

  private generateCodeParams(_step: WorkflowStep): Record<string, unknown> {
    return {
      jsCode: `// Generated code placeholder
const items = $input.all();

for (const item of items) {
  // Process item
  item.json.processed = true;
}

return items;`,
    };
  }

  private generateGmailParams(_step: WorkflowStep): Record<string, unknown> {
    return {
      operation: 'send',
      sendTo: '={{ $json.email || "recipient@example.com" }}',
      subject: '={{ $json.subject || "Notification" }}',
      message: '={{ $json.message || "Hello" }}',
      options: {},
    };
  }

  private generateSlackParams(_step: WorkflowStep): Record<string, unknown> {
    return {
      operation: 'sendMessage',
      channel: '={{ $json.channel || "#general" }}',
      text: '={{ $json.message || "Notification from n8n" }}',
      otherOptions: {},
    };
  }

  /**
   * Aplica auto-layout a los nodos
   */
  private applyAutoLayout(
    nodes: N8nNode[],
    options: Required<N8nGeneratorOptions>
  ): N8nNode[] {
    return nodes.map((node, index) => ({
      ...node,
      position: [
        options.startX + (index * options.horizontalSpacing),
        options.startY,
      ] as readonly [number, number],
    }));
  }

  /**
   * Genera conexiones entre nodos secuenciales
   */
  private generateConnections(nodes: readonly N8nNode[]): N8nConnections {
    const connections: N8nConnections = {};

    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      if (!currentNode || !nextNode) {
        continue;
      }

      const target: N8nConnectionTarget = {
        node: nextNode.name,
        type: 'main',
        index: 0,
      };

      // IF nodes tienen dos salidas
      if (currentNode.type === N8N_NODE_TYPES.IF) {
        connections[currentNode.name] = {
          main: [
            [target], // true branch
            [],       // false branch (puede conectarse después)
          ],
        };
      } else {
        connections[currentNode.name] = {
          main: [[target]],
        };
      }
    }

    return connections;
  }

  /**
   * Genera ID único para nodo
   */
  private generateNodeId(): string {
    return `node-${++this.nodeIdCounter}-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Genera ID de versión
   */
  private generateVersionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Genera path para webhook
   */
  private generateWebhookPath(): string {
    return `/workflow/${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Configura opciones del generador
   */
  configure(options: Partial<N8nGeneratorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Obtiene opciones actuales
   */
  getOptions(): Required<N8nGeneratorOptions> {
    return { ...this.options };
  }
}

/**
 * Factory para crear generador
 */
export function createN8nJsonGenerator(
  options?: Partial<N8nGeneratorOptions>
): N8nJsonGenerator {
  return new N8nJsonGenerator(options);
}
