/**
 * CLI Types - Tipos para el adaptador CLI
 *
 * Define las estructuras de datos para comandos y opciones del CLI.
 */

import type { OutputFormat } from '@core/domain/types/prompt.types.js';

/**
 * Opciones globales del CLI
 */
export interface CliGlobalOptions {
  /** Modo estricto - rechaza ambigüedades */
  readonly strict: boolean;
  /** Mostrar versión y salir */
  readonly version: boolean;
  /** Modo verbose - más información de debug */
  readonly verbose: boolean;
  /** Modo silencioso - solo output esencial */
  readonly quiet: boolean;
  /** Archivo de configuración */
  readonly config?: string;
  /** Directorio de salida */
  readonly output?: string;
  /** Formato de salida */
  readonly format: OutputFormat;
}

/**
 * Opciones del comando generate
 */
export interface GenerateCommandOptions extends CliGlobalOptions {
  /** Archivo de entrada (prompt) */
  readonly input: string;
  /** Solo validar, no generar */
  readonly validateOnly: boolean;
  /** Versión de n8n objetivo */
  readonly n8nVersion?: string;
  /** Incluir metadatos en salida */
  readonly includeMetadata: boolean;
  /** Auto-layout de nodos */
  readonly autoLayout: boolean;
  /** Forzar sobrescritura de archivo */
  readonly force: boolean;
}

/**
 * Opciones del comando validate
 */
export interface ValidateCommandOptions extends CliGlobalOptions {
  /** Archivo a validar */
  readonly input: string;
  /** Schema contra el cual validar */
  readonly schema?: string;
  /** Mostrar reporte detallado */
  readonly detailed: boolean;
}

/**
 * Opciones del comando parse
 */
export interface ParseCommandOptions extends CliGlobalOptions {
  /** Archivo a parsear */
  readonly input: string;
  /** Mostrar AST */
  readonly showAst: boolean;
  /** Mostrar tokens */
  readonly showTokens: boolean;
}

/**
 * Resultado de ejecución del CLI
 */
export interface CliExecutionResult {
  readonly success: boolean;
  readonly exitCode: number;
  readonly output?: string;
  readonly error?: CliError;
  readonly stats?: CliExecutionStats;
}

/**
 * Error del CLI
 */
export interface CliError {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly cause?: Error;
}

/**
 * Estadísticas de ejecución
 */
export interface CliExecutionStats {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMs: number;
  readonly inputFile?: string;
  readonly outputFile?: string;
  readonly nodesGenerated?: number;
  readonly connectionsGenerated?: number;
}

/**
 * Comando del CLI
 */
export type CliCommand = 'generate' | 'validate' | 'parse' | 'help' | 'version';

/**
 * Contexto de ejecución del CLI
 */
export interface CliContext {
  readonly command: CliCommand;
  readonly options: CliGlobalOptions;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly startTime: Date;
}

/**
 * Logger del CLI
 */
export interface CliLogger {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  spinner: {
    start(message: string): void;
    stop(success?: boolean, message?: string): void;
    update(message: string): void;
  };
}

/**
 * Códigos de salida del CLI
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR_GENERAL: 1,
  ERROR_INVALID_INPUT: 2,
  ERROR_FILE_NOT_FOUND: 3,
  ERROR_VALIDATION_FAILED: 4,
  ERROR_PARSE_FAILED: 5,
  ERROR_GENERATION_FAILED: 6,
  ERROR_WRITE_FAILED: 7,
  ERROR_CONFIG: 8,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/**
 * Códigos de error del CLI
 */
export const CLI_ERROR_CODES = {
  FILE_NOT_FOUND: 'CLI001',
  INVALID_INPUT: 'CLI002',
  PARSE_ERROR: 'CLI003',
  VALIDATION_ERROR: 'CLI004',
  GENERATION_ERROR: 'CLI005',
  WRITE_ERROR: 'CLI006',
  CONFIG_ERROR: 'CLI007',
  UNKNOWN_COMMAND: 'CLI008',
  MISSING_REQUIRED: 'CLI009',
} as const;
