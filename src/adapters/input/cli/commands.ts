/**
 * CLI Commands - Implementación de comandos del CLI
 *
 * Cada comando implementa una funcionalidad específica del agente.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename, extname } from 'node:path';

import type {
  GenerateCommandOptions,
  ValidateCommandOptions,
  ParseCommandOptions,
  CliExecutionResult,
  CliLogger,
  CliExecutionStats,
} from './types.js';
import { EXIT_CODES, CLI_ERROR_CODES } from './types.js';

/**
 * Comando generate - Genera workflow n8n desde prompt
 */
export async function generateCommand(
  options: GenerateCommandOptions,
  logger: CliLogger
): Promise<CliExecutionResult> {
  const startTime = new Date();

  logger.debug(`Starting generate command with options: ${JSON.stringify(options)}`);

  // Validar que el archivo de entrada existe
  const inputPath = resolve(options.input);
  if (!existsSync(inputPath)) {
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Input file not found: ${inputPath}`,
        suggestion: 'Check the file path and try again',
      },
    };
  }

  logger.spinner.start('Reading input file...');

  // Leer archivo de entrada
  let inputContent: string;
  try {
    inputContent = readFileSync(inputPath, 'utf-8');
    logger.spinner.update('Parsing prompt...');
  } catch (error) {
    logger.spinner.stop(false, 'Failed to read input file');
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Failed to read input file: ${inputPath}`,
        cause: error instanceof Error ? error : undefined,
      },
    };
  }

  // Si es solo validación, no generar
  if (options.validateOnly) {
    logger.spinner.update('Validating prompt...');

    // TODO: Implementar validación real cuando el parser esté listo
    const isValid = inputContent.includes('@workflow');

    logger.spinner.stop(isValid, isValid ? 'Prompt is valid' : 'Validation failed');

    const endTime = new Date();
    return {
      success: isValid,
      exitCode: isValid ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR_VALIDATION_FAILED,
      output: isValid ? 'Prompt validation successful' : 'Prompt validation failed',
      stats: {
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
        inputFile: inputPath,
      },
    };
  }

  logger.spinner.update('Generating workflow...');

  // TODO: Implementar generación real cuando el generador esté listo
  // Por ahora, generamos un workflow placeholder
  const workflow = generatePlaceholderWorkflow(inputContent, options);

  // Determinar archivo de salida
  const outputPath = options.output
    ? resolve(options.output)
    : resolve(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.json`);

  // Verificar si existe y no hay --force
  if (existsSync(outputPath) && !options.force) {
    logger.spinner.stop(false, 'Output file already exists');
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_WRITE_FAILED,
      error: {
        code: CLI_ERROR_CODES.WRITE_ERROR,
        message: `Output file already exists: ${outputPath}`,
        suggestion: 'Use --force to overwrite or specify a different output path',
      },
    };
  }

  logger.spinner.update('Writing output file...');

  // Crear directorio si no existe
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Escribir archivo
  try {
    const outputContent = JSON.stringify(workflow, null, 2);
    writeFileSync(outputPath, outputContent, 'utf-8');
    logger.spinner.stop(true, `Workflow generated: ${outputPath}`);
  } catch (error) {
    logger.spinner.stop(false, 'Failed to write output file');
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_WRITE_FAILED,
      error: {
        code: CLI_ERROR_CODES.WRITE_ERROR,
        message: `Failed to write output file: ${outputPath}`,
        cause: error instanceof Error ? error : undefined,
      },
    };
  }

  const endTime = new Date();
  const stats: CliExecutionStats = {
    startTime,
    endTime,
    durationMs: endTime.getTime() - startTime.getTime(),
    inputFile: inputPath,
    outputFile: outputPath,
    nodesGenerated: (workflow['nodes'] as unknown[] | undefined)?.length ?? 0,
    connectionsGenerated: Object.keys((workflow['connections'] as Record<string, unknown>) ?? {})
      .length,
  };

  logger.info(`Generated ${stats.nodesGenerated} nodes in ${stats.durationMs}ms`);

  return {
    success: true,
    exitCode: EXIT_CODES.SUCCESS,
    output: outputPath,
    stats,
  };
}

/**
 * Comando validate - Valida un archivo de prompt o workflow
 */
export async function validateCommand(
  options: ValidateCommandOptions,
  logger: CliLogger
): Promise<CliExecutionResult> {
  const startTime = new Date();

  logger.debug(`Starting validate command with options: ${JSON.stringify(options)}`);

  const inputPath = resolve(options.input);
  if (!existsSync(inputPath)) {
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Input file not found: ${inputPath}`,
      },
    };
  }

  logger.spinner.start('Reading file...');

  let content: string;
  try {
    content = readFileSync(inputPath, 'utf-8');
  } catch (error) {
    logger.spinner.stop(false, 'Failed to read file');
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Failed to read file: ${inputPath}`,
        cause: error instanceof Error ? error : undefined,
      },
    };
  }

  logger.spinner.update('Validating...');

  // Detectar tipo de archivo
  const ext = extname(inputPath).toLowerCase();
  const isJson = ext === '.json';
  const isPrompt = ext === '.prompt' || ext === '.txt' || ext === '.md';

  // TODO: Implementar validación real
  let isValid = true;
  const issues: string[] = [];

  if (isJson) {
    try {
      JSON.parse(content);
      logger.debug('JSON syntax is valid');
    } catch {
      isValid = false;
      issues.push('Invalid JSON syntax');
    }
  } else if (isPrompt) {
    // Validación básica del DSL
    if (!content.includes('@workflow')) {
      issues.push('Missing @workflow section');
    }
    if (options.strict && !content.includes('@meta')) {
      issues.push('Missing @meta section (required in strict mode)');
    }
    isValid = issues.length === 0;
  }

  logger.spinner.stop(isValid, isValid ? 'Validation passed' : 'Validation failed');

  if (options.detailed && issues.length > 0) {
    logger.error('Issues found:');
    issues.forEach((issue, index) => {
      logger.error(`  ${index + 1}. ${issue}`);
    });
  }

  const endTime = new Date();
  return {
    success: isValid,
    exitCode: isValid ? EXIT_CODES.SUCCESS : EXIT_CODES.ERROR_VALIDATION_FAILED,
    output: isValid ? 'Validation passed' : `Validation failed: ${issues.join(', ')}`,
    stats: {
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      inputFile: inputPath,
    },
  };
}

/**
 * Comando parse - Parsea y muestra estructura del prompt
 */
export async function parseCommand(
  options: ParseCommandOptions,
  logger: CliLogger
): Promise<CliExecutionResult> {
  const startTime = new Date();

  logger.debug(`Starting parse command with options: ${JSON.stringify(options)}`);

  const inputPath = resolve(options.input);
  if (!existsSync(inputPath)) {
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Input file not found: ${inputPath}`,
      },
    };
  }

  logger.spinner.start('Reading file...');

  let content: string;
  try {
    content = readFileSync(inputPath, 'utf-8');
  } catch (error) {
    logger.spinner.stop(false, 'Failed to read file');
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR_FILE_NOT_FOUND,
      error: {
        code: CLI_ERROR_CODES.FILE_NOT_FOUND,
        message: `Failed to read file: ${inputPath}`,
        cause: error instanceof Error ? error : undefined,
      },
    };
  }

  logger.spinner.update('Parsing...');

  // TODO: Implementar parsing real con el ParserPort
  const sections = extractSections(content);

  logger.spinner.stop(true, 'Parsing complete');

  // Mostrar resultados
  logger.info('Sections found:');
  for (const [name, sectionContent] of Object.entries(sections)) {
    logger.info(`  ${name}: ${sectionContent ? 'present' : 'missing'}`);
    if (options.verbose && sectionContent) {
      const preview = sectionContent.slice(0, 100).replace(/\n/g, '\\n');
      logger.debug(`    Preview: ${preview}...`);
    }
  }

  if (options.showTokens) {
    logger.info('\nTokens:');
    // TODO: Mostrar tokens cuando el tokenizer esté implementado
    logger.info('  (Tokenizer not yet implemented)');
  }

  if (options.showAst) {
    logger.info('\nAST:');
    // TODO: Mostrar AST cuando el parser esté implementado
    logger.info('  (AST parser not yet implemented)');
  }

  const endTime = new Date();
  return {
    success: true,
    exitCode: EXIT_CODES.SUCCESS,
    output: JSON.stringify(sections, null, 2),
    stats: {
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      inputFile: inputPath,
    },
  };
}

/**
 * Extrae secciones del DSL
 */
function extractSections(content: string): Record<string, string | null> {
  const sections: Record<string, string | null> = {
    '@meta': null,
    '@trigger': null,
    '@workflow': null,
    '@constraints': null,
    '@assumptions': null,
  };

  const sectionRegex = /@(meta|trigger|workflow|constraints|assumptions)\b/gi;
  const matches = [...content.matchAll(sectionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    if (!currentMatch) {
      continue;
    }

    const sectionName = `@${currentMatch[1]?.toLowerCase() ?? ''}`;
    const matchIndex = currentMatch.index ?? 0;
    const startIndex = matchIndex + currentMatch[0].length;
    const nextMatch = matches[i + 1];
    const endIndex = nextMatch?.index ?? content.length;

    sections[sectionName] = content.slice(startIndex, endIndex).trim();
  }

  return sections;
}

/**
 * Genera un workflow placeholder (temporal)
 * TODO: Reemplazar con generación real
 */
function generatePlaceholderWorkflow(
  _content: string,
  options: GenerateCommandOptions
): Record<string, unknown> {
  return {
    name: 'Generated Workflow',
    nodes: [
      {
        id: 'node-1',
        name: 'Start',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: {},
      },
      {
        id: 'node-2',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [500, 300],
        parameters: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      },
    ],
    connections: {
      Start: {
        main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
      },
    },
    active: false,
    settings: {
      executionOrder: 'v1',
    },
    versionId: crypto.randomUUID(),
    meta: {
      templateCredsSetupCompleted: true,
      ...(options.includeMetadata && {
        generatedBy: '@iaa/n8n-workflow-generator',
        generatedAt: new Date().toISOString(),
        n8nVersion: options.n8nVersion || '1.0.0',
      }),
    },
    tags: [],
  };
}
