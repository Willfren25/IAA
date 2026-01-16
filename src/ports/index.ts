/**
 * Ports (Interfaces/Contratos)
 *
 * Define los contratos que cualquier adaptador debe cumplir.
 * Sigue el patrón Ports & Adapters de arquitectura hexagonal.
 *
 * Organización:
 * - input/  : Puertos de entrada (procesar input del usuario)
 * - output/ : Puertos de salida (generar y formatear output)
 * - external/: Puertos externos (LLM, n8n schemas)
 */

// ============================================================================
// Input Ports - Procesamiento de entrada del usuario
// ============================================================================
export {
  // Prompt Contract Port
  type PromptSection,
  type SectionParseState,
  type SectionExtractionResult,
  type PromptContractOptions,
  type ContractValidationResult,
  type ContractConversionResult,
  type PromptContractPort,
  REQUIRED_SECTIONS_NORMAL,
  REQUIRED_SECTIONS_STRICT,
  ALL_SECTIONS,

  // Parser Port
  type PromptToken,
  type PromptTokenType,
  type AstNode,
  type AstNodeType,
  type AstNodeMetadata,
  type AstLocation,
  type TokenizeResult,
  type ParseToAstResult,
  type ParserError,
  type ParserWarning,
  type ParserOptions,
  type ParserContext,
  type TransformResult,
  type ParserPort,
  TOKEN_PATTERNS,
  DSL_KEYWORDS,

  // Input Validator Port
  type ValidationSeverity,
  type ValidationType,
  type ValidationIssue,
  type InputValidationResult,
  type ValidationRule,
  type ValidationRuleResult,
  type ValidationContext,
  type InputValidationOptions,
  type ValidationResultsByType,
  type ValidationReport,
  type InputValidatorPort,
  VALIDATION_ERROR_CODES,
  DEFAULT_VALIDATION_OPTIONS,
} from './input/index.js';

// ============================================================================
// Output Ports - Generación y formateo de salida
// ============================================================================
export {
  // JSON Generator Port
  type JsonGenerationOptions,
  type LayoutConfig,
  type NodeGenerationResult,
  type ConnectionGenerationResult,
  type WorkflowGenerationResult,
  type GenerationError,
  type GenerationWarning,
  type GenerationStats,
  type GenerationContext,
  type JsonSerializationResult,
  type NodeTemplate,
  type JsonGeneratorPort,
  DEFAULT_GENERATION_OPTIONS,
  GENERATION_ERROR_CODES,

  // Output Formatter Port
  type SupportedOutputFormat,
  type FormatOptions,
  type FormatResult,
  type FormatError,
  type FormatWarning,
  type FormatStats,
  type FormatInfo,
  type OutputTransformation,
  type ConversionOptions,
  type ConversionResult,
  type FormatDetectionResult,
  type OutputFormatterPort,
  FORMAT_INFO,
  DEFAULT_FORMAT_OPTIONS,
  FORMAT_ERROR_CODES,

  // Workflow Exporter Port
  type ExportFormat,
  type ExportDestination,
  type ExportOptions,
  type ExportMetadata,
  type ExportResult,
  type ExportError,
  type ExportWarning,
  type ExportStats,
  type ExportedFileInfo,
  type ExportValidationResult,
  type ExportTemplate,
  type ClipboardPrepareResult,
  type WorkflowExporterPort,
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_ERROR_CODES,
  EXPORT_FILE_EXTENSIONS,
} from './output/index.js';

// ============================================================================
// External Ports - Servicios externos (LLM, n8n)
// ============================================================================
export {
  // LLM Port
  type LlmProvider,
  type LlmModel,
  type MessageRole,
  type ChatMessage,
  type ToolCall,
  type ToolDefinition,
  type LlmConfig,
  type CompletionParams,
  type ResponseFormat,
  type CompletionResult,
  type FinishReason,
  type TokenUsage,
  type LlmError,
  type LlmErrorType,
  type StreamEvent,
  type EmbeddingResult,
  type LlmUsageStats,
  type LlmPort,
  DEFAULT_LLM_CONFIG,
  DEFAULT_COMPLETION_PARAMS,
  LLM_ERROR_CODES,
  MODEL_TOKEN_LIMITS,

  // N8n Schema Port
  type N8nNodeDefinition,
  type NodeDefaults,
  type NodeInput,
  type NodeOutput,
  type NodeProperty,
  type NodePropertyType,
  type NodePropertyOption,
  type DisplayOptions,
  type TypeOptions,
  type NodeCredentialDefinition,
  type NodeCodex,
  type N8nCredentialDefinition,
  type CredentialProperty,
  type CredentialAuthConfig,
  type CredentialTestConfig,
  type NodeCategoryInfo,
  type NodeSearchResult,
  type NodeSearchFilters,
  type VersionCompatibility,
  type N8nSchemaValidationResult,
  type N8nSchemaError,
  type N8nSchemaWarning,
  type NodeRegistryStats,
  type N8nSchemaPort,
  COMMON_NODE_TYPES,
  NODE_GROUPS,
} from './external/index.js';
