/**
 * Input Adapters - Barrel export
 *
 * Exporta todos los adaptadores de entrada.
 */

// CLI Adapter
export {
  // Types
  type CliGlobalOptions,
  type GenerateCommandOptions,
  type ValidateCommandOptions,
  type ParseCommandOptions,
  type CliExecutionResult,
  type CliError,
  type CliExecutionStats,
  type CliCommand,
  type CliContext,
  type CliLogger,
  type ExitCode,
  EXIT_CODES,
  CLI_ERROR_CODES,
  // Logger
  createCliLogger,
  getDefaultLogger,
  configureDefaultLogger,
  type LoggerOptions,
  // Commands
  generateCommand,
  validateCommand,
  parseCommand,
  // CLI
  createCli,
  runCli,
} from './cli/index.js';

// Parser Adapters
export {
  PromptParserAdapter,
  createPromptParser,
  PromptContractAdapter,
  createPromptContractAdapter,
} from './parser/index.js';
