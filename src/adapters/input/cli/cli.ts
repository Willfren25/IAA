/**
 * CLI Main - Entry point del CLI
 *
 * Configura y ejecuta el Command Line Interface usando Commander.
 */

import { Command } from 'commander';

import type {
  GenerateCommandOptions,
  ValidateCommandOptions,
  ParseCommandOptions,
  CliExecutionResult,
} from './types.js';
import { EXIT_CODES } from './types.js';
import { createCliLogger, configureDefaultLogger } from './logger.js';
import { generateCommand, validateCommand, parseCommand } from './commands.js';

/**
 * Versión del CLI (sincronizada con package.json)
 */
const VERSION = '0.1.0';

/**
 * Descripción del CLI
 */
const DESCRIPTION = `
n8n Workflow Generator - AI Agent CLI

Generate n8n workflows from natural language prompts using a semi-structured DSL.

Examples:
  $ iaa generate input.prompt -o workflow.json
  $ iaa generate input.prompt --strict --validate-only
  $ iaa validate workflow.json --detailed
  $ iaa parse input.prompt --show-tokens
`;

/**
 * Crea y configura el programa CLI
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name('iaa')
    .description(DESCRIPTION)
    .version(VERSION, '-v, --version', 'Output the current version')
    .option('--strict', 'Enable strict mode - reject ambiguities', false)
    .option('--verbose', 'Enable verbose output', false)
    .option('--quiet', 'Suppress non-essential output', false)
    .option('--no-color', 'Disable colored output')
    .option('-c, --config <path>', 'Path to configuration file')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts() as Record<string, unknown>;
      configureDefaultLogger({
        verbose: Boolean(opts['verbose']),
        quiet: Boolean(opts['quiet']),
        noColor: !opts['color'],
      });
    });

  // Comando: generate
  program
    .command('generate <input>')
    .alias('gen')
    .alias('g')
    .description('Generate n8n workflow from prompt file')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (json, yaml)', 'json')
    .option('--validate-only', 'Only validate, do not generate', false)
    .option('--n8n-version <version>', 'Target n8n version', '1.0.0')
    .option('--include-metadata', 'Include generation metadata', true)
    .option('--auto-layout', 'Auto-layout nodes', true)
    .option('--force', 'Overwrite existing output file', false)
    .action(async (input: string, cmdOptions: Record<string, unknown>) => {
      const globalOpts = program.opts() as Record<string, unknown>;
      const logger = createCliLogger({
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        noColor: !globalOpts['color'],
      });

      const options: GenerateCommandOptions = {
        input,
        output: cmdOptions['output'] as string | undefined,
        format: (cmdOptions['format'] as 'json' | 'yaml') || 'json',
        strict: Boolean(globalOpts['strict']),
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        version: false,
        validateOnly: Boolean(cmdOptions['validateOnly']),
        n8nVersion: (cmdOptions['n8nVersion'] as string) || '1.0.0',
        includeMetadata: cmdOptions['includeMetadata'] !== false,
        autoLayout: cmdOptions['autoLayout'] !== false,
        force: Boolean(cmdOptions['force']),
      };

      const result = await generateCommand(options, logger);
      handleResult(result);
    });

  // Comando: validate
  program
    .command('validate <input>')
    .alias('val')
    .description('Validate a prompt or workflow file')
    .option('-s, --schema <path>', 'JSON Schema to validate against')
    .option('-d, --detailed', 'Show detailed validation report', false)
    .action(async (input: string, cmdOptions: Record<string, unknown>) => {
      const globalOpts = program.opts() as Record<string, unknown>;
      const logger = createCliLogger({
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        noColor: !globalOpts['color'],
      });

      const options: ValidateCommandOptions = {
        input,
        strict: Boolean(globalOpts['strict']),
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        version: false,
        format: 'json',
        schema: cmdOptions['schema'] as string | undefined,
        detailed: Boolean(cmdOptions['detailed']),
      };

      const result = await validateCommand(options, logger);
      handleResult(result);
    });

  // Comando: parse
  program
    .command('parse <input>')
    .description('Parse and analyze a prompt file')
    .option('--show-ast', 'Display the Abstract Syntax Tree', false)
    .option('--show-tokens', 'Display lexer tokens', false)
    .action(async (input: string, cmdOptions: Record<string, unknown>) => {
      const globalOpts = program.opts() as Record<string, unknown>;
      const logger = createCliLogger({
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        noColor: !globalOpts['color'],
      });

      const options: ParseCommandOptions = {
        input,
        strict: Boolean(globalOpts['strict']),
        verbose: Boolean(globalOpts['verbose']),
        quiet: Boolean(globalOpts['quiet']),
        version: false,
        format: 'json',
        showAst: Boolean(cmdOptions['showAst']),
        showTokens: Boolean(cmdOptions['showTokens']),
      };

      const result = await parseCommand(options, logger);
      handleResult(result);
    });

  return program;
}

/**
 * Maneja el resultado de un comando
 */
function handleResult(result: CliExecutionResult): never {
  if (!result.success && result.error) {
    console.error(`\nError [${result.error.code}]: ${result.error.message}`);
    if (result.error.suggestion) {
      console.error(`Suggestion: ${result.error.suggestion}`);
    }
  }
  process.exit(result.exitCode);
}

/**
 * Ejecuta el CLI
 */
export async function runCli(args: string[] = process.argv): Promise<void> {
  const program = createCli();

  try {
    await program.parseAsync(args);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(EXIT_CODES.ERROR_GENERAL);
  }
}

/**
 * Entry point si se ejecuta directamente
 */
if (process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')) {
  runCli().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(EXIT_CODES.ERROR_GENERAL);
  });
}
