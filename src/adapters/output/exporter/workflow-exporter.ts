/**
 * Workflow Exporter - Exportador de workflows a archivos
 * Fase 6.3: Exportar workflow a JSON n8n importable
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { OutputFormat, FormatterResult } from '../formatter/formatters.js';
import { getFormatterRegistry } from '../formatter/formatters.js';

/**
 * Opciones de exportación simplificadas
 */
export interface WorkflowExportOptions {
  format: OutputFormat;
  outputDir: string;
  filename: string;
  includeMetadata: boolean;
  validateBeforeExport: boolean;
  overwrite: boolean;
  createBackup: boolean;
}

/**
 * Manifest de exportación
 */
export interface ExportManifest {
  id: string;
  timestamp: string;
  workflowName: string;
  outputPath: string;
  format: OutputFormat;
  size: number;
  checksum: string;
  nodeCount: number;
  connectionCount: number;
  options: WorkflowExportOptions;
}

/**
 * Resultado de exportación
 */
export interface WorkflowExportResult {
  success: boolean;
  path?: string;
  format?: OutputFormat;
  size?: number;
  manifest?: ExportManifest;
  duration?: number;
  error?: string;
}

/**
 * Opciones de export por defecto
 */
const DEFAULT_EXPORT_OPTIONS: WorkflowExportOptions = {
  format: 'json',
  outputDir: './output',
  filename: 'workflow',
  includeMetadata: true,
  validateBeforeExport: true,
  overwrite: false,
  createBackup: true,
};

/**
 * Workflow Exporter - Exporta workflows a archivos
 */
export class WorkflowExporter {
  private exportHistory: ExportManifest[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Exporta un workflow a archivo
   */
  async export(
    workflow: Record<string, unknown>,
    options?: Partial<WorkflowExportOptions>
  ): Promise<WorkflowExportResult> {
    const opts: WorkflowExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      // 1. Validar workflow si está habilitado
      if (opts.validateBeforeExport) {
        const validationResult = this.validateWorkflow(workflow);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `Validation failed: ${validationResult.errors.join(', ')}`,
          };
        }
      }

      // 2. Formatear workflow
      const formatResult = this.formatWorkflow(workflow, opts);
      if (!formatResult.success) {
        return {
          success: false,
          error: `Formatting failed: ${formatResult.error}`,
        };
      }

      // 3. Preparar contenido con metadata si está habilitado
      let content = formatResult.content;
      if (opts.includeMetadata && opts.format === 'json') {
        content = this.addMetadata(workflow, content);
      }

      // 4. Preparar paths
      const extension = this.getExtension(opts.format);
      const filename = `${opts.filename}${extension}`;
      const outputPath = path.resolve(opts.outputDir, filename);

      // 5. Crear directorio si no existe
      await this.ensureDirectory(opts.outputDir);

      // 6. Verificar si existe y manejar backup/overwrite
      const fileExists = await this.fileExists(outputPath);
      if (fileExists) {
        if (!opts.overwrite) {
          return {
            success: false,
            error: `File already exists: ${outputPath}. Use overwrite: true to replace.`,
            path: outputPath,
          };
        }
        if (opts.createBackup) {
          await this.createBackup(outputPath);
        }
      }

      // 7. Escribir archivo
      await fs.writeFile(outputPath, content, 'utf8');

      // 8. Crear manifest
      const manifest = this.createManifest(workflow, outputPath, content, opts);
      this.addToHistory(manifest);

      // 9. Retornar resultado exitoso
      const duration = Date.now() - startTime;
      return {
        success: true,
        path: outputPath,
        format: opts.format,
        size: Buffer.byteLength(content, 'utf8'),
        manifest,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Exporta múltiples workflows
   */
  async exportBatch(
    workflows: Array<{ workflow: Record<string, unknown>; name: string }>,
    options?: Partial<WorkflowExportOptions>
  ): Promise<Array<WorkflowExportResult & { name: string }>> {
    const results: Array<WorkflowExportResult & { name: string }> = [];

    for (const { workflow, name } of workflows) {
      const result = await this.export(workflow, {
        ...options,
        filename: name,
      });
      results.push({ ...result, name });
    }

    return results;
  }

  /**
   * Valida un workflow antes de exportar
   */
  private validateWorkflow(workflow: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar estructura básica
    if (!workflow['name'] || typeof workflow['name'] !== 'string') {
      errors.push('Missing or invalid workflow name');
    }

    if (!Array.isArray(workflow['nodes'])) {
      errors.push('Missing or invalid nodes array');
    } else if (workflow['nodes'].length === 0) {
      errors.push('Workflow has no nodes');
    }

    if (typeof workflow['connections'] !== 'object' || workflow['connections'] === null) {
      errors.push('Missing or invalid connections object');
    }

    // Validar nodos
    if (Array.isArray(workflow['nodes'])) {
      for (let i = 0; i < workflow['nodes'].length; i++) {
        const node = workflow['nodes'][i] as Record<string, unknown> | undefined;
        if (!node) {
          continue;
        }

        if (!node['name'] || typeof node['name'] !== 'string') {
          errors.push(`Node ${i}: missing or invalid name`);
        }
        if (!node['type'] || typeof node['type'] !== 'string') {
          errors.push(`Node ${i}: missing or invalid type`);
        }
        if (typeof node['position'] !== 'object' || node['position'] === null) {
          errors.push(`Node ${i}: missing or invalid position`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formatea el workflow según el formato solicitado
   */
  private formatWorkflow(workflow: Record<string, unknown>, opts: WorkflowExportOptions): FormatterResult {
    const registry = getFormatterRegistry();
    return registry.format(workflow, opts.format, { indent: 2 });
  }

  /**
   * Agrega metadata al contenido JSON
   */
  private addMetadata(workflow: Record<string, unknown>, content: string): string {
    const parsed = JSON.parse(content);
    
    // Agregar metadata de exportación
    const enhanced = {
      ...parsed,
      meta: {
        ...(parsed.meta ?? {}),
        exportedAt: new Date().toISOString(),
        exportedBy: 'IAA-Workflow-Exporter',
        version: '1.0.0',
        nodeCount: Array.isArray(workflow['nodes']) ? workflow['nodes'].length : 0,
      },
    };

    return JSON.stringify(enhanced, null, 2);
  }

  /**
   * Obtiene la extensión según el formato
   */
  private getExtension(format: string): string {
    switch (format) {
      case 'yaml':
        return '.yaml';
      case 'text':
        return '.md';
      default:
        return '.json';
    }
  }

  /**
   * Asegura que el directorio existe
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignorar error si ya existe
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Verifica si un archivo existe
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea backup de un archivo existente
   */
  private async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  /**
   * Crea manifest de exportación
   */
  private createManifest(
    workflow: Record<string, unknown>,
    outputPath: string,
    content: string,
    opts: Required<WorkflowExportOptions>
  ): ExportManifest {
    const nodes = Array.isArray(workflow['nodes']) ? workflow['nodes'] : [];
    
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      workflowName: String(workflow['name'] ?? 'Unknown'),
      outputPath,
      format: opts.format,
      size: Buffer.byteLength(content, 'utf8'),
      checksum: this.calculateChecksum(content),
      nodeCount: nodes.length,
      connectionCount: Object.keys((workflow['connections'] as Record<string, unknown>) ?? {}).length,
      options: opts,
    };
  }

  /**
   * Genera ID único
   */
  private generateId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Calcula checksum simple del contenido
   */
  private calculateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Agrega manifest al historial
   */
  private addToHistory(manifest: ExportManifest): void {
    this.exportHistory.push(manifest);
    
    // Limitar tamaño del historial
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory.shift();
    }
  }

  /**
   * Obtiene el historial de exportaciones
   */
  getExportHistory(): readonly ExportManifest[] {
    return [...this.exportHistory];
  }

  /**
   * Limpia el historial de exportaciones
   */
  clearHistory(): void {
    this.exportHistory = [];
  }

  /**
   * Obtiene estadísticas de exportación
   */
  getStats(): {
    totalExports: number;
    totalSize: number;
    averageNodeCount: number;
    formatDistribution: Record<string, number>;
  } {
    const stats = {
      totalExports: this.exportHistory.length,
      totalSize: 0,
      averageNodeCount: 0,
      formatDistribution: {} as Record<string, number>,
    };

    if (this.exportHistory.length === 0) {
      return stats;
    }

    let totalNodes = 0;
    for (const manifest of this.exportHistory) {
      stats.totalSize += manifest.size;
      totalNodes += manifest.nodeCount;
      stats.formatDistribution[manifest.format] = (stats.formatDistribution[manifest.format] ?? 0) + 1;
    }

    stats.averageNodeCount = totalNodes / this.exportHistory.length;
    return stats;
  }
}

/**
 * Singleton del exporter
 */
let defaultExporter: WorkflowExporter | null = null;

export function getWorkflowExporter(): WorkflowExporter {
  if (!defaultExporter) {
    defaultExporter = new WorkflowExporter();
  }
  return defaultExporter;
}

export function createWorkflowExporter(): WorkflowExporter {
  return new WorkflowExporter();
}
