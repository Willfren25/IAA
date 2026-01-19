/**
 * IAA - Agente IA Generador de Workflows n8n
 *
 * IA Agent specialized in generating n8n workflows from natural language
 * or partial JSON descriptions.
 *
 * Arquitectura: Hexagonal (Ports & Adapters)
 * Principios: SOLID, DDD, Clean Code
 */

// =====================================================
// APPLICATION LAYER - Main Services
// =====================================================
export {
  // Agent Orchestrator - Main entry point
  AgentOrchestrator,
  getAgentOrchestrator,
  createAgentOrchestrator,
  type AgentExecutionState,
  type AgentExecutionEvent,
  type AgentExecutionResult,
  type AgentOrchestratorOptions,
  
  // Workflow Generation
  WorkflowGenerationService,
  getWorkflowGenerationService,
  createWorkflowGenerationService,
  type WorkflowGenerationOptions,
  type WorkflowGenerationResult,
  
  // Prompt Processing
  PromptProcessingService,
  getPromptProcessingService,
  createPromptProcessingService,
  type RawPrompt,
  type PromptProcessingResult,
  type PromptProcessingOptions,
} from './application/index.js';

// =====================================================
// OUTPUT ADAPTERS - Formatters, Generators, Exporters
// =====================================================
export {
  // Formatters
  JsonFormatter,
  PrettyJsonFormatter,
  YamlFormatter,
  HumanReadableFormatter,
  FormatterRegistry,
  createFormatter,
  getFormatterRegistry,
  type OutputFormat,
  type OutputFormatterAdapter,
  type FormatterResult,
  
  // Generator
  N8nJsonGenerator,
  type N8nGeneratorOptions,
  type GeneratorResult,
  type N8nWorkflow,
  type N8nNode,
  type N8nConnections,
  
  // Exporter
  WorkflowExporter,
  getWorkflowExporter,
  createWorkflowExporter,
  type WorkflowExportOptions,
  type WorkflowExportResult,
  type ExportManifest,
} from './adapters/output/index.js';

// =====================================================
// CORE - Domain Types and Validation
// =====================================================
export type {
  PromptContract,
  PromptMeta,
  PromptTrigger,
  WorkflowStep,
  PromptConstraints,
  PromptAssumptions,
} from './core/domain/types/prompt.types.js';

// =====================================================
// VERSION
// =====================================================
export const version = '1.0.0';

// =====================================================
// MAIN CLI FUNCTION
// =====================================================

/**
 * Main function - Entry point for CLI
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const { runCli } = await import('./adapters/input/cli/cli.js');
  await runCli(args);
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
