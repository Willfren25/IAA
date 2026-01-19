/**
 * Anthropic Adapter - Cliente para Anthropic Claude API
 * 
 * Implementa LlmPort como fallback/alternativa a OpenAI.
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
 * Respuesta de Anthropic API
 */
interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Adaptador Anthropic
 */
export class AnthropicAdapter implements LlmPort {
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
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      timeout: 60000,
      maxRetries: 3,
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
        const result = await this.executeRequest(mergedParams, requestId);
        
        this.stats.successfulRequests++;
        this.stats.totalLatencyMs += Date.now() - startTime;
        this.stats.totalTokensUsed += result.usage.totalTokens;
        this.updateModelStats(result.model, result.usage.totalTokens, false);

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
   * Ejecuta request a Anthropic API
   */
  private async executeRequest(
    params: CompletionParams,
    requestId: string
  ): Promise<CompletionResult> {
    const url = `${this.config.baseUrl ?? 'https://api.anthropic.com/v1'}/messages`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    };

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

      const data = await response.json() as AnthropicResponse;
      return this.parseResponse(data, requestId);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Construye body del request para Anthropic
   */
  private buildRequestBody(params: CompletionParams): Record<string, unknown> {
    // Extraer mensaje de sistema si existe
    const systemMessage = params.messages.find(m => m.role === 'system');
    const nonSystemMessages = params.messages.filter(m => m.role !== 'system');

    // Convertir mensajes al formato Anthropic
    const messages = nonSystemMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
    };

    if (systemMessage) {
      body['system'] = systemMessage.content;
    }

    if (params.temperature !== undefined) {
      body['temperature'] = params.temperature;
    }
    if (params.topP !== undefined) {
      body['top_p'] = params.topP;
    }
    if (params.stopSequences?.length) {
      body['stop_sequences'] = params.stopSequences;
    }
    if (params.stream) {
      body['stream'] = true;
    }

    // Anthropic tools format
    if (params.tools?.length) {
      body['tools'] = params.tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    return body;
  }
  /**
   * Parsea respuesta de Anthropic
   */
  private parseResponse(data: AnthropicResponse, _requestId: string): CompletionResult {
    const textContent = data.content.find(c => c.type === 'text');
    const content = textContent?.text ?? '';

    const usage: TokenUsage = {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    };

    const finishReason = this.mapStopReason(data.stop_reason);

    return createSuccessResult(content, usage, data.model, data.id, finishReason);
  }

  /**
   * Mapea stop_reason de Anthropic
   */
  private mapStopReason(reason: string | null): FinishReason {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      default: return 'stop';
    }
  }

  /**
   * Genera completado con streaming
   */
  async *completeStream(params: CompletionParams): AsyncIterable<StreamEvent> {
    const url = `${this.config.baseUrl ?? 'https://api.anthropic.com/v1'}/messages`;
    const mergedParams = { ...DEFAULT_COMPLETION_PARAMS, ...params, stream: true };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
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
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta;
                if (delta?.type === 'text_delta' && delta?.text) {
                  yield { type: 'content', content: delta.text };
                }
              } else if (parsed.type === 'message_stop') {
                yield { type: 'done' };
                return;
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
   * Anthropic no tiene embeddings nativos
   */
  async embed(_texts: readonly string[], _model?: string): Promise<EmbeddingResult> {
    return {
      success: false,
      error: createLlmError(
        LLM_ERROR_CODES.INVALID_REQUEST,
        'Anthropic does not support embeddings',
        'invalid_request',
        false
      ),
    };
  }

  /**
   * Cuenta tokens (aproximación)
   */
  countTokens(text: string, _model?: LlmModel): number {
    // Claude usa aproximadamente 3.5 caracteres por token
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Cuenta tokens de mensajes
   */
  countMessageTokens(messages: readonly ChatMessage[], model?: LlmModel): number {
    let tokens = 0;
    for (const msg of messages) {
      tokens += this.countTokens(msg.content, model);
      tokens += 3; // Overhead por mensaje
    }
    return tokens;
  }

  /**
   * Verifica disponibilidad
   */
  async isAvailable(): Promise<boolean> {
    // Anthropic no tiene endpoint de health check público
    // Verificamos con un request mínimo
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey ?? '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      return response.ok || response.status === 400; // 400 también indica que la API está activa
    } catch {
      return false;
    }
  }

  /**
   * Obtiene modelos disponibles
   */
  async getAvailableModels(): Promise<readonly LlmModel[]> {
    // Anthropic no tiene endpoint de listado de modelos
    return [
      'claude-3-5-sonnet-latest',
      'claude-3-opus-latest',
      'claude-3-haiku-20240307',
    ];
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
      totalPromptTokens: Math.floor(this.stats.totalTokensUsed * 0.6),
      totalCompletionTokens: Math.floor(this.stats.totalTokensUsed * 0.4),
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

Output Format: Return ONLY valid JSON wrapped in \`\`\`json code blocks, no explanations.`,
    };
  }

  /**
   * Parsea respuesta JSON
   */
  parseJsonResponse<T = unknown>(content: string): { success: boolean; data?: T; error?: string } {
    try {
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
    let errorBody: { error?: { message?: string; type?: string } } = {};
    try {
      errorBody = await response.json() as typeof errorBody;
    } catch {
      // Ignorar
    }

    const message = errorBody.error?.message ?? `HTTP ${response.status}`;

    if (response.status === 401) {
      return createLlmError(LLM_ERROR_CODES.AUTH_FAILED, message, 'authentication', false);
    }
    if (response.status === 429) {
      return createLlmError(LLM_ERROR_CODES.RATE_LIMITED, message, 'rate_limit', true, 60000);
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
 * Factory para crear adaptador Anthropic
 */
export function createAnthropicAdapter(
  apiKey?: string,
  config?: Partial<LlmConfig>
): LlmPort {
  return new AnthropicAdapter({
    apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'],
    ...config,
  });
}
