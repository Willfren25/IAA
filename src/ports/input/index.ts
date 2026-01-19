/**
 * Input Ports - Barrel export
 *
 * Exporta todos los puertos de entrada de la aplicación.
 * Estos definen contratos para procesar entrada del usuario.
 */

// Prompt Contract Port
export type {
  PromptSection,
  SectionParseState,
  SectionExtractionResult,
  PromptContractOptions,
  ContractValidationResult,
  ContractConversionResult,
  PromptContractPort,
} from './prompt-contract.port.js';

export {
  REQUIRED_SECTIONS_NORMAL,
  REQUIRED_SECTIONS_STRICT,
  ALL_SECTIONS,
} from './prompt-contract.port.js';

// Parser Port
export type {
  PromptToken,
  PromptTokenType,
  AstNode,
  AstNodeType,
  AstNodeMetadata,
  AstLocation,
  TokenizeResult,
  ParseToAstResult,
  ParserError,
  ParserWarning,
  ParserOptions,
  ParserContext,
  TransformResult,
  ParserPort,
} from './parser.port.js';

export { TOKEN_PATTERNS, DSL_KEYWORDS } from './parser.port.js';

// Input Validator Port
export type {
  ValidationSeverity,
  ValidationType,
  ValidationIssue,
  InputValidationResult,
  ValidationRule,
  ValidationRuleResult,
  ValidationContext,
  InputValidationOptions,
  ValidationResultsByType,
  ValidationReport,
  InputValidatorPort,
} from './input-validator.port.js';

export { VALIDATION_ERROR_CODES, DEFAULT_VALIDATION_OPTIONS } from './input-validator.port.js';
