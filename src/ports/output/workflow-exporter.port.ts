/**
 * Workflow Exporter Port - Exportación de workflows para n8n
 *
 * Define el contrato para exportar workflows en formatos
 * compatibles con la importación de n8n.
 */

import type { N8nWorkflow } from '#core/domain/types/workflow.types.js';

/**
 * Formato de exportación
 */
export type ExportFormat = 'n8n-native' | 'n8n-community' | 'clipboard' | 'file';

/**
 * Destino de exportación
 */
export type ExportDestination = 'file' | 'clipboard' | 'api' | 'stream';

/**
 * Opciones de exportación
 */
export interface ExportOptions {
  /** Formato de exportación */
  readonly format: ExportFormat;
  /** Destino de exportación */
  readonly destination: ExportDestination;
  /** Nombre de archivo (si aplica) */
  readonly filename?: string;
  /** Directorio de salida (si aplica) */
  readonly outputDir?: string;
  /** Incluir credenciales placeholder */
  readonly includeCredentials?: boolean;
  /** Incluir nodos deshabilitados */
  readonly includeDisabledNodes?: boolean;
  /** Incluir notas y documentación */
  readonly includeNotes?: boolean;
  /** Incluir pinned data */
  readonly includePinnedData?: boolean;
  /** Versión de n8n objetivo */
  readonly targetN8nVersion?: string;
  /** Comprimir salida */
  readonly compress?: boolean;
  /** Incluir metadatos de exportación */
  readonly includeExportMetadata?: boolean;
  /** Timestamp de exportación */
  readonly exportTimestamp?: boolean;
}

/**
 * Metadatos de exportación
 */
export interface ExportMetadata {
  readonly exportedAt: Date;
  readonly exportedBy?: string;
  readonly agentVersion: string;
  readonly n8nVersion: string;
  readonly sourcePromptHash?: string;
  readonly checksum?: string;
}

/**
 * Resultado de exportación
 */
export interface ExportResult {
  readonly success: boolean;
  readonly format: ExportFormat;
  readonly destination: ExportDestination;
  readonly data?: string | Buffer;
  readonly filePath?: string;
  readonly metadata: ExportMetadata;
  readonly errors: readonly ExportError[];
  readonly warnings: readonly ExportWarning[];
  readonly stats: ExportStats;
}

/**
 * Error de exportación
 */
export interface ExportError {
  readonly code: string;
  readonly message: string;
  readonly detail?: string;
}

/**
 * Advertencia de exportación
 */
export interface ExportWarning {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
}

/**
 * Estadísticas de exportación
 */
export interface ExportStats {
  readonly workflowName: string;
  readonly nodeCount: number;
  readonly connectionCount: number;
  readonly outputSize: number;
  readonly exportTimeMs: number;
}

/**
 * Información de archivo exportado
 */
export interface ExportedFileInfo {
  readonly path: string;
  readonly filename: string;
  readonly size: number;
  readonly checksum: string;
  readonly createdAt: Date;
}

/**
 * Resultado de validación de exportación
 */
export interface ExportValidationResult {
  readonly isValid: boolean;
  readonly canImportInN8n: boolean;
  readonly n8nVersionCompatibility: string[];
  readonly issues: readonly ExportError[];
  readonly suggestions: readonly string[];
}

/**
 * Plantilla de exportación
 */
export interface ExportTemplate {
  readonly name: string;
  readonly description: string;
  readonly format: ExportFormat;
  readonly options: Partial<ExportOptions>;
  readonly transform?: (workflow: N8nWorkflow) => N8nWorkflow;
}

/**
 * Resultado de preparación de clipboard
 */
export interface ClipboardPrepareResult {
  readonly success: boolean;
  readonly content?: string;
  readonly format: 'text' | 'html';
  readonly error?: string;
}

/**
 * Puerto de Exportador de Workflows
 *
 * Define el contrato para exportar workflows
 * en formatos importables por n8n.
 */
export interface WorkflowExporterPort {
  /**
   * Exporta workflow completo
   * @param workflow - Workflow n8n a exportar
   * @param options - Opciones de exportación
   * @returns Resultado de exportación
   */
  export(workflow: N8nWorkflow, options: ExportOptions): Promise<ExportResult>;

  /**
   * Exporta a archivo
   * @param workflow - Workflow n8n
   * @param filePath - Ruta del archivo
   * @param options - Opciones adicionales
   * @returns Información del archivo exportado
   */
  exportToFile(
    workflow: N8nWorkflow,
    filePath: string,
    options?: Partial<ExportOptions>
  ): Promise<ExportedFileInfo>;

  /**
   * Prepara para clipboard
   * @param workflow - Workflow n8n
   * @param options - Opciones adicionales
   * @returns Contenido preparado para clipboard
   */
  prepareForClipboard(
    workflow: N8nWorkflow,
    options?: Partial<ExportOptions>
  ): ClipboardPrepareResult;

  /**
   * Exporta en formato nativo de n8n
   * @param workflow - Workflow n8n
   * @returns JSON string en formato n8n
   */
  toN8nNative(workflow: N8nWorkflow): string;

  /**
   * Exporta en formato community (para compartir)
   * @param workflow - Workflow n8n
   * @param options - Opciones adicionales
   * @returns JSON string sanitizado
   */
  toN8nCommunity(
    workflow: N8nWorkflow,
    options?: { removeCredentials?: boolean; anonymize?: boolean }
  ): string;

  /**
   * Valida exportación antes de guardar
   * @param workflow - Workflow n8n
   * @param options - Opciones de exportación
   * @returns Resultado de validación
   */
  validateExport(workflow: N8nWorkflow, options?: ExportOptions): ExportValidationResult;

  /**
   * Genera nombre de archivo único
   * @param workflow - Workflow n8n
   * @param format - Formato de exportación
   * @returns Nombre de archivo sugerido
   */
  generateFilename(workflow: N8nWorkflow, format?: ExportFormat): string;

  /**
   * Calcula checksum de workflow
   * @param workflow - Workflow n8n
   * @returns Hash/checksum
   */
  calculateChecksum(workflow: N8nWorkflow): string;

  /**
   * Sanitiza workflow para compartir
   * @param workflow - Workflow n8n
   * @param options - Opciones de sanitización
   * @returns Workflow sanitizado
   */
  sanitize(
    workflow: N8nWorkflow,
    options?: {
      removeCredentials?: boolean;
      removeApiKeys?: boolean;
      anonymizeUrls?: boolean;
      removeNotes?: boolean;
    }
  ): N8nWorkflow;

  /**
   * Agrega metadatos de exportación
   * @param workflow - Workflow n8n
   * @param metadata - Metadatos adicionales
   * @returns Workflow con metadatos
   */
  addExportMetadata(
    workflow: N8nWorkflow,
    metadata?: Partial<ExportMetadata>
  ): N8nWorkflow & { __exportMetadata: ExportMetadata };

  /**
   * Obtiene plantillas de exportación disponibles
   * @returns Array de plantillas
   */
  getExportTemplates(): readonly ExportTemplate[];

  /**
   * Aplica plantilla de exportación
   * @param workflow - Workflow n8n
   * @param templateName - Nombre de plantilla
   * @returns Resultado de exportación
   */
  applyTemplate(workflow: N8nWorkflow, templateName: string): Promise<ExportResult>;

  /**
   * Registra plantilla de exportación personalizada
   * @param template - Plantilla a registrar
   */
  registerTemplate(template: ExportTemplate): void;

  /**
   * Comprime workflow para exportación
   * @param content - Contenido a comprimir
   * @returns Contenido comprimido en Base64
   */
  compress(content: string): string;

  /**
   * Descomprime workflow importado
   * @param compressed - Contenido comprimido en Base64
   * @returns Contenido descomprimido
   */
  decompress(compressed: string): string;
}

/**
 * Opciones por defecto de exportación
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'n8n-native',
  destination: 'file',
  includeCredentials: false,
  includeDisabledNodes: true,
  includeNotes: true,
  includePinnedData: false,
  compress: false,
  includeExportMetadata: true,
  exportTimestamp: true,
} as const;

/**
 * Códigos de error de exportación
 */
export const EXPORT_ERROR_CODES = {
  INVALID_WORKFLOW: 'EXP001',
  FILE_WRITE_ERROR: 'EXP002',
  PERMISSION_DENIED: 'EXP003',
  COMPRESSION_ERROR: 'EXP004',
  INVALID_FORMAT: 'EXP005',
  VALIDATION_FAILED: 'EXP006',
  TEMPLATE_NOT_FOUND: 'EXP007',
  SANITIZATION_ERROR: 'EXP008',
} as const;

/**
 * Extensiones de archivo por formato
 */
export const EXPORT_FILE_EXTENSIONS: Record<ExportFormat, string> = {
  'n8n-native': '.json',
  'n8n-community': '.json',
  clipboard: '.json',
  file: '.json',
} as const;
