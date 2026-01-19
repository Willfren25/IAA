/**
 * CLI Adapter - Barrel export
 *
 * Exporta todos los componentes del adaptador CLI.
 */

// Types
export type {
  CliGlobalOptions,
  GenerateCommandOptions,
  ValidateCommandOptions,
  ParseCommandOptions,
  CliExecutionResult,
  CliError,
  CliExecutionStats,
  CliCommand,
  CliContext,
  CliLogger,
  ExitCode,
} from './types.js';

export { EXIT_CODES, CLI_ERROR_CODES } from './types.js';

// Logger
export {
  createCliLogger,
  getDefaultLogger,
  configureDefaultLogger,
  type LoggerOptions,
} from './logger.js';

// Commands
export { generateCommand, validateCommand, parseCommand } from './commands.js';

// CLI
export { createCli, runCli } from './cli.js';
