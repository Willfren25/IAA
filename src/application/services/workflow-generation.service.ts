/**
 * Workflow Generation Service - Servicio principal de generación
 * Fase 8: Application Layer - Orquesta la generación de workflows
 */

import type { PromptContract } from '#core/domain/types/prompt.types.js';
import { N8nJsonGenerator, type N8nGeneratorOptions } from '#adapters/output/generator/index.js';
import { WorkflowExporter, type WorkflowExportOptions, type WorkflowExportResult } from '#adapters/output/exporter/index.js';
import { getFormatterRegistry, type OutputFormat } from '#adapters/output/formatter/index.js';

/**
 * Opciones de generación de workflow
 */
export interface WorkflowGenerationOptions {
  /** Formato de salida */
  format?: OutputFormat;
  /** Opciones del generador */
  generatorOptions?: Partial<N8nGeneratorOptions>;
  /** Opciones de exportación */
  exportOptions?: Partial<WorkflowExportOptions>;
  /** Validar workflow generado */
  validate?: boolean;
  /** Modo verbose */
  verbose?: boolean;
}

/**
 * Resultado de generación de workflow
 */
export interface WorkflowGenerationResult {
  success: boolean;
  workflow?: Record<string, unknown>;
  formattedOutput?: string;
  exportResult?: WorkflowExportResult;
  errors: string[];
  warnings: string[];
  stats: {
    nodeCount: number;
    connectionCount: number;
    generationTimeMs: number;
    totalTimeMs: number;
  };
}

/**
 * Opciones por defecto
 */
const DEFAULT_OPTIONS: Required<WorkflowGenerationOptions> = {
  format: 'json',
  generatorOptions: {},
  exportOptions: {},
  validate: true,
  verbose: false,
};

/**
 * Workflow Generation Service - Servicio de orquestación
 */
export class WorkflowGenerationService {
  private readonly generator: N8nJsonGenerator;
  private readonly exporter: WorkflowExporter;

  constructor() {
    this.generator = new N8nJsonGenerator();
    this.exporter = new WorkflowExporter();
  }

  /**
   * Genera un workflow completo desde un PromptContract
   */
  async generate(
    contract: PromptContract,
    options?: Partial<WorkflowGenerationOptions>
  ): Promise<WorkflowGenerationResult> {
    const startTime = Date.now();
    const opts: Required<WorkflowGenerationOptions> = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar contrato de entrada
      const contractValidation = this.validateContract(contract);
      if (!contractValidation.valid) {
        return {
          success: false,
          errors: contractValidation.errors,
          warnings: [],
          stats: {
            nodeCount: 0,
            connectionCount: 0,
            generationTimeMs: 0,
            totalTimeMs: Date.now() - startTime,
          },
        };
      }
      warnings.push(...contractValidation.warnings);

      // 2. Generar workflow
      const generationStart = Date.now();
      const generatorResult = await this.generator.generate(contract, opts.generatorOptions);
      const generationTimeMs = Date.now() - generationStart;

      if (!generatorResult.success || !generatorResult.workflow) {
        return {
          success: false,
          errors: generatorResult.errors ?? ['Generation failed'],
          warnings,
          stats: {
            nodeCount: 0,
            connectionCount: 0,
            generationTimeMs,
            totalTimeMs: Date.now() - startTime,
          },
        };
      }

      const workflow = generatorResult.workflow as unknown as Record<string, unknown>;
      warnings.push(...(generatorResult.warnings ?? []));

      // 3. Validar workflow generado si está habilitado
      if (opts.validate) {
        const workflowValidation = this.validateWorkflow(workflow);
        if (!workflowValidation.valid) {
          errors.push(...workflowValidation.errors);
        }
        warnings.push(...workflowValidation.warnings);
      }

      // 4. Formatear según el formato solicitado
      const registry = getFormatterRegistry();
      const formatResult = registry.format(workflow, opts.format);
      
      if (!formatResult.success) {
        return {
          success: false,
          workflow,
          errors: [...errors, formatResult.error ?? 'Formatting failed'],
          warnings,
          stats: {
            nodeCount: this.countNodes(workflow),
            connectionCount: this.countConnections(workflow),
            generationTimeMs,
            totalTimeMs: Date.now() - startTime,
          },
        };
      }

      // 5. Resultado exitoso
      return {
        success: errors.length === 0,
        workflow,
        formattedOutput: formatResult.content,
        errors,
        warnings,
        stats: {
          nodeCount: this.countNodes(workflow),
          connectionCount: this.countConnections(workflow),
          generationTimeMs,
          totalTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        stats: {
          nodeCount: 0,
          connectionCount: 0,
          generationTimeMs: 0,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Genera y exporta un workflow a archivo
   */
  async generateAndExport(
    contract: PromptContract,
    options?: Partial<WorkflowGenerationOptions>
  ): Promise<WorkflowGenerationResult> {
    const result = await this.generate(contract, options);
    
    if (!result.success || !result.workflow) {
      return result;
    }

    const opts: Required<WorkflowGenerationOptions> = { ...DEFAULT_OPTIONS, ...options };
    
    // Exportar workflow
    const exportResult = await this.exporter.export(result.workflow, {
      ...opts.exportOptions,
      format: opts.format,
    });

    return {
      ...result,
      exportResult,
      errors: exportResult.success ? result.errors : [...result.errors, exportResult.error ?? 'Export failed'],
    };
  }

  /**
   * Valida un PromptContract
   */
  private validateContract(contract: PromptContract): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas - workflow es un array de WorkflowStep
    if (!contract.workflow || contract.workflow.length === 0) {
      errors.push('Workflow must have at least one step');
      return { valid: false, errors, warnings };
    }

    // Validar meta
    if (!contract.meta?.n8nVersion) {
      warnings.push('n8n version not specified');
    }

    // Validar trigger
    if (!contract.trigger?.type) {
      warnings.push('Trigger type not specified, will use manual trigger');
    }

    // Validar steps
    const stepNumbers = new Set<number>();
    
    for (let i = 0; i < contract.workflow.length; i++) {
      const step = contract.workflow[i];
      if (!step) {
        continue;
      }

      // Validar stepNumber único
      if (stepNumbers.has(step.stepNumber)) {
        errors.push(`Duplicate step number: ${step.stepNumber}`);
      }
      stepNumbers.add(step.stepNumber);

      // Validar campos requeridos
      if (!step.action || step.action.trim() === '') {
        errors.push(`Step ${i + 1}: action is required`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida un workflow generado
   */
  private validateWorkflow(workflow: Record<string, unknown>): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar estructura básica
    if (!workflow['name'] || typeof workflow['name'] !== 'string') {
      errors.push('Workflow name is missing or invalid');
    }

    if (!Array.isArray(workflow['nodes'])) {
      errors.push('Workflow nodes array is missing');
    } else {
      // Validar nodos
      const nodeNames = new Set<string>();
      
      for (const node of workflow['nodes'] as Array<Record<string, unknown>>) {
        if (!node['name'] || typeof node['name'] !== 'string') {
          errors.push('Node missing name');
        } else {
          if (nodeNames.has(node['name'] as string)) {
            errors.push(`Duplicate node name: ${node['name']}`);
          }
          nodeNames.add(node['name'] as string);
        }

        if (!node['type'] || typeof node['type'] !== 'string') {
          errors.push(`Node ${node['name']}: missing type`);
        }

        if (!node['position'] || !Array.isArray(node['position'])) {
          errors.push(`Node ${node['name']}: missing position`);
        }
      }
    }

    if (typeof workflow['connections'] !== 'object' || workflow['connections'] === null) {
      errors.push('Workflow connections object is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Cuenta nodos en un workflow
   */
  private countNodes(workflow: Record<string, unknown>): number {
    return Array.isArray(workflow['nodes']) ? workflow['nodes'].length : 0;
  }

  /**
   * Cuenta conexiones en un workflow
   */
  private countConnections(workflow: Record<string, unknown>): number {
    if (typeof workflow['connections'] !== 'object' || workflow['connections'] === null) {
      return 0;
    }
    return Object.keys(workflow['connections'] as Record<string, unknown>).length;
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getGeneratorStats(): { totalGenerations: number } {
    return {
      totalGenerations: 0, // TODO: implementar tracking
    };
  }
}

/**
 * Singleton del servicio
 */
let defaultService: WorkflowGenerationService | null = null;

export function getWorkflowGenerationService(): WorkflowGenerationService {
  if (!defaultService) {
    defaultService = new WorkflowGenerationService();
  }
  return defaultService;
}

export function createWorkflowGenerationService(): WorkflowGenerationService {
  return new WorkflowGenerationService();
}
