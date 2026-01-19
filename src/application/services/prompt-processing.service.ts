/**
 * Prompt Processing Service - Procesa prompts de entrada
 * Fase 8: Application Layer - Pipeline de procesamiento
 */

import type {
  PromptContract,
  PromptMeta,
  PromptTrigger,
  PromptTriggerType,
  WorkflowStep,
} from '#core/domain/types/prompt.types.js';

/**
 * Prompt de entrada crudo
 */
export interface RawPrompt {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado de procesamiento
 */
export interface PromptProcessingResult {
  success: boolean;
  contract?: PromptContract;
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
}

/**
 * Opciones de procesamiento
 */
export interface PromptProcessingOptions {
  /** Extraer variables automáticamente */
  extractVariables?: boolean;
  /** Inferir dependencias entre steps */
  inferDependencies?: boolean;
  /** Detectar trigger type */
  detectTrigger?: boolean;
  /** Modo verbose */
  verbose?: boolean;
}

/**
 * Opciones por defecto
 */
const DEFAULT_OPTIONS: Required<PromptProcessingOptions> = {
  extractVariables: true,
  inferDependencies: true,
  detectTrigger: true,
  verbose: false,
};

/**
 * Patrones para detección
 */
const PATTERNS = {
  // Patrones de trigger
  WEBHOOK: /\b(webhook|api\s+call|http\s+request|endpoint)\b/i,
  SCHEDULE: /\b(every|daily|weekly|hourly|cron|schedule[d]?|at\s+\d+)/i,
  MANUAL: /\b(manual|manually|on\s+demand|trigger\s+manually)\b/i,

  // Patrones de acción
  HTTP_REQUEST: /\b(http|request|api|fetch|get|post|put|delete|call)\b/i,
  CONDITION: /\b(if|when|condition|check|verify|ensure)\b/i,
  LOOP: /\b(for\s+each|loop|iterate|repeat|every\s+item)\b/i,
  SET_DATA: /\b(set|assign|store|save|variable)\b/i,
  SEND_EMAIL: /\b(send\s+email|email\s+to|notify\s+via\s+email)\b/i,
  SLACK: /\b(slack|send\s+to\s+slack|post\s+to\s+slack)\b/i,
  DATABASE: /\b(database|db|sql|query|insert|update|select)\b/i,

  // Variables en texto
  VARIABLE: /\{\{([^}]+)\}\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g,
};

/**
 * Prompt Processing Service
 */
export class PromptProcessingService {
  /**
   * Procesa un prompt crudo y genera un PromptContract
   */
  async process(
    prompt: RawPrompt,
    options?: Partial<PromptProcessingOptions>
  ): Promise<PromptProcessingResult> {
    const startTime = Date.now();
    const opts: Required<PromptProcessingOptions> = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar entrada
      if (!prompt.text || prompt.text.trim() === '') {
        return {
          success: false,
          errors: ['Prompt text is empty'],
          warnings: [],
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Parsear el texto del prompt
      const parsedSteps = this.parseSteps(prompt.text);
      if (parsedSteps.length === 0) {
        warnings.push('No steps detected, creating single step from prompt');
        parsedSteps.push({
          stepNumber: 1,
          action: prompt.text.trim(),
        });
      }

      // Detectar trigger
      let trigger: PromptTrigger = { type: 'manual' };
      if (opts.detectTrigger) {
        trigger = this.detectTrigger(prompt.text);
      }

      // Generar metadata
      const meta: PromptMeta = {
        n8nVersion: '1.0.0',
        output: 'json',
        strict: false,
      };

      // Construir contrato
      const contract: PromptContract = {
        meta,
        trigger,
        workflow: parsedSteps,
        rawInput: prompt.text,
      };

      return {
        success: true,
        contract,
        errors,
        warnings,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Processing failed'],
        warnings,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Parsea steps desde el texto del prompt
   */
  private parseSteps(text: string): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    
    // Buscar patrones de lista numerada
    const listPattern = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)(?=(?:\n\s*\d+[.)]|\n\n|$))/gs;
    let match: RegExpExecArray | null;

    while ((match = listPattern.exec(text)) !== null) {
      const stepNumber = parseInt(match[1] ?? '1', 10);
      const action = (match[2] ?? '').trim();
      
      if (action) {
        steps.push({
          stepNumber,
          action,
          nodeType: this.detectNodeType(action),
        });
      }
    }

    // Si no hay lista numerada, buscar por líneas
    if (steps.length === 0) {
      const lines = text.split(/[.\n]/).filter(line => line.trim());
      let stepNumber = 1;

      for (const line of lines) {
        const trimmed = line.trim();
        // Filtrar líneas muy cortas o conectores
        if (trimmed.length > 10 && !/^(then|and|after|next|finally|first|also)$/i.test(trimmed)) {
          steps.push({
            stepNumber,
            action: trimmed,
            nodeType: this.detectNodeType(trimmed),
          });
          stepNumber++;
        }
      }
    }

    return steps;
  }

  /**
   * Detecta el tipo de trigger desde el texto
   */
  private detectTrigger(text: string): PromptTrigger {
    if (PATTERNS.WEBHOOK.test(text)) {
      return {
        type: 'webhook' as PromptTriggerType,
        method: 'POST',
        path: '/webhook',
      };
    }

    if (PATTERNS.SCHEDULE.test(text)) {
      const scheduleMatch = text.match(/every\s+(\w+)/i);
      const interval = scheduleMatch?.[1] ?? 'hour';
      return {
        type: 'cron' as PromptTriggerType,
        schedule: this.intervalToCron(interval),
      };
    }

    // Default: manual
    return {
      type: 'manual' as PromptTriggerType,
    };
  }

  /**
   * Convierte un intervalo textual a cron
   */
  private intervalToCron(interval: string): string {
    switch (interval.toLowerCase()) {
      case 'minute':
        return '* * * * *';
      case 'hour':
      case 'hourly':
        return '0 * * * *';
      case 'day':
      case 'daily':
        return '0 0 * * *';
      case 'week':
      case 'weekly':
        return '0 0 * * 0';
      default:
        return '0 * * * *';
    }
  }

  /**
   * Detecta el tipo de nodo desde la acción
   */
  private detectNodeType(action: string): string | undefined {
    if (PATTERNS.HTTP_REQUEST.test(action)) {
      return 'n8n-nodes-base.httpRequest';
    }
    if (PATTERNS.CONDITION.test(action)) {
      return 'n8n-nodes-base.if';
    }
    if (PATTERNS.SET_DATA.test(action)) {
      return 'n8n-nodes-base.set';
    }
    if (PATTERNS.SEND_EMAIL.test(action)) {
      return 'n8n-nodes-base.gmail';
    }
    if (PATTERNS.SLACK.test(action)) {
      return 'n8n-nodes-base.slack';
    }
    if (PATTERNS.DATABASE.test(action)) {
      return 'n8n-nodes-base.postgres';
    }
    return undefined;
  }

  /**
   * Valida un PromptContract ya construido
   */
  validate(contract: PromptContract): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!contract.meta) {
      errors.push('Missing meta section');
    }

    if (!contract.trigger) {
      errors.push('Missing trigger section');
    }

    if (!contract.workflow || contract.workflow.length === 0) {
      errors.push('No steps defined');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Singleton
 */
let defaultService: PromptProcessingService | null = null;

export function getPromptProcessingService(): PromptProcessingService {
  if (!defaultService) {
    defaultService = new PromptProcessingService();
  }
  return defaultService;
}

export function createPromptProcessingService(): PromptProcessingService {
  return new PromptProcessingService();
}
