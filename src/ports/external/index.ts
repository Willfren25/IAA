/**
 * External Ports - Barrel export
 *
 * Exporta todos los puertos externos de la aplicación.
 * Estos definen contratos para servicios externos (LLM, n8n).
 */

// LLM Port
export type {
  LlmProvider,
  LlmModel,
  MessageRole,
  ChatMessage,
  ToolCall,
  ToolDefinition,
  LlmConfig,
  CompletionParams,
  ResponseFormat,
  CompletionResult,
  FinishReason,
  TokenUsage,
  LlmError,
  LlmErrorType,
  StreamEvent,
  EmbeddingResult,
  LlmUsageStats,
  LlmPort,
} from './llm.port.js';

export {
  DEFAULT_LLM_CONFIG,
  DEFAULT_COMPLETION_PARAMS,
  LLM_ERROR_CODES,
  MODEL_TOKEN_LIMITS,
} from './llm.port.js';

// N8n Schema Port
export type {
  N8nNodeDefinition,
  NodeDefaults,
  NodeInput,
  NodeOutput,
  NodeProperty,
  NodePropertyType,
  NodePropertyOption,
  DisplayOptions,
  TypeOptions,
  NodeCredentialDefinition,
  NodeCodex,
  N8nCredentialDefinition,
  CredentialProperty,
  CredentialAuthConfig,
  CredentialTestConfig,
  NodeCategoryInfo,
  NodeSearchResult,
  NodeSearchFilters,
  VersionCompatibility,
  SchemaValidationResult as N8nSchemaValidationResult,
  SchemaError as N8nSchemaError,
  SchemaWarning as N8nSchemaWarning,
  NodeRegistryStats,
  N8nSchemaPort,
} from './n8n-schema.port.js';

export { COMMON_NODE_TYPES, NODE_GROUPS } from './n8n-schema.port.js';
