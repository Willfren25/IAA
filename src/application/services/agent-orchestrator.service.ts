/**
 * Agent Orchestrator Service - Orquestador principal del agente
 * Fase 8: Application Layer - Coordina todo el pipeline
 */

import {
  PromptProcessingService,
  getPromptProcessingService,
  type RawPrompt,
  type PromptProcessingResult,
} from './prompt-processing.service.js';
import {
  WorkflowGenerationService,
  getWorkflowGenerationService,
  type WorkflowGenerationOptions,
  type WorkflowGenerationResult,
} from './workflow-generation.service.js';
import type { PromptContract } from '#core/domain/types/prompt.types.js';

/**
 * Estado de ejecución del agente
 */
export type AgentExecutionState =
  | 'idle'
  | 'processing-prompt'
  | 'generating-workflow'
  | 'validating'
  | 'exporting'
  | 'completed'
  | 'error';

/**
 * Evento de ejecución
 */
export interface AgentExecutionEvent {
  timestamp: Date;
  state: AgentExecutionState;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Resultado de ejecución del agente
 */
export interface AgentExecutionResult {
  success: boolean;
  state: AgentExecutionState;
  promptResult?: PromptProcessingResult;
  workflowResult?: WorkflowGenerationResult;
  events: AgentExecutionEvent[];
  errors: string[];
  warnings: string[];
  totalTimeMs: number;
}

/**
 * Opciones del orquestador
 */
export interface AgentOrchestratorOptions {
  /** Opciones de procesamiento de prompt */
  promptOptions?: {
    extractVariables?: boolean;
    inferDependencies?: boolean;
    detectTrigger?: boolean;
  };
  /** Opciones de generación */
  generationOptions?: Partial<WorkflowGenerationOptions>;
  /** Exportar automáticamente */
  autoExport?: boolean;
  /** Handler de eventos */
  onEvent?: (event: AgentExecutionEvent) => void;
  /** Modo verbose */
  verbose?: boolean;
}

/**
 * Opciones por defecto
 */
const DEFAULT_OPTIONS: Required<AgentOrchestratorOptions> = {
  promptOptions: {
    extractVariables: true,
    inferDependencies: true,
    detectTrigger: true,
  },
  generationOptions: {},
  autoExport: false,
  onEvent: () => {},
  verbose: false,
};

/**
 * Agent Orchestrator - Orquesta el pipeline completo
 */
export class AgentOrchestrator {
  private readonly promptService: PromptProcessingService;
  private readonly workflowService: WorkflowGenerationService;
  private state: AgentExecutionState = 'idle';
  private currentEvents: AgentExecutionEvent[] = [];

  constructor(
    promptService?: PromptProcessingService,
    workflowService?: WorkflowGenerationService
  ) {
    this.promptService = promptService ?? getPromptProcessingService();
    this.workflowService = workflowService ?? getWorkflowGenerationService();
  }

  /**
   * Ejecuta el pipeline completo desde texto natural
   */
  async executeFromText(
    text: string,
    options?: Partial<AgentOrchestratorOptions>
  ): Promise<AgentExecutionResult> {
    const prompt: RawPrompt = { text };
    return this.execute(prompt, options);
  }

  /**
   * Ejecuta el pipeline completo desde un prompt crudo
   */
  async execute(
    prompt: RawPrompt,
    options?: Partial<AgentOrchestratorOptions>
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const opts: Required<AgentOrchestratorOptions> = { ...DEFAULT_OPTIONS, ...options };
    this.currentEvents = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Procesar prompt
      this.setState('processing-prompt', 'Processing input prompt...', opts.onEvent);
      
      const promptResult = await this.promptService.process(prompt, opts.promptOptions);
      
      if (!promptResult.success || !promptResult.contract) {
        this.setState('error', 'Prompt processing failed', opts.onEvent);
        return {
          success: false,
          state: 'error',
          promptResult,
          events: this.currentEvents,
          errors: [...errors, ...promptResult.errors],
          warnings: [...warnings, ...promptResult.warnings],
          totalTimeMs: Date.now() - startTime,
        };
      }

      warnings.push(...promptResult.warnings);
      this.emitEvent('processing-prompt', 'Prompt processed successfully', opts.onEvent, {
        stepCount: promptResult.contract.workflow.length,
      });

      // 2. Generar workflow
      this.setState('generating-workflow', 'Generating n8n workflow...', opts.onEvent);
      
      let workflowResult: WorkflowGenerationResult;
      
      if (opts.autoExport) {
        workflowResult = await this.workflowService.generateAndExport(
          promptResult.contract,
          opts.generationOptions
        );
      } else {
        workflowResult = await this.workflowService.generate(
          promptResult.contract,
          opts.generationOptions
        );
      }

      if (!workflowResult.success) {
        this.setState('error', 'Workflow generation failed', opts.onEvent);
        return {
          success: false,
          state: 'error',
          promptResult,
          workflowResult,
          events: this.currentEvents,
          errors: [...errors, ...workflowResult.errors],
          warnings: [...warnings, ...workflowResult.warnings],
          totalTimeMs: Date.now() - startTime,
        };
      }

      warnings.push(...workflowResult.warnings);
      errors.push(...workflowResult.errors);

      // 3. Completado
      this.setState('completed', 'Workflow generated successfully', opts.onEvent, {
        nodeCount: workflowResult.stats.nodeCount,
        connectionCount: workflowResult.stats.connectionCount,
      });

      return {
        success: true,
        state: 'completed',
        promptResult,
        workflowResult,
        events: this.currentEvents,
        errors,
        warnings,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.setState('error', error instanceof Error ? error.message : 'Unknown error', opts.onEvent);
      
      return {
        success: false,
        state: 'error',
        events: this.currentEvents,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        totalTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Ejecuta desde un PromptContract ya construido
   */
  async executeFromContract(
    contract: PromptContract,
    options?: Partial<AgentOrchestratorOptions>
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const opts: Required<AgentOrchestratorOptions> = { ...DEFAULT_OPTIONS, ...options };
    this.currentEvents = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar contrato
      const validation = this.promptService.validate(contract);
      if (!validation.valid) {
        this.setState('error', 'Invalid contract', opts.onEvent);
        return {
          success: false,
          state: 'error',
          events: this.currentEvents,
          errors: validation.errors,
          warnings: validation.warnings,
          totalTimeMs: Date.now() - startTime,
        };
      }

      warnings.push(...validation.warnings);

      // Generar workflow
      this.setState('generating-workflow', 'Generating n8n workflow...', opts.onEvent);
      
      let workflowResult: WorkflowGenerationResult;
      
      if (opts.autoExport) {
        workflowResult = await this.workflowService.generateAndExport(contract, opts.generationOptions);
      } else {
        workflowResult = await this.workflowService.generate(contract, opts.generationOptions);
      }

      if (!workflowResult.success) {
        this.setState('error', 'Workflow generation failed', opts.onEvent);
        return {
          success: false,
          state: 'error',
          workflowResult,
          events: this.currentEvents,
          errors: [...errors, ...workflowResult.errors],
          warnings: [...warnings, ...workflowResult.warnings],
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Completado
      this.setState('completed', 'Workflow generated successfully', opts.onEvent);

      return {
        success: true,
        state: 'completed',
        workflowResult,
        events: this.currentEvents,
        errors: [...errors, ...workflowResult.errors],
        warnings: [...warnings, ...workflowResult.warnings],
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.setState('error', error instanceof Error ? error.message : 'Unknown error', opts.onEvent);
      
      return {
        success: false,
        state: 'error',
        events: this.currentEvents,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        totalTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Obtiene el estado actual
   */
  getState(): AgentExecutionState {
    return this.state;
  }

  /**
   * Obtiene los eventos de la última ejecución
   */
  getEvents(): readonly AgentExecutionEvent[] {
    return [...this.currentEvents];
  }

  /**
   * Cambia el estado y emite evento
   */
  private setState(
    state: AgentExecutionState,
    message: string,
    onEvent: (event: AgentExecutionEvent) => void,
    data?: Record<string, unknown>
  ): void {
    this.state = state;
    this.emitEvent(state, message, onEvent, data);
  }

  /**
   * Emite un evento
   */
  private emitEvent(
    state: AgentExecutionState,
    message: string,
    onEvent: (event: AgentExecutionEvent) => void,
    data?: Record<string, unknown>
  ): void {
    const event: AgentExecutionEvent = {
      timestamp: new Date(),
      state,
      message,
      data,
    };
    this.currentEvents.push(event);
    onEvent(event);
  }

  /**
   * Resetea el orquestador
   */
  reset(): void {
    this.state = 'idle';
    this.currentEvents = [];
  }
}

/**
 * Singleton
 */
let defaultOrchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new AgentOrchestrator();
  }
  return defaultOrchestrator;
}

export function createAgentOrchestrator(
  promptService?: PromptProcessingService,
  workflowService?: WorkflowGenerationService
): AgentOrchestrator {
  return new AgentOrchestrator(promptService, workflowService);
}
