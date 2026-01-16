/**
 * LLM Port - Interfaz para razonamiento con LLM
 *
 * Define el contrato agnóstico para interactuar con modelos de lenguaje.
 * Soporta OpenAI, Anthropic, y otros proveedores.
 */

/**
 * Proveedor de LLM soportado
 */
export type LlmProvider = 'openai' | 'anthropic' | 'azure-openai' | 'ollama' | 'custom';

/**
 * Modelo de LLM
 */
export type LlmModel =
  // OpenAI
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  // Anthropic
  | 'claude-3-5-sonnet-latest'
  | 'claude-3-opus-latest'
  | 'claude-3-haiku-20240307'
  // Generic
  | string;

/**
 * Rol de mensaje
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

/**
 * Mensaje de chat
 */
export interface ChatMessage {
  readonly role: MessageRole;
  readonly content: string;
  readonly name?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolCallId?: string;
}

/**
 * Llamada a herramienta
 */
export interface ToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

/**
 * Definición de herramienta
 */
export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly strict?: boolean;
  };
}

/**
 * Configuración del LLM
 */
export interface LlmConfig {
  /** Proveedor de LLM */
  readonly provider: LlmProvider;
  /** Modelo a usar */
  readonly model: LlmModel;
  /** API Key */
  readonly apiKey?: string;
  /** URL base de la API */
  readonly baseUrl?: string;
  /** Organización (OpenAI) */
  readonly organization?: string;
  /** Timeout en ms */
  readonly timeout?: number;
  /** Máximo de reintentos */
  readonly maxRetries?: number;
}

/**
 * Parámetros de completado
 */
export interface CompletionParams {
  /** Mensajes de conversación */
  readonly messages: readonly ChatMessage[];
  /** Temperatura (creatividad) */
  readonly temperature?: number;
  /** Top P (nucleus sampling) */
  readonly topP?: number;
  /** Máximo de tokens de respuesta */
  readonly maxTokens?: number;
  /** Tokens de parada */
  readonly stopSequences?: readonly string[];
  /** Penalización por frecuencia */
  readonly frequencyPenalty?: number;
  /** Penalización por presencia */
  readonly presencePenalty?: number;
  /** Semilla para reproducibilidad */
  readonly seed?: number;
  /** Herramientas disponibles */
  readonly tools?: readonly ToolDefinition[];
  /** Elección de herramienta */
  readonly toolChoice?:
    | 'auto'
    | 'none'
    | 'required'
    | { type: 'function'; function: { name: string } };
  /** Formato de respuesta */
  readonly responseFormat?: ResponseFormat;
  /** Streaming */
  readonly stream?: boolean;
  /** Usuario identificador */
  readonly user?: string;
}

/**
 * Formato de respuesta estructurada
 */
export interface ResponseFormat {
  readonly type: 'text' | 'json_object' | 'json_schema';
  readonly jsonSchema?: {
    readonly name: string;
    readonly description?: string;
    readonly schema: Record<string, unknown>;
    readonly strict?: boolean;
  };
}

/**
 * Resultado de completado
 */
export interface CompletionResult {
  readonly success: boolean;
  readonly content?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly finishReason: FinishReason;
  readonly usage: TokenUsage;
  readonly model: string;
  readonly id: string;
  readonly error?: LlmError;
}

/**
 * Razón de finalización
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';

/**
 * Uso de tokens
 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens?: number;
}

/**
 * Error de LLM
 */
export interface LlmError {
  readonly code: string;
  readonly message: string;
  readonly type: LlmErrorType;
  readonly retryable: boolean;
  readonly retryAfter?: number;
}

/**
 * Tipo de error de LLM
 */
export type LlmErrorType =
  | 'authentication'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'invalid_request'
  | 'model_error'
  | 'timeout'
  | 'network'
  | 'unknown';

/**
 * Evento de streaming
 */
export interface StreamEvent {
  readonly type: 'content' | 'tool_call' | 'done' | 'error';
  readonly content?: string;
  readonly toolCall?: Partial<ToolCall>;
  readonly error?: LlmError;
  readonly usage?: TokenUsage;
}

/**
 * Resultado de embedding
 */
export interface EmbeddingResult {
  readonly success: boolean;
  readonly embeddings?: readonly number[][];
  readonly usage?: TokenUsage;
  readonly error?: LlmError;
}

/**
 * Estadísticas de uso del LLM
 */
export interface LlmUsageStats {
  readonly totalCalls: number;
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly averageLatencyMs: number;
  readonly errorRate: number;
  readonly byModel: Map<
    string,
    {
      calls: number;
      tokens: number;
      errors: number;
    }
  >;
}

/**
 * Puerto de LLM
 *
 * Define el contrato agnóstico para interactuar con LLMs.
 * Permite intercambiar proveedores sin cambiar código de aplicación.
 */
export interface LlmPort {
  /**
   * Genera completado de chat
   * @param params - Parámetros de completado
   * @returns Resultado de completado
   */
  complete(params: CompletionParams): Promise<CompletionResult>;

  /**
   * Genera completado con streaming
   * @param params - Parámetros de completado
   * @returns AsyncIterator de eventos
   */
  completeStream(params: CompletionParams): AsyncIterable<StreamEvent>;

  /**
   * Genera embeddings de texto
   * @param texts - Textos a embeber
   * @param model - Modelo de embeddings
   * @returns Resultado con embeddings
   */
  embed(texts: readonly string[], model?: string): Promise<EmbeddingResult>;

  /**
   * Cuenta tokens de un texto
   * @param text - Texto a contar
   * @param model - Modelo para tokenización
   * @returns Número de tokens
   */
  countTokens(text: string, model?: LlmModel): number;

  /**
   * Cuenta tokens de mensajes
   * @param messages - Mensajes de chat
   * @param model - Modelo para tokenización
   * @returns Número de tokens
   */
  countMessageTokens(messages: readonly ChatMessage[], model?: LlmModel): number;

  /**
   * Verifica disponibilidad del servicio
   * @returns true si el servicio está disponible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Obtiene modelos disponibles
   * @returns Array de modelos
   */
  getAvailableModels(): Promise<readonly LlmModel[]>;

  /**
   * Configura el cliente LLM
   * @param config - Configuración
   */
  configure(config: Partial<LlmConfig>): void;

  /**
   * Obtiene configuración actual
   * @returns Configuración actual
   */
  getConfig(): LlmConfig;

  /**
   * Obtiene estadísticas de uso
   * @returns Estadísticas
   */
  getUsageStats(): LlmUsageStats;

  /**
   * Reinicia estadísticas de uso
   */
  resetUsageStats(): void;

  /**
   * Crea mensaje de sistema optimizado para generación de workflows
   * @param context - Contexto adicional
   * @returns Mensaje de sistema
   */
  createWorkflowSystemMessage(context?: {
    n8nVersion?: string;
    allowedNodes?: readonly string[];
    constraints?: readonly string[];
  }): ChatMessage;

  /**
   * Parsea respuesta JSON del LLM
   * @param content - Contenido de respuesta
   * @returns Objeto parseado o error
   */
  parseJsonResponse<T = unknown>(content: string): { success: boolean; data?: T; error?: string };
}

/**
 * Configuración por defecto del LLM
 */
export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  timeout: 60000,
  maxRetries: 3,
} as const;

/**
 * Parámetros por defecto de completado
 */
export const DEFAULT_COMPLETION_PARAMS: Partial<CompletionParams> = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
} as const;

/**
 * Códigos de error de LLM
 */
export const LLM_ERROR_CODES = {
  AUTH_FAILED: 'LLM001',
  RATE_LIMITED: 'LLM002',
  QUOTA_EXCEEDED: 'LLM003',
  INVALID_REQUEST: 'LLM004',
  MODEL_ERROR: 'LLM005',
  TIMEOUT: 'LLM006',
  NETWORK_ERROR: 'LLM007',
  PARSE_ERROR: 'LLM008',
  UNKNOWN: 'LLM999',
} as const;

/**
 * Límites de tokens por modelo
 */
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  'claude-3-5-sonnet-latest': 200000,
  'claude-3-opus-latest': 200000,
  'claude-3-haiku-20240307': 200000,
} as const;
