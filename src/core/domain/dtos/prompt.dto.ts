/**
 * Prompt DTOs - Data Transfer Objects for Prompt Contract transformations
 */

import type { OutputFormat, HttpMethod, PromptTriggerType } from '../types/prompt.types.js';

/**
 * DTO para input de prompt raw
 */
export interface RawPromptInputDTO {
  readonly content: string;
  readonly format: 'dsl' | 'natural' | 'json-partial';
  readonly strictMode?: boolean;
}

/**
 * DTO de meta parseada
 */
export interface ParsedMetaDTO {
  readonly n8nVersion: string;
  readonly outputFormat: OutputFormat;
  readonly isStrict: boolean;
}

/**
 * DTO de trigger parseado
 */
export interface ParsedTriggerDTO {
  readonly type: PromptTriggerType;
  readonly httpMethod?: HttpMethod;
  readonly path?: string;
  readonly schedule?: string;
}

/**
 * DTO de paso parseado
 */
export interface ParsedStepDTO {
  readonly number: number;
  readonly description: string;
  readonly inferredNodeType?: string;
  readonly parameters?: Record<string, unknown>;
  readonly conditions?: string;
}

/**
 * DTO de contrato parseado completo
 */
export interface ParsedContractDTO {
  readonly meta: ParsedMetaDTO;
  readonly trigger: ParsedTriggerDTO;
  readonly steps: readonly ParsedStepDTO[];
  readonly constraints?: Record<string, unknown>;
  readonly assumptions?: Record<string, unknown>;
}

/**
 * DTO de resultado de parsing
 */
export interface ParseResultDTO {
  readonly success: boolean;
  readonly contract?: ParsedContractDTO;
  readonly errors: readonly ParseErrorDTO[];
  readonly warnings: readonly string[];
  readonly parseTimeMs: number;
}

/**
 * DTO de error de parsing
 */
export interface ParseErrorDTO {
  readonly code: string;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly section?: string;
}

/**
 * DTO para transformación LLM
 */
export interface LLMTransformRequestDTO {
  readonly parsedContract: ParsedContractDTO;
  readonly context?: string;
  readonly examples?: readonly string[];
}

/**
 * DTO de respuesta LLM
 */
export interface LLMTransformResponseDTO {
  readonly success: boolean;
  readonly suggestedNodes: readonly SuggestedNodeDTO[];
  readonly suggestedConnections: readonly SuggestedConnectionDTO[];
  readonly reasoning?: string;
  readonly confidence: number;
}

/**
 * DTO de nodo sugerido por LLM
 */
export interface SuggestedNodeDTO {
  readonly stepNumber: number;
  readonly nodeType: string;
  readonly nodeName: string;
  readonly parameters: Record<string, unknown>;
  readonly confidence: number;
}

/**
 * DTO de conexión sugerida por LLM
 */
export interface SuggestedConnectionDTO {
  readonly fromStep: number;
  readonly toStep: number;
  readonly outputIndex?: number;
  readonly inputIndex?: number;
}
