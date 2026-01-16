/**
 * Prompt Contract Port - Contrato semiestructurado de entrada
 *
 * Define la interfaz para procesar contratos de prompt DSL.
 * Soporta secciones: @meta, @trigger, @workflow, @constraints, @assumptions
 */

import type {
  PromptContract,
  PromptMeta,
  PromptTrigger,
  WorkflowStep,
  PromptConstraints,
  PromptAssumptions,
  OutputFormat,
} from '@core/domain/types/prompt.types.js';

/**
 * Sección del contrato de prompt
 */
export type PromptSection = '@meta' | '@trigger' | '@workflow' | '@constraints' | '@assumptions';

/**
 * Estado de parsing de una sección
 */
export interface SectionParseState {
  readonly section: PromptSection;
  readonly found: boolean;
  readonly valid: boolean;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly errors?: string[];
}

/**
 * Resultado de extracción de sección
 */
export interface SectionExtractionResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly rawContent?: string;
  readonly errors?: string[];
  readonly warnings?: string[];
}

/**
 * Opciones para el procesamiento del contrato
 */
export interface PromptContractOptions {
  /** Modo estricto - rechaza ambigüedades */
  readonly strictMode?: boolean;
  /** Versión de n8n objetivo */
  readonly targetN8nVersion?: string;
  /** Formato de salida deseado */
  readonly outputFormat?: OutputFormat;
  /** Permitir secciones opcionales faltantes */
  readonly allowMissingSections?: boolean;
  /** Validar contra schema JSON */
  readonly validateSchema?: boolean;
}

/**
 * Resultado de validación del contrato
 */
export interface ContractValidationResult {
  readonly isValid: boolean;
  readonly sections: readonly SectionParseState[];
  readonly missingRequired: readonly PromptSection[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Resultado de conversión a PromptContract
 */
export interface ContractConversionResult {
  readonly success: boolean;
  readonly contract?: PromptContract;
  readonly validationResult: ContractValidationResult;
  readonly processingTimeMs: number;
}

/**
 * Puerto de Contrato de Prompt
 *
 * Define el contrato para procesar entrada DSL semiestructurada.
 * Implementa el patrón Port en arquitectura hexagonal.
 */
export interface PromptContractPort {
  /**
   * Extrae la sección @meta del prompt
   * @param rawInput - Input crudo del usuario
   * @returns Resultado con PromptMeta o errores
   */
  extractMeta(rawInput: string): SectionExtractionResult<PromptMeta>;

  /**
   * Extrae la sección @trigger del prompt
   * @param rawInput - Input crudo del usuario
   * @returns Resultado con PromptTrigger o errores
   */
  extractTrigger(rawInput: string): SectionExtractionResult<PromptTrigger>;

  /**
   * Extrae la sección @workflow del prompt
   * @param rawInput - Input crudo del usuario
   * @returns Resultado con array de WorkflowStep o errores
   */
  extractWorkflow(rawInput: string): SectionExtractionResult<readonly WorkflowStep[]>;

  /**
   * Extrae la sección @constraints del prompt (opcional)
   * @param rawInput - Input crudo del usuario
   * @returns Resultado con PromptConstraints o errores
   */
  extractConstraints(rawInput: string): SectionExtractionResult<PromptConstraints>;

  /**
   * Extrae la sección @assumptions del prompt (opcional)
   * @param rawInput - Input crudo del usuario
   * @returns Resultado con PromptAssumptions o errores
   */
  extractAssumptions(rawInput: string): SectionExtractionResult<PromptAssumptions>;

  /**
   * Valida el contrato completo
   * @param rawInput - Input crudo del usuario
   * @param options - Opciones de validación
   * @returns Resultado de validación
   */
  validateContract(rawInput: string, options?: PromptContractOptions): ContractValidationResult;

  /**
   * Convierte input crudo a PromptContract estructurado
   * @param rawInput - Input crudo del usuario
   * @param options - Opciones de procesamiento
   * @returns Resultado con PromptContract o errores
   */
  toContract(rawInput: string, options?: PromptContractOptions): ContractConversionResult;

  /**
   * Verifica si el input contiene una sección específica
   * @param rawInput - Input crudo del usuario
   * @param section - Sección a buscar
   * @returns true si la sección existe
   */
  hasSection(rawInput: string, section: PromptSection): boolean;

  /**
   * Lista todas las secciones encontradas en el input
   * @param rawInput - Input crudo del usuario
   * @returns Array de secciones encontradas
   */
  listSections(rawInput: string): readonly PromptSection[];

  /**
   * Obtiene las secciones requeridas según el modo
   * @param strictMode - Si es modo estricto
   * @returns Array de secciones requeridas
   */
  getRequiredSections(strictMode: boolean): readonly PromptSection[];
}

/**
 * Secciones requeridas en modo normal
 */
export const REQUIRED_SECTIONS_NORMAL: readonly PromptSection[] = [
  '@meta',
  '@trigger',
  '@workflow',
] as const;

/**
 * Secciones requeridas en modo estricto
 */
export const REQUIRED_SECTIONS_STRICT: readonly PromptSection[] = [
  '@meta',
  '@trigger',
  '@workflow',
  '@constraints',
] as const;

/**
 * Todas las secciones soportadas
 */
export const ALL_SECTIONS: readonly PromptSection[] = [
  '@meta',
  '@trigger',
  '@workflow',
  '@constraints',
  '@assumptions',
] as const;
