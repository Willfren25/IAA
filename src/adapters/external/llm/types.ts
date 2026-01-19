/**
 * LLM Adapter Types - Tipos compartidos para adaptadores LLM
 */

import type {
  LlmConfig,
  LlmError,
  LlmErrorType,
  TokenUsage,
  CompletionResult,
  FinishReason,
} from '#ports/external/llm.port.js';

/**
 * Opciones de retry
 */
export interface RetryOptions {
  /** Máximo de reintentos */
  readonly maxRetries: number;
  /** Delay base en ms */
  readonly baseDelay: number;
  /** Factor de backoff exponencial */
  readonly backoffFactor: number;
  /** Delay máximo en ms */
  readonly maxDelay: number;
  /** Jitter aleatorio (0-1) */
  readonly jitter: number;
}

/**
 * Opciones de caché
 */
export interface CacheOptions {
  /** Habilitar caché */
  readonly enabled: boolean;
  /** TTL en ms */
  readonly ttlMs: number;
  /** Máximo de entradas */
  readonly maxEntries: number;
  /** Función de hash personalizada */
  readonly hashFunction?: (input: string) => string;
}

/**
 * Entrada de caché
 */
export interface CacheEntry<T> {
  readonly value: T;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly hits: number;
}

/**
 * Estadísticas internas del adapter
 */
export interface AdapterStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalLatencyMs: number;
  cacheHits: number;
  cacheMisses: number;
  retryCount: number;
}

/**
 * Contexto de request interno
 */
export interface RequestContext {
  readonly requestId: string;
  readonly startTime: number;
  readonly attempt: number;
  readonly config: LlmConfig;
}

/**
 * Opciones por defecto de retry
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffFactor: 2,
  maxDelay: 30000,
  jitter: 0.1,
} as const;

/**
 * Opciones por defecto de caché
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  enabled: true,
  ttlMs: 5 * 60 * 1000, // 5 minutos
  maxEntries: 100,
} as const;

/**
 * Crea error de LLM estructurado
 */
export function createLlmError(
  code: string,
  message: string,
  type: LlmErrorType,
  retryable: boolean,
  retryAfter?: number
): LlmError {
  return { code, message, type, retryable, retryAfter };
}

/**
 * Crea resultado de completado exitoso
 */
export function createSuccessResult(
  content: string,
  usage: TokenUsage,
  model: string,
  id: string,
  finishReason: FinishReason = 'stop'
): CompletionResult {
  return {
    success: true,
    content,
    finishReason,
    usage,
    model,
    id,
  };
}

/**
 * Crea resultado de completado fallido
 */
export function createErrorResult(
  error: LlmError,
  model: string,
  id: string
): CompletionResult {
  return {
    success: false,
    finishReason: 'error',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model,
    id,
    error,
  };
}

/**
 * Genera ID único para request
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Calcula delay con exponential backoff y jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  options: RetryOptions
): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffFactor, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
  const jitterAmount = cappedDelay * options.jitter * Math.random();
  return Math.floor(cappedDelay + jitterAmount);
}

/**
 * Determina si un error es retriable
 */
export function isRetryableError(error: LlmError): boolean {
  return error.retryable && (
    error.type === 'rate_limit' ||
    error.type === 'timeout' ||
    error.type === 'network'
  );
}
