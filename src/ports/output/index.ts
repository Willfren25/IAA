/**
 * Output Ports - Barrel export
 *
 * Exporta todos los puertos de salida de la aplicación.
 * Estos definen contratos para generar y formatear salida.
 */

// JSON Generator Port
export type {
  JsonGenerationOptions,
  LayoutConfig,
  NodeGenerationResult,
  ConnectionGenerationResult,
  WorkflowGenerationResult,
  GenerationError,
  GenerationWarning,
  GenerationStats,
  GenerationContext,
  JsonSerializationResult,
  NodeTemplate,
  JsonGeneratorPort,
} from './json-generator.port.js';

export { DEFAULT_GENERATION_OPTIONS, GENERATION_ERROR_CODES } from './json-generator.port.js';

// Output Formatter Port
export type {
  SupportedOutputFormat,
  FormatOptions,
  FormatResult,
  FormatError,
  FormatWarning,
  FormatStats,
  FormatInfo,
  OutputTransformation,
  ConversionOptions,
  ConversionResult,
  FormatDetectionResult,
  OutputFormatterPort,
} from './output-formatter.port.js';

export {
  FORMAT_INFO,
  DEFAULT_FORMAT_OPTIONS,
  FORMAT_ERROR_CODES,
} from './output-formatter.port.js';

// Workflow Exporter Port
export type {
  ExportFormat,
  ExportDestination,
  ExportOptions,
  ExportMetadata,
  ExportResult,
  ExportError,
  ExportWarning,
  ExportStats,
  ExportedFileInfo,
  ExportValidationResult,
  ExportTemplate,
  ClipboardPrepareResult,
  WorkflowExporterPort,
} from './workflow-exporter.port.js';

export {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_ERROR_CODES,
  EXPORT_FILE_EXTENSIONS,
} from './workflow-exporter.port.js';
