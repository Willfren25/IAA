/**
 * Output Formatter Port - Formateo de salida
 *
 * Define el contrato para formatear la salida del agente
 * en diferentes formatos: JSON, YAML, etc.
 */

import type { N8nWorkflow } from '#core/domain/types/workflow.types.js';

/**
 * Formato de salida soportado
 */
export type SupportedOutputFormat = 'json' | 'yaml' | 'json5' | 'toml';

/**
 * Opciones de formateo
 */
export interface FormatOptions {
  /** Formato de salida */
  readonly format: SupportedOutputFormat;
  /** Indentación (espacios) */
  readonly indent?: number;
  /** Usar tabs en lugar de espacios */
  readonly useTabs?: boolean;
  /** Ancho máximo de línea */
  readonly lineWidth?: number;
  /** Incluir comentarios */
  readonly includeComments?: boolean;
  /** Ordenar claves alfabéticamente */
  readonly sortKeys?: boolean;
  /** Estilo de comillas */
  readonly quoteStyle?: 'single' | 'double';
  /** Incluir BOM */
  readonly includeBom?: boolean;
  /** Fin de línea */
  readonly eol?: 'lf' | 'crlf';
}

/**
 * Resultado de formateo
 */
export interface FormatResult {
  readonly success: boolean;
  readonly output?: string;
  readonly format: SupportedOutputFormat;
  readonly errors: readonly FormatError[];
  readonly warnings: readonly FormatWarning[];
  readonly stats: FormatStats;
}

/**
 * Error de formateo
 */
export interface FormatError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Advertencia de formateo
 */
export interface FormatWarning {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
}

/**
 * Estadísticas de formateo
 */
export interface FormatStats {
  readonly inputSize: number;
  readonly outputSize: number;
  readonly formatTimeMs: number;
  readonly lineCount: number;
}

/**
 * Información de formato
 */
export interface FormatInfo {
  readonly name: SupportedOutputFormat;
  readonly extension: string;
  readonly mimeType: string;
  readonly description: string;
  readonly supportsComments: boolean;
}

/**
 * Transformación de salida
 */
export interface OutputTransformation {
  readonly name: string;
  readonly description: string;
  readonly transform: (input: string, format: SupportedOutputFormat) => string;
}

/**
 * Opciones de conversión entre formatos
 */
export interface ConversionOptions {
  /** Preservar comentarios si es posible */
  readonly preserveComments?: boolean;
  /** Validar salida */
  readonly validateOutput?: boolean;
  /** Formato de origen (auto-detectar si no se especifica) */
  readonly sourceFormat?: SupportedOutputFormat;
}

/**
 * Resultado de conversión
 */
export interface ConversionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly sourceFormat: SupportedOutputFormat;
  readonly targetFormat: SupportedOutputFormat;
  readonly errors: readonly FormatError[];
  readonly warnings: readonly FormatWarning[];
}

/**
 * Resultado de detección de formato
 */
export interface FormatDetectionResult {
  readonly detected: SupportedOutputFormat | null;
  readonly confidence: number;
  readonly alternatives: readonly { format: SupportedOutputFormat; confidence: number }[];
}

/**
 * Puerto de Formateador de Salida
 *
 * Define el contrato para formatear salida del agente.
 * Soporta múltiples formatos de serialización.
 */
export interface OutputFormatterPort {
  /**
   * Formatea workflow a formato especificado
   * @param workflow - Workflow n8n a formatear
   * @param options - Opciones de formateo
   * @returns Resultado con string formateado o errores
   */
  format(workflow: N8nWorkflow, options: FormatOptions): FormatResult;

  /**
   * Formatea a JSON
   * @param workflow - Workflow n8n
   * @param options - Opciones adicionales
   * @returns Resultado con JSON string
   */
  toJson(workflow: N8nWorkflow, options?: Partial<FormatOptions>): FormatResult;

  /**
   * Formatea a YAML
   * @param workflow - Workflow n8n
   * @param options - Opciones adicionales
   * @returns Resultado con YAML string
   */
  toYaml(workflow: N8nWorkflow, options?: Partial<FormatOptions>): FormatResult;

  /**
   * Formatea a JSON5
   * @param workflow - Workflow n8n
   * @param options - Opciones adicionales
   * @returns Resultado con JSON5 string
   */
  toJson5(workflow: N8nWorkflow, options?: Partial<FormatOptions>): FormatResult;

  /**
   * Convierte entre formatos
   * @param input - String de entrada
   * @param targetFormat - Formato objetivo
   * @param options - Opciones de conversión
   * @returns Resultado de conversión
   */
  convert(
    input: string,
    targetFormat: SupportedOutputFormat,
    options?: ConversionOptions
  ): ConversionResult;

  /**
   * Detecta formato de un string
   * @param input - String de entrada
   * @returns Resultado de detección
   */
  detectFormat(input: string): FormatDetectionResult;

  /**
   * Parsea string a objeto
   * @param input - String de entrada
   * @param format - Formato (auto-detectar si no se especifica)
   * @returns Objeto parseado o error
   */
  parse<T = unknown>(
    input: string,
    format?: SupportedOutputFormat
  ): { success: boolean; data?: T; error?: string };

  /**
   * Minifica salida
   * @param input - String de entrada
   * @param format - Formato del input
   * @returns String minificado
   */
  minify(input: string, format: SupportedOutputFormat): string;

  /**
   * Prettifica salida
   * @param input - String de entrada
   * @param format - Formato del input
   * @param indent - Indentación
   * @returns String prettificado
   */
  prettify(input: string, format: SupportedOutputFormat, indent?: number): string;

  /**
   * Obtiene información de un formato
   * @param format - Formato a consultar
   * @returns Información del formato
   */
  getFormatInfo(format: SupportedOutputFormat): FormatInfo;

  /**
   * Lista todos los formatos soportados
   * @returns Array de información de formatos
   */
  getSupportedFormats(): readonly FormatInfo[];

  /**
   * Verifica si un formato es soportado
   * @param format - Formato a verificar
   * @returns true si es soportado
   */
  isFormatSupported(format: string): format is SupportedOutputFormat;

  /**
   * Registra transformación personalizada
   * @param transformation - Transformación a registrar
   */
  registerTransformation(transformation: OutputTransformation): void;

  /**
   * Aplica transformaciones registradas
   * @param input - String de entrada
   * @param format - Formato
   * @param transformations - Nombres de transformaciones a aplicar
   * @returns String transformado
   */
  applyTransformations(
    input: string,
    format: SupportedOutputFormat,
    transformations: readonly string[]
  ): string;
}

/**
 * Información de formatos soportados
 */
export const FORMAT_INFO: Record<SupportedOutputFormat, FormatInfo> = {
  json: {
    name: 'json',
    extension: '.json',
    mimeType: 'application/json',
    description: 'JavaScript Object Notation',
    supportsComments: false,
  },
  yaml: {
    name: 'yaml',
    extension: '.yaml',
    mimeType: 'application/x-yaml',
    description: "YAML Ain't Markup Language",
    supportsComments: true,
  },
  json5: {
    name: 'json5',
    extension: '.json5',
    mimeType: 'application/json5',
    description: 'JSON5 (JSON with comments and trailing commas)',
    supportsComments: true,
  },
  toml: {
    name: 'toml',
    extension: '.toml',
    mimeType: 'application/toml',
    description: "Tom's Obvious Minimal Language",
    supportsComments: true,
  },
} as const;

/**
 * Opciones por defecto de formateo
 */
export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  format: 'json',
  indent: 2,
  useTabs: false,
  lineWidth: 120,
  includeComments: false,
  sortKeys: false,
  quoteStyle: 'double',
  includeBom: false,
  eol: 'lf',
} as const;

/**
 * Códigos de error de formateo
 */
export const FORMAT_ERROR_CODES = {
  UNSUPPORTED_FORMAT: 'FMT001',
  PARSE_ERROR: 'FMT002',
  SERIALIZATION_ERROR: 'FMT003',
  CONVERSION_ERROR: 'FMT004',
  INVALID_INPUT: 'FMT005',
  TRANSFORMATION_ERROR: 'FMT006',
} as const;
