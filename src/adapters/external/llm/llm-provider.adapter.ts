/**
 * LLM Provider - Capa de abstracción para múltiples proveedores LLM
 * 
 * Implementa Strategy Pattern para intercambiar proveedores sin cambiar código cliente.
 */

import type {
  LlmPort,
  LlmConfig,
  LlmModel,
  LlmProvider as LlmProviderType,
  CompletionParams,
  CompletionResult,
  StreamEvent,
  EmbeddingResult,
  ChatMessage,
  LlmUsageStats,
} from '#ports/external/llm.port.js';

import { LLM_ERROR_CODES } from '#ports/external/llm.port.js';

import { createOpenAIAdapter } from './openai.adapter.js';
import { createAnthropicAdapter } from './anthropic.adapter.js';
import { createLlmError, createErrorResult, generateRequestId } from './types.js';

/**
 * Configuración del provider
 */
export interface LlmProviderConfig {
  /** Provider primario */
  readonly primaryProvider: LlmProviderType;
  /** Provider de fallback */
  readonly fallbackProvider?: LlmProviderType;
  /** Habilitar fallback automático */
  readonly enableFallback: boolean;
  /** Configuración por provider */
  readonly providerConfigs: Partial<Record<LlmProviderType, Partial<LlmConfig>>>;
  /** Estrategia de selección */
  readonly strategy: 'primary-only' | 'fallback-on-error' | 'round-robin' | 'lowest-latency';
}

/**
 * Configuración por defecto
 */
const DEFAULT_PROVIDER_CONFIG: LlmProviderConfig = {
  primaryProvider: 'openai',
  fallbackProvider: 'anthropic',
  enableFallback: true,
  providerConfigs: {},
  strategy: 'fallback-on-error',
};

/**
 * Provider LLM unificado con fallback
 */
export class LlmProviderAdapter implements LlmPort {
  private config: LlmProviderConfig;
  private adapters: Map<LlmProviderType, LlmPort> = new Map();
  private currentProvider: LlmProviderType;
  private roundRobinIndex = 0;
  private latencyStats: Map<LlmProviderType, number[]> = new Map();

  constructor(config: Partial<LlmProviderConfig> = {}) {
    this.config = { ...DEFAULT_PROVIDER_CONFIG, ...config };
    this.currentProvider = this.config.primaryProvider;
    this.initializeAdapters();
  }

  /**
   * Inicializa adaptadores configurados
   */
  private initializeAdapters(): void {
    const providers = new Set([
      this.config.primaryProvider,
      ...(this.config.fallbackProvider ? [this.config.fallbackProvider] : []),
    ]);

    for (const provider of providers) {
      const providerConfig = this.config.providerConfigs[provider] ?? {};
      
      switch (provider) {
        case 'openai':
        case 'azure-openai':
          this.adapters.set(provider, createOpenAIAdapter(
            providerConfig.apiKey,
            providerConfig
          ));
          break;
        case 'anthropic':
          this.adapters.set(provider, createAnthropicAdapter(
            providerConfig.apiKey,
            providerConfig
          ));
          break;
        // Otros providers pueden agregarse aquí
      }
    }
  }

  /**
   * Obtiene el adaptador activo según la estrategia
   */
  private getActiveAdapter(): LlmPort {
    let provider: LlmProviderType;

    switch (this.config.strategy) {
      case 'round-robin': {
        const providers = Array.from(this.adapters.keys());
        provider = providers[this.roundRobinIndex % providers.length] ?? this.config.primaryProvider;
        this.roundRobinIndex++;
        break;
      }
      case 'lowest-latency': {
        let lowestLatency = Infinity;
        provider = this.config.primaryProvider;
        
        for (const [p, stats] of this.latencyStats) {
          if (stats.length > 0) {
            const avgLatency = stats.reduce((a, b) => a + b, 0) / stats.length;
            if (avgLatency < lowestLatency) {
              lowestLatency = avgLatency;
              provider = p;
            }
          }
        }
        break;
      }
      default:
        provider = this.currentProvider;
    }

    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }

    return adapter;
  }

  /**
   * Registra latencia para un provider
   */
  private recordLatency(provider: LlmProviderType, latencyMs: number): void {
    const stats = this.latencyStats.get(provider) ?? [];
    stats.push(latencyMs);
    // Mantener solo últimas 100 mediciones
    if (stats.length > 100) {
      stats.shift();
    }
    this.latencyStats.set(provider, stats);
  }

  /**
   * Genera completado con fallback automático
   */
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      const adapter = this.getActiveAdapter();
      const result = await adapter.complete(params);
      
      this.recordLatency(this.currentProvider, Date.now() - startTime);
      
      if (result.success) {
        return result;
      }

      // Intentar fallback si está habilitado
      if (this.config.enableFallback && 
          this.config.fallbackProvider &&
          this.config.strategy === 'fallback-on-error') {
        return this.tryFallback(params, requestId);
      }

      return result;
    } catch (error) {
      // Intentar fallback en caso de excepción
      if (this.config.enableFallback && 
          this.config.fallbackProvider &&
          this.config.strategy === 'fallback-on-error') {
        return this.tryFallback(params, requestId);
      }

      return createErrorResult(
        createLlmError(
          LLM_ERROR_CODES.UNKNOWN,
          error instanceof Error ? error.message : 'Unknown error',
          'unknown',
          false
        ),
        this.currentProvider,
        requestId
      );
    }
  }

  /**
   * Intenta con el provider de fallback
   */
  private async tryFallback(
    params: CompletionParams,
    requestId: string
  ): Promise<CompletionResult> {
    if (!this.config.fallbackProvider) {
      return createErrorResult(
        createLlmError(LLM_ERROR_CODES.UNKNOWN, 'No fallback provider', 'unknown', false),
        this.currentProvider,
        requestId
      );
    }

    const fallbackAdapter = this.adapters.get(this.config.fallbackProvider);
    if (!fallbackAdapter) {
      return createErrorResult(
        createLlmError(LLM_ERROR_CODES.UNKNOWN, 'Fallback adapter not found', 'unknown', false),
        this.currentProvider,
        requestId
      );
    }

    console.warn(`[LlmProvider] Primary provider failed, falling back to ${this.config.fallbackProvider}`);
    
    const startTime = Date.now();
    const result = await fallbackAdapter.complete(params);
    this.recordLatency(this.config.fallbackProvider, Date.now() - startTime);
    
    return result;
  }

  /**
   * Streaming con el provider activo
   */
  async *completeStream(params: CompletionParams): AsyncIterable<StreamEvent> {
    const adapter = this.getActiveAdapter();
    yield* adapter.completeStream(params);
  }

  /**
   * Embeddings (solo OpenAI soporta)
   */
  async embed(texts: readonly string[], model?: string): Promise<EmbeddingResult> {
    // Preferir OpenAI para embeddings
    const openaiAdapter = this.adapters.get('openai');
    if (openaiAdapter) {
      return openaiAdapter.embed(texts, model);
    }

    const adapter = this.getActiveAdapter();
    return adapter.embed(texts, model);
  }

  /**
   * Cuenta tokens
   */
  countTokens(text: string, model?: LlmModel): number {
    const adapter = this.getActiveAdapter();
    return adapter.countTokens(text, model);
  }

  /**
   * Cuenta tokens de mensajes
   */
  countMessageTokens(messages: readonly ChatMessage[], model?: LlmModel): number {
    const adapter = this.getActiveAdapter();
    return adapter.countMessageTokens(messages, model);
  }

  /**
   * Verifica disponibilidad de todos los providers
   */
  async isAvailable(): Promise<boolean> {
    for (const adapter of this.adapters.values()) {
      if (await adapter.isAvailable()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtiene modelos de todos los providers
   */
  async getAvailableModels(): Promise<readonly LlmModel[]> {
    const models: LlmModel[] = [];
    
    for (const adapter of this.adapters.values()) {
      const adapterModels = await adapter.getAvailableModels();
      models.push(...adapterModels);
    }

    return [...new Set(models)];
  }

  /**
   * Configura un provider específico
   */
  configure(config: Partial<LlmConfig>): void {
    const adapter = this.getActiveAdapter();
    adapter.configure(config);
  }

  /**
   * Obtiene configuración del provider activo
   */
  getConfig(): LlmConfig {
    const adapter = this.getActiveAdapter();
    return adapter.getConfig();
  }

  /**
   * Obtiene estadísticas combinadas
   */
  getUsageStats(): LlmUsageStats {
    let totalCalls = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalLatency = 0;
    let totalErrors = 0;
    const byModel = new Map<string, { calls: number; tokens: number; errors: number }>();

    for (const adapter of this.adapters.values()) {
      const stats = adapter.getUsageStats();
      totalCalls += stats.totalCalls;
      totalPromptTokens += stats.totalPromptTokens;
      totalCompletionTokens += stats.totalCompletionTokens;
      totalLatency += stats.averageLatencyMs * stats.totalCalls;
      totalErrors += stats.errorRate * stats.totalCalls;

      for (const [model, modelStats] of stats.byModel) {
        const existing = byModel.get(model) ?? { calls: 0, tokens: 0, errors: 0 };
        byModel.set(model, {
          calls: existing.calls + modelStats.calls,
          tokens: existing.tokens + modelStats.tokens,
          errors: existing.errors + modelStats.errors,
        });
      }
    }

    const averageLatencyMs = totalCalls > 0 ? totalLatency / totalCalls : 0;
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;

    return {
      totalCalls,
      totalPromptTokens,
      totalCompletionTokens,
      averageLatencyMs,
      errorRate,
      byModel,
    };
  }

  /**
   * Reinicia estadísticas de todos los providers
   */
  resetUsageStats(): void {
    for (const adapter of this.adapters.values()) {
      adapter.resetUsageStats();
    }
    this.latencyStats.clear();
  }

  /**
   * Crea mensaje de sistema para workflows
   */
  createWorkflowSystemMessage(context?: {
    n8nVersion?: string;
    allowedNodes?: readonly string[];
    constraints?: readonly string[];
  }): ChatMessage {
    const adapter = this.getActiveAdapter();
    return adapter.createWorkflowSystemMessage(context);
  }

  /**
   * Parsea respuesta JSON
   */
  parseJsonResponse<T = unknown>(content: string): { success: boolean; data?: T; error?: string } {
    const adapter = this.getActiveAdapter();
    return adapter.parseJsonResponse<T>(content);
  }

  // Métodos adicionales de gestión

  /**
   * Cambia el provider activo
   */
  switchProvider(provider: LlmProviderType): void {
    if (!this.adapters.has(provider)) {
      throw new Error(`Provider ${provider} not configured`);
    }
    this.currentProvider = provider;
  }

  /**
   * Obtiene el provider activo
   */
  getCurrentProvider(): LlmProviderType {
    return this.currentProvider;
  }

  /**
   * Obtiene providers disponibles
   */
  getAvailableProviders(): readonly LlmProviderType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Verifica disponibilidad de un provider específico
   */
  async isProviderAvailable(provider: LlmProviderType): Promise<boolean> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      return false;
    }
    return adapter.isAvailable();
  }

  /**
   * Configura un provider específico
   */
  configureProvider(provider: LlmProviderType, config: Partial<LlmConfig>): void {
    const adapter = this.adapters.get(provider);
    if (adapter) {
      adapter.configure(config);
    }
  }
}

/**
 * Factory para crear LLM Provider
 */
export function createLlmProvider(config?: Partial<LlmProviderConfig>): LlmPort {
  return new LlmProviderAdapter(config);
}

/**
 * Factory con inyección de dependencias
 */
export function createLlmProviderWithDI(
  openaiAdapter?: LlmPort,
  anthropicAdapter?: LlmPort,
  config?: Partial<LlmProviderConfig>
): LlmProviderAdapter {
  const provider = new LlmProviderAdapter(config);
  
  // Inyectar adaptadores si se proporcionan
  if (openaiAdapter) {
    (provider as unknown as { adapters: Map<LlmProviderType, LlmPort> }).adapters.set('openai', openaiAdapter);
  }
  if (anthropicAdapter) {
    (provider as unknown as { adapters: Map<LlmProviderType, LlmPort> }).adapters.set('anthropic', anthropicAdapter);
  }

  return provider;
}
