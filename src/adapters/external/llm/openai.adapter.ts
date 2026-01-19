/**
 * OpenAI Adapter - Cliente para OpenAI API
 * 
 * Implementa LlmPort con retry logic, caché y manejo de errores.
 */

import type {
  LlmPort,
  LlmConfig,
  LlmModel,
  CompletionParams,
  CompletionResult,
  StreamEvent,
  EmbeddingResult,
  ChatMessage,
  LlmUsageStats,
  LlmError,
  TokenUsage,
  FinishReason,
} from '#ports/external/llm.port.js';

import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_COMPLETION_PARAMS,
  LLM_ERROR_CODES,
} from '#ports/external/llm.port.js';

import type { RetryOptions, AdapterStats } from './types.js';
import {
  DEFAULT_RETRY_OPTIONS,
  createLlmError,
  createSuccessResult,
  createErrorResult,
  generateRequestId,
  calculateBackoffDelay,
  isRetryableError,
} from './types.js';

import { LlmCache } from './cache.js';

/**
 * Respuesta de la API de OpenAI
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Adaptador OpenAI
 */
export class OpenAIAdapter implements LlmPort {
  private config: LlmConfig;
  private retryOptions: RetryOptions;
  private cache: LlmCache<CompletionResult>;
  private stats: AdapterStats;
  private usageByModel: Map<string, { calls: number; tokens: number; errors: number }>;

  constructor(
    config: Partial<LlmConfig> = {},
    retryOptions: Partial<RetryOptions> = {}
  ) {
    this.config = {
      ...DEFAULT_LLM_CONFIG,
      provider: 'openai',
      ...config,
    };
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
    this.cache = new LlmCache();
    this.stats = this.initStats();
    this.usageByModel = new Map();
  }

  private initStats(): AdapterStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      totalLatencyMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryCount: 0,
    };
  }

  /**
   * Genera completado de chat
   */
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const mergedParams = { ...DEFAULT_COMPLETION_PARAMS, ...params };

    this.stats.totalRequests++;

    // Check cache
    const cacheKey = this.getCacheKey(mergedParams);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      this.stats.cacheHits++;
      return cachedResult;
    }
    this.stats.cacheMisses++;

    // Intentar con retry
    let lastError: LlmError | undefined;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const result = await this.executeRequest(mergedParams, requestId, attempt);
        
        // Actualizar stats
        this.stats.successfulRequests++;
        this.stats.totalLatencyMs += Date.now() - startTime;
        this.stats.totalTokensUsed += result.usage.totalTokens;
        this.updateModelStats(result.model, result.usage.totalTokens, false);

        // Cache resultado exitoso
        this.cache.set(cacheKey, result);

        return result;
      } catch (error) {
        lastError = this.normalizeError(error);

        if (!isRetryableError(lastError) || attempt >= this.retryOptions.maxRetries) {
          break;
        }

        this.stats.retryCount++;
        const delay = calculateBackoffDelay(attempt, this.retryOptions);
        await this.sleep(delay);
      }
    }

    // Error final
    this.stats.failedRequests++;
    this.stats.totalLatencyMs += Date.now() - startTime;
    this.updateModelStats(this.config.model, 0, true);

    return createErrorResult(
      lastError ?? createLlmError(LLM_ERROR_CODES.UNKNOWN, 'Unknown error', 'unknown', false),
      this.config.model,
      requestId
    );
  }

  /**
   * Ejecuta request a la API
   */
  private async executeRequest(
    params: CompletionParams,
    requestId: string,
    _attempt: number
  ): Promise<CompletionResult> {
    const url = `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey ?? ''}`,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    const body = this.buildRequestBody(params);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 60000
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      const data = await response.json() as OpenAIResponse;
      return this.parseResponse(data, requestId);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Construye body del request
   */
  private buildRequestBody(params: CompletionParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.name && { name: m.name }),
        ...(m.toolCalls && { tool_calls: m.toolCalls }),
        ...(m.toolCallId && { tool_call_id: m.toolCallId }),
      })),
    };

    if (params.temperature !== undefined) {
      body['temperature'] = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      body['max_tokens'] = params.maxTokens;
    }
    if (params.topP !== undefined) {
      body['top_p'] = params.topP;
    }
    if (params.frequencyPenalty !== undefined) {
      body['frequency_penalty'] = params.frequencyPenalty;
    }
    if (params.presencePenalty !== undefined) {
      body['presence_penalty'] = params.presencePenalty;
    }
    if (params.stopSequences?.length) {
      body['stop'] = params.stopSequences;
    }
    if (params.seed !== undefined) {
      body['seed'] = params.seed;
    }
    if (params.user) {
      body['user'] = params.user;
    }
    if (params.tools?.length) {
      body['tools'] = params.tools;
    }
    if (params.toolChoice) {
      body['tool_choice'] = params.toolChoice;
    }
    if (params.responseFormat) {
      body['response_format'] = params.responseFormat;
    }
    if (params.stream) {
      body['stream'] = true;
    }

    return body;
  }

  /**
   * Parsea respuesta de OpenAI
   */
  private parseResponse(data: OpenAIResponse, _requestId: string): CompletionResult {
    const choice = data.choices[0];
    if (!choice) {
      throw createLlmError(
        LLM_ERROR_CODES.INVALID_REQUEST,
        'No choices in response',
        'invalid_request',
        false
      );
    }

    const usage: TokenUsage = {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    };

    const finishReason = this.mapFinishReason(choice.finish_reason);

    return createSuccessResult(
      choice.message.content ?? '',
      usage,
      data.model,
      data.id,
      finishReason
    );
  }

  /**
   * Mapea finish_reason de OpenAI a nuestro tipo
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_calls';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }

  /**
   * Genera completado con streaming
   */
  async *completeStream(params: CompletionParams): AsyncIterable<StreamEvent> {
    const url = `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`;
    const mergedParams = { ...DEFAULT_COMPLETION_PARAMS, ...params, stream: true };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey ?? ''}`,
    };

    const body = this.buildRequestBody(mergedParams);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.handleHttpError(response);
        yield { type: 'error', error };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: createLlmError(
          LLM_ERROR_CODES.NETWORK_ERROR,
          'No response body',
          'network',
          false
        )};
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                yield { type: 'content', content: delta.content };
              }
            } catch {
              // Ignorar líneas mal formadas
            }
          }
        }
      }

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: this.normalizeError(error) };
    }
  }

  /**
   * Genera embeddings
   */
  async embed(texts: readonly string[], model?: string): Promise<EmbeddingResult> {
    const url = `${this.config.baseUrl ?? 'https://api.openai.com/v1'}/embeddings`;
    const embeddingModel = model ?? 'text-embedding-3-small';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey ?? ''}`,
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await this.handleHttpError(response);
        return { success: false, error };
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
        usage: { prompt_tokens: number; total_tokens: number };
      };

      return {
        success: true,
        embeddings: data.data.map(d => d.embedding),
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: 0,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      return { success: false, error: this.normalizeError(error) };
    }
  }

  /**
   * Cuenta tokens (aproximación)
   */
  countTokens(text: string, _model?: LlmModel): number {
    // Aproximación simple: ~4 caracteres por token para inglés
    // Para una implementación real, usar tiktoken
    return Math.ceil(text.length / 4);
  }

  /**
   * Cuenta tokens de mensajes
   */
  countMessageTokens(messages: readonly ChatMessage[], model?: LlmModel): number {
    let tokens = 0;
    for (const msg of messages) {
      tokens += this.countTokens(msg.content, model);
      tokens += 4; // Overhead por mensaje
    }
    return tokens;
  }

  /**
   * Verifica disponibilidad
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey ?? ''}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene modelos disponibles
   */
  async getAvailableModels(): Promise<readonly LlmModel[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey ?? ''}` },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { data: Array<{ id: string }> };
      return data.data
        .map(m => m.id)
        .filter(id => id.startsWith('gpt-')) as LlmModel[];
    } catch {
      return [];
    }
  }

  /**
   * Configura el cliente
   */
  configure(config: Partial<LlmConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): LlmConfig {
    return { ...this.config };
  }

  /**
   * Obtiene estadísticas de uso
   */
  getUsageStats(): LlmUsageStats {
    return {
      totalCalls: this.stats.totalRequests,
      totalPromptTokens: Math.floor(this.stats.totalTokensUsed * 0.7),
      totalCompletionTokens: Math.floor(this.stats.totalTokensUsed * 0.3),
      averageLatencyMs: this.stats.totalRequests > 0
        ? this.stats.totalLatencyMs / this.stats.totalRequests
        : 0,
      errorRate: this.stats.totalRequests > 0
        ? this.stats.failedRequests / this.stats.totalRequests
        : 0,
      byModel: this.usageByModel,
    };
  }

  /**
   * Reinicia estadísticas
   */
  resetUsageStats(): void {
    this.stats = this.initStats();
    this.usageByModel.clear();
  }

  /**
   * Crea mensaje de sistema para workflows
   */
  createWorkflowSystemMessage(context?: {
    n8nVersion?: string;
    allowedNodes?: readonly string[];
    constraints?: readonly string[];
  }): ChatMessage {
    const version = context?.n8nVersion ?? '1.0.0';
    const allowedNodes = context?.allowedNodes?.join(', ') ?? 'all standard n8n nodes';
    const constraints = context?.constraints?.map(c => `- ${c}`).join('\n') ?? '';

    return {
      role: 'system',
      content: `You are an expert n8n workflow generator. Your task is to create valid n8n workflow JSON.

n8n Version: ${version}
Allowed Nodes: ${allowedNodes}

Rules:
- Generate valid JSON that can be imported directly into n8n
- Each node must have unique id, name, type, typeVersion, position, and parameters
- Connections must reference existing node names
- Use proper node types from n8n-nodes-base package
- Position nodes logically (left to right, trigger first)
${constraints ? `\nConstraints:\n${constraints}` : ''}

Output Format: Return ONLY valid JSON, no explanations.`,
    };
  }

  /**
   * Parsea respuesta JSON
   */
  parseJsonResponse<T = unknown>(content: string): { success: boolean; data?: T; error?: string } {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      
      const jsonStr = jsonMatch[1] ?? content;
      const data = JSON.parse(jsonStr.trim()) as T;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse JSON',
      };
    }
  }

  // Métodos privados auxiliares

  private getCacheKey(params: CompletionParams): string {
    return JSON.stringify({
      model: this.config.model,
      messages: params.messages,
      temperature: params.temperature,
    });
  }

  private async handleHttpError(response: Response): Promise<LlmError> {
    let errorBody: { error?: { message?: string; type?: string; code?: string } } = {};
    try {
      errorBody = await response.json() as typeof errorBody;
    } catch {
      // Ignorar error de parsing
    }

    const message = errorBody.error?.message ?? `HTTP ${response.status}`;

    if (response.status === 401) {
      return createLlmError(LLM_ERROR_CODES.AUTH_FAILED, message, 'authentication', false);
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
      return createLlmError(LLM_ERROR_CODES.RATE_LIMITED, message, 'rate_limit', true, retryAfter * 1000);
    }
    if (response.status === 400) {
      return createLlmError(LLM_ERROR_CODES.INVALID_REQUEST, message, 'invalid_request', false);
    }
    if (response.status >= 500) {
      return createLlmError(LLM_ERROR_CODES.MODEL_ERROR, message, 'model_error', true);
    }

    return createLlmError(LLM_ERROR_CODES.UNKNOWN, message, 'unknown', false);
  }

  private normalizeError(error: unknown): LlmError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as LlmError;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return createLlmError(LLM_ERROR_CODES.TIMEOUT, 'Request timeout', 'timeout', true);
      }
      return createLlmError(LLM_ERROR_CODES.NETWORK_ERROR, error.message, 'network', true);
    }

    return createLlmError(LLM_ERROR_CODES.UNKNOWN, String(error), 'unknown', false);
  }

  private updateModelStats(model: string, tokens: number, isError: boolean): void {
    const existing = this.usageByModel.get(model) ?? { calls: 0, tokens: 0, errors: 0 };
    this.usageByModel.set(model, {
      calls: existing.calls + 1,
      tokens: existing.tokens + tokens,
      errors: existing.errors + (isError ? 1 : 0),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory para crear adaptador OpenAI
 */
export function createOpenAIAdapter(
  apiKey?: string,
  config?: Partial<LlmConfig>
): LlmPort {
  return new OpenAIAdapter({
    apiKey: apiKey ?? process.env['OPENAI_API_KEY'],
    ...config,
  });
}
