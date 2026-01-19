/**
 * Adapters - Output
 *
 * Implementaciones concretas de adaptadores de salida.
 * Incluye: Formatters, Generators, Exporters
 */

// Formatters
export {
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
} from './formatter/index.js';

// Generator
export {
  N8nJsonGenerator,
  type N8nGeneratorOptions,
  type GeneratorResult,
  type N8nWorkflow,
  type N8nNode,
  type N8nConnections,
} from './generator/index.js';

// Exporter
export {
  WorkflowExporter,
  getWorkflowExporter,
  createWorkflowExporter,
  type WorkflowExportOptions,
  type WorkflowExportResult,
  type ExportManifest,
} from './exporter/index.js';
