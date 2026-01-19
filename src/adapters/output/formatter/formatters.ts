/**
 * Output Formatters - Formateadores para diferentes salidas
 */

import type {
  SupportedOutputFormat,
  FormatOptions,
} from '#ports/output/output-formatter.port.js';

/**
 * Tipo de formato de salida (alias para compatibilidad)
 */
export type OutputFormat = SupportedOutputFormat | 'pretty-json' | 'text';

/**
 * Interfaz base para formatters
 */
export interface OutputFormatterAdapter {
  format(data: Record<string, unknown>, options?: Partial<FormatOptions>): FormatterResult;
  getFormat(): OutputFormat;
  getExtension(): string;
  getMimeType(): string;
}

/**
 * Resultado de formateo simplificado
 */
export interface FormatterResult {
  success: boolean;
  content: string;
  format: OutputFormat;
  size?: number;
  error?: string;
}

/**
 * JSON Formatter - Salida JSON con indentación
 */
export class JsonFormatter implements OutputFormatterAdapter {
  format(data: Record<string, unknown>, options?: Partial<FormatOptions>): FormatterResult {
    try {
      const indent = options?.indent ?? 2;
      const sortKeys = options?.sortKeys ?? false;
      
      let processed: Record<string, unknown> = data;
      if (sortKeys) {
        processed = this.sortObjectKeys(data) as Record<string, unknown>;
      }

      const content = JSON.stringify(processed, null, indent);

      return {
        success: true,
        content,
        format: 'json',
        size: Buffer.byteLength(content, 'utf8'),
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        format: 'json',
        error: error instanceof Error ? error.message : 'JSON formatting failed',
      };
    }
  }

  private sortObjectKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return obj;
  }

  getFormat(): OutputFormat {
    return 'json';
  }

  getExtension(): string {
    return '.json';
  }

  getMimeType(): string {
    return 'application/json';
  }
}

/**
 * Pretty JSON Formatter - JSON con formato mejorado
 */
export class PrettyJsonFormatter implements OutputFormatterAdapter {
  format(data: Record<string, unknown>, options?: Partial<FormatOptions>): FormatterResult {
    try {
      const indent = options?.indent ?? 2;
      const content = JSON.stringify(data, null, indent);

      // Agregar líneas vacías entre secciones principales
      const prettyContent = content
        .replace(/"nodes":\s*\[/g, '\n  "nodes": [\n   ')
        .replace(/"connections":\s*{/g, '\n  "connections": {\n   ');

      return {
        success: true,
        content: prettyContent,
        format: 'pretty-json',
        size: Buffer.byteLength(prettyContent, 'utf8'),
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        format: 'pretty-json',
        error: error instanceof Error ? error.message : 'Pretty JSON formatting failed',
      };
    }
  }

  getFormat(): OutputFormat {
    return 'pretty-json';
  }

  getExtension(): string {
    return '.json';
  }

  getMimeType(): string {
    return 'application/json';
  }
}

/**
 * YAML Formatter - Salida YAML
 */
export class YamlFormatter implements OutputFormatterAdapter {
  format(data: Record<string, unknown>, options?: Partial<FormatOptions>): FormatterResult {
    try {
      const indent = options?.indent ?? 2;
      const content = this.toYaml(data, indent);

      return {
        success: true,
        content,
        format: 'yaml',
        size: Buffer.byteLength(content, 'utf8'),
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        format: 'yaml',
        error: error instanceof Error ? error.message : 'YAML formatting failed',
      };
    }
  }

  /**
   * Convierte objeto a YAML (implementación simple)
   */
  private toYaml(obj: unknown, baseIndent: number, level = 0): string {
    const indent = ' '.repeat(level * baseIndent);
    const lines: string[] = [];

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      // Escapar strings multilínea o con caracteres especiales
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
        return `|\n${indent}  ${obj.replace(/\n/g, `\n${indent}  `)}`;
      }
      return obj.includes('"') ? `'${obj}'` : obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          const nested = this.toYaml(item, baseIndent, level + 1);
          lines.push(`${indent}- ${nested.trimStart()}`);
        } else {
          lines.push(`${indent}- ${this.toYaml(item, baseIndent, level)}`);
        }
      }
      return lines.join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return '{}';
      }

      for (const [key, value] of entries) {
        if (typeof value === 'object' && value !== null) {
          const nested = this.toYaml(value, baseIndent, level + 1);
          if (Array.isArray(value)) {
            lines.push(`${indent}${key}:\n${nested}`);
          } else {
            lines.push(`${indent}${key}:\n${nested}`);
          }
        } else {
          lines.push(`${indent}${key}: ${this.toYaml(value, baseIndent, level)}`);
        }
      }
      return lines.join('\n');
    }

    return String(obj);
  }

  getFormat(): OutputFormat {
    return 'yaml';
  }

  getExtension(): string {
    return '.yaml';
  }

  getMimeType(): string {
    return 'application/x-yaml';
  }
}

/**
 * Human Readable Formatter - Descripción textual del workflow
 */
export class HumanReadableFormatter implements OutputFormatterAdapter {
  format(data: Record<string, unknown>, _options?: Partial<FormatOptions>): FormatterResult {
    try {
      const content = this.generateHumanReadable(data);

      return {
        success: true,
        content,
        format: 'text',
        size: Buffer.byteLength(content, 'utf8'),
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        format: 'text',
        error: error instanceof Error ? error.message : 'Human readable formatting failed',
      };
    }
  }

  private generateHumanReadable(data: Record<string, unknown>): string {
    const lines: string[] = [];
    const workflow = data as {
      name?: string;
      nodes?: Array<{ name: string; type: string }>;
      connections?: Record<string, unknown>;
    };

    lines.push(`# Workflow: ${workflow.name ?? 'Unnamed Workflow'}`);
    lines.push('');

    // Descripción de nodos
    if (workflow.nodes?.length) {
      lines.push('## Nodes');
      lines.push('');

      for (let i = 0; i < workflow.nodes.length; i++) {
        const node = workflow.nodes[i];
        if (!node) {
          continue;
        }
        
        const nodeTypeShort = node.type.split('.').pop() ?? node.type;
        lines.push(`${i + 1}. **${node.name}** (${nodeTypeShort})`);
      }
      lines.push('');
    }

    // Flujo
    if (workflow.connections && Object.keys(workflow.connections).length > 0) {
      lines.push('## Flow');
      lines.push('');

      for (const [nodeName, conns] of Object.entries(workflow.connections)) {
        const conn = conns as { main?: Array<Array<{ node: string }>> };
        if (conn.main?.[0]?.[0]) {
          lines.push(`- ${nodeName} → ${conn.main[0][0].node}`);
        }
      }
      lines.push('');
    }

    // Estadísticas
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- Total nodes: ${workflow.nodes?.length ?? 0}`);
    lines.push(`- Total connections: ${Object.keys(workflow.connections ?? {}).length}`);

    return lines.join('\n');
  }

  getFormat(): OutputFormat {
    return 'text';
  }

  getExtension(): string {
    return '.md';
  }

  getMimeType(): string {
    return 'text/markdown';
  }
}

/**
 * Factory para crear formatter según formato
 */
export function createFormatter(format: OutputFormat): OutputFormatterAdapter {
  switch (format) {
    case 'json':
      return new JsonFormatter();
    case 'pretty-json':
      return new PrettyJsonFormatter();
    case 'yaml':
      return new YamlFormatter();
    case 'text':
      return new HumanReadableFormatter();
    default:
      return new JsonFormatter();
  }
}

/**
 * Formatter Registry - Registro de formatters
 */
export class FormatterRegistry {
  private formatters: Map<OutputFormat, OutputFormatterAdapter> = new Map();

  constructor() {
    // Registrar formatters por defecto
    this.register('json', new JsonFormatter());
    this.register('pretty-json', new PrettyJsonFormatter());
    this.register('yaml', new YamlFormatter());
    this.register('text', new HumanReadableFormatter());
  }

  register(format: OutputFormat, formatter: OutputFormatterAdapter): void {
    this.formatters.set(format, formatter);
  }

  get(format: OutputFormat): OutputFormatterAdapter | undefined {
    return this.formatters.get(format);
  }

  has(format: OutputFormat): boolean {
    return this.formatters.has(format);
  }

  getAvailableFormats(): readonly OutputFormat[] {
    return Array.from(this.formatters.keys());
  }

  format(data: Record<string, unknown>, format: OutputFormat, options?: Partial<FormatOptions>): FormatterResult {
    const formatter = this.get(format);
    if (!formatter) {
      return {
        success: false,
        content: '',
        format,
        error: `Unknown format: ${format}`,
      };
    }
    return formatter.format(data, options);
  }
}

/**
 * Singleton del registry
 */
let defaultRegistry: FormatterRegistry | null = null;

export function getFormatterRegistry(): FormatterRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new FormatterRegistry();
  }
  return defaultRegistry;
}
