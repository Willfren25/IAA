/**
 * Prompt Parser Adapter - Implementación del parser DSL
 *
 * Parsea prompts semi-estructurados con secciones:
 * @meta, @trigger, @workflow, @constraints, @assumptions
 */

import type {
  ParserPort,
  ParserOptions,
  PromptToken,
  PromptTokenType,
  TokenizeResult,
  ParseToAstResult,
  AstNode,
  TransformResult,
  ParserError,
  ParserWarning,
  PromptSection,
  SectionExtractionResult,
} from '@ports/input/parser.port.js';

import type {
  PromptContract,
  PromptMeta,
  PromptTrigger,
  WorkflowStep,
  PromptConstraints,
  PromptAssumptions,
  PromptParseResult,
} from '@core/domain/types/prompt.types.js';

import { TOKEN_PATTERNS, DSL_KEYWORDS } from '@ports/input/parser.port.js';

/**
 * Implementación del Parser DSL
 */
export class PromptParserAdapter implements ParserPort {
  private options: ParserOptions;

  constructor(options: ParserOptions = {}) {
    this.options = {
      strictMode: false,
      ignoreComments: true,
      preserveLocations: true,
      language: 'es',
      maxErrors: 100,
      errorRecovery: true,
      ...options,
    };
  }

  /**
   * Tokeniza el input en tokens
   */
  tokenize(input: string, options?: ParserOptions): TokenizeResult {
    const opts = { ...this.options, ...options };
    const tokens: PromptToken[] = [];
    const errors: ParserError[] = [];
    const warnings: ParserWarning[] = [];

    const lines = input.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum] ?? '';
      let column = 0;

      while (column < line.length) {
        const remaining = line.slice(column);
        let matched = false;

        // Intentar hacer match con cada patrón
        for (const [tokenType, pattern] of Object.entries(TOKEN_PATTERNS)) {
          const match = remaining.match(pattern);
          if (match) {
            const value = match[0];

            // Ignorar comentarios si está configurado
            if (tokenType === 'COMMENT' && opts.ignoreComments) {
              column = line.length; // Saltar al final de la línea
              matched = true;
              break;
            }

            // Ignorar whitespace puro
            if (tokenType === 'WHITESPACE') {
              column += value.length;
              matched = true;
              break;
            }

            tokens.push({
              type: tokenType as PromptTokenType,
              value: match[1] ?? value, // Usar grupo de captura si existe
              line: lineNum + 1,
              column: column + 1,
              length: value.length,
            });

            column += value.length;
            matched = true;
            break;
          }
        }

        // Si no matchea nada, es un identificador o error
        if (!matched) {
          // Intentar como identificador genérico
          const identMatch = remaining.match(/^[^\s@#:,[\]{}()]+/);
          if (identMatch) {
            tokens.push({
              type: 'IDENTIFIER',
              value: identMatch[0],
              line: lineNum + 1,
              column: column + 1,
              length: identMatch[0].length,
            });
            column += identMatch[0].length;
          } else {
            // Caracter no reconocido - avanzar
            column++;
          }
        }
      }

      // Agregar token de nueva línea
      if (lineNum < lines.length - 1) {
        tokens.push({
          type: 'NEWLINE',
          value: '\n',
          line: lineNum + 1,
          column: line.length + 1,
          length: 1,
        });
      }
    }

    // Agregar token EOF
    tokens.push({
      type: 'EOF',
      value: '',
      line: lines.length,
      column: (lines[lines.length - 1]?.length ?? 0) + 1,
      length: 0,
    });

    return { success: errors.length === 0, tokens, errors, warnings };
  }

  /**
   * Parsea tokens a AST
   */
  parseToAst(tokens: readonly PromptToken[], _options?: ParserOptions): ParseToAstResult {
    const errors: ParserError[] = [];
    const warnings: ParserWarning[] = [];

    // Crear nodo raíz
    const root: AstNode = {
      type: 'DOCUMENT',
      children: [],
      location: {
        start: { line: 1, column: 1 },
        end: { line: tokens[tokens.length - 1]?.line ?? 1, column: 1 },
      },
    };

    let currentSection: AstNode | null = null;
    const children: AstNode[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) {
        continue;
      }

      if (token.type === 'SECTION_MARKER') {
        // Guardar sección anterior
        if (currentSection) {
          children.push(currentSection);
        }

        // Crear nueva sección
        currentSection = {
          type: 'SECTION',
          children: [],
          value: `@${token.value.toLowerCase()}`,
          metadata: {
            section: `@${token.value.toLowerCase()}` as PromptSection,
          },
          location: {
            start: { line: token.line, column: token.column },
            end: { line: token.line, column: token.column + token.length },
          },
        };
      } else if (token.type === 'FIELD_NAME' && currentSection) {
        // Agregar campo a la sección actual
        const fieldNode: AstNode = {
          type: 'FIELD',
          children: [],
          value: token.value.replace(':', ''),
          metadata: {
            fieldName: token.value.replace(':', ''),
          },
          location: {
            start: { line: token.line, column: token.column },
            end: { line: token.line, column: token.column + token.length },
          },
        };

        // Buscar valor del campo
        const valueTokens: PromptToken[] = [];
        let j = i + 1;
        let nextToken = tokens[j];
        while (
          j < tokens.length &&
          nextToken &&
          nextToken.type !== 'SECTION_MARKER' &&
          nextToken.type !== 'FIELD_NAME' &&
          nextToken.type !== 'EOF'
        ) {
          if (nextToken.type !== 'NEWLINE') {
            valueTokens.push(nextToken);
          } else if (valueTokens.length > 0) {
            break; // Fin de valor en la misma línea
          }
          j++;
          nextToken = tokens[j];
        }

        if (valueTokens.length > 0) {
          const firstValueToken = valueTokens[0];
          const lastValueToken = valueTokens[valueTokens.length - 1];
          if (firstValueToken && lastValueToken) {
            const valueNode: AstNode = {
              type: 'LITERAL',
              children: [],
              value: valueTokens.map((t) => t.value).join(' '),
              location: {
                start: { line: firstValueToken.line, column: firstValueToken.column },
                end: {
                  line: lastValueToken.line,
                  column: lastValueToken.column + lastValueToken.length,
                },
              },
            };
            (fieldNode.children as AstNode[]).push(valueNode);
          }
        }

        (currentSection.children as AstNode[]).push(fieldNode);
        i = j - 1; // Avanzar índice
      } else if (token.type === 'NUMBERED_ITEM' && currentSection) {
        // Es un paso numerado del workflow

        // Capturar contenido del paso
        const stepTokens: PromptToken[] = [];
        let j = i + 1;
        let nextToken = tokens[j];
        while (
          j < tokens.length &&
          nextToken &&
          nextToken.type !== 'SECTION_MARKER' &&
          nextToken.type !== 'NUMBERED_ITEM' &&
          nextToken.type !== 'EOF'
        ) {
          if (nextToken.type === 'NEWLINE') {
            // Verificar si la siguiente línea continúa (indentada)
            const followingToken = tokens[j + 1];
            if (j + 1 < tokens.length && followingToken?.type === 'INDENT') {
              j++;
              nextToken = tokens[j];
              continue;
            }
            break;
          }
          stepTokens.push(nextToken);
          j++;
          nextToken = tokens[j];
        }

        // Create step node with value
        const stepNode: AstNode = {
          type: 'STEP',
          children: [],
          value: stepTokens
            .map((t) => t.value)
            .join(' ')
            .trim(),
          metadata: {
            stepNumber: parseInt(token.value, 10),
          },
          location: {
            start: { line: token.line, column: token.column },
            end: { line: token.line, column: token.column + token.length },
          },
        };
        (currentSection.children as AstNode[]).push(stepNode);
        i = j - 1;
      } else if (token.type === 'LIST_ITEM' && currentSection) {
        // Es un item de lista
        // Capturar contenido del item
        const itemTokens: PromptToken[] = [];
        let j = i + 1;
        let nextToken = tokens[j];
        while (
          j < tokens.length &&
          nextToken &&
          nextToken.type !== 'SECTION_MARKER' &&
          nextToken.type !== 'LIST_ITEM' &&
          nextToken.type !== 'NUMBERED_ITEM' &&
          nextToken.type !== 'NEWLINE' &&
          nextToken.type !== 'EOF'
        ) {
          itemTokens.push(nextToken);
          j++;
          nextToken = tokens[j];
        }

        const itemNode: AstNode = {
          type: 'LIST_ITEM',
          children: [],
          value: itemTokens
            .map((t) => t.value)
            .join(' ')
            .trim(),
          location: {
            start: { line: token.line, column: token.column },
            end: { line: token.line, column: token.column + token.length },
          },
        };
        (currentSection.children as AstNode[]).push(itemNode);
        i = j - 1;
      }
    }

    // Agregar última sección
    if (currentSection) {
      children.push(currentSection);
    }

    // Construir árbol final
    const finalRoot: AstNode = {
      ...root,
      children,
    };

    return {
      success: errors.length === 0,
      ast: finalRoot,
      errors,
      warnings,
    };
  }

  /**
   * Transforma AST a PromptContract
   */
  transformToContract(ast: AstNode, options?: ParserOptions): TransformResult {
    const opts = { ...this.options, ...options };
    const errors: ParserError[] = [];
    const warnings: ParserWarning[] = [];

    // Inicializar contrato vacío
    let meta: PromptMeta | undefined;
    let trigger: PromptTrigger | undefined;
    let steps: WorkflowStep[] = [];
    let constraints: PromptConstraints | undefined;
    let assumptions: PromptAssumptions | undefined;

    // Procesar cada sección
    for (const sectionNode of ast.children) {
      if (sectionNode.type !== 'SECTION') {
        continue;
      }

      const sectionName = sectionNode.metadata?.section;

      switch (sectionName) {
        case '@meta':
          meta = this.extractMetaFromAst(sectionNode, errors);
          break;
        case '@trigger':
          trigger = this.extractTriggerFromAst(sectionNode, errors);
          break;
        case '@workflow':
          steps = this.extractWorkflowFromAst(sectionNode, errors);
          break;
        case '@constraints':
          constraints = this.extractConstraintsFromAst(sectionNode, errors);
          break;
        case '@assumptions':
          assumptions = this.extractAssumptionsFromAst(sectionNode, errors);
          break;
      }
    }

    // Validar campos requeridos
    if (!meta && opts.strictMode) {
      errors.push({
        code: 'MISSING_META',
        message: 'Missing @meta section (required in strict mode)',
        line: 1,
        column: 1,
        severity: 'error',
      });
    }

    if (!trigger) {
      errors.push({
        code: 'MISSING_TRIGGER',
        message: 'Missing @trigger section',
        line: 1,
        column: 1,
        severity: 'error',
      });
    }

    if (steps.length === 0) {
      errors.push({
        code: 'MISSING_WORKFLOW',
        message: 'Missing @workflow section or no steps defined',
        line: 1,
        column: 1,
        severity: 'error',
      });
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    const contract: PromptContract = {
      meta: meta ?? {
        n8nVersion: '1.0.0',
        output: 'json',
        strict: false,
      },
      trigger: trigger ?? { type: 'manual' },
      workflow: steps,
      constraints,
      assumptions,
    };

    return {
      success: true,
      contract,
      errors,
      warnings,
    };
  }

  /**
   * Pipeline completo: input -> PromptContract
   */
  parse(input: string, options?: ParserOptions): PromptParseResult {
    const opts = { ...this.options, ...options };

    // Tokenizar
    const tokenResult = this.tokenize(input, opts);
    if (!tokenResult.success) {
      return {
        success: false,
        errors: tokenResult.errors.map((e) => ({
          message: e.message,
          code: 'SYNTAX_ERROR' as const,
          line: e.line,
          section: undefined,
        })),
        warnings: tokenResult.warnings.map((w) => w.message),
      };
    }

    // Parsear a AST
    const astResult = this.parseToAst(tokenResult.tokens, opts);
    if (!astResult.success || !astResult.ast) {
      return {
        success: false,
        errors: astResult.errors.map((e) => ({
          message: e.message,
          code: 'SYNTAX_ERROR' as const,
          line: e.line,
          section: undefined,
        })),
        warnings: astResult.warnings.map((w) => w.message),
      };
    }

    // Transformar a contrato
    const transformResult = this.transformToContract(astResult.ast, opts);
    if (!transformResult.success || !transformResult.contract) {
      return {
        success: false,
        errors: transformResult.errors.map((e) => ({
          message: e.message,
          code: 'SYNTAX_ERROR' as const,
          line: e.line,
          section: undefined,
        })),
        warnings: transformResult.warnings.map((w) => w.message),
      };
    }

    return {
      success: true,
      contract: transformResult.contract,
      errors: [],
      warnings: transformResult.warnings.map((w) => w.message),
    };
  }

  /**
   * Parsea solo una sección específica
   */
  parseSection<T>(
    input: string,
    section: PromptSection,
    options?: ParserOptions
  ): SectionExtractionResult<T> {
    const parseResult = this.parse(input, options);

    if (!parseResult.success || !parseResult.contract) {
      return {
        success: false,
        errors: parseResult.errors?.map((e) => e.message),
        warnings: parseResult.warnings,
      };
    }

    const contract = parseResult.contract;
    let data: unknown;

    switch (section) {
      case '@meta':
        data = contract.meta;
        break;
      case '@trigger':
        data = contract.trigger;
        break;
      case '@workflow':
        data = contract.workflow;
        break;
      case '@constraints':
        data = contract.constraints;
        break;
      case '@assumptions':
        data = contract.assumptions;
        break;
    }

    return {
      success: true,
      data: data as T,
      warnings: parseResult.warnings,
    };
  }

  /**
   * Valida sintaxis sin generar AST completo
   */
  validateSyntax(input: string, options?: ParserOptions): boolean {
    const tokenResult = this.tokenize(input, options);
    return tokenResult.success && tokenResult.errors.length === 0;
  }

  /**
   * Obtiene sugerencias de autocompletado
   */
  getSuggestions(input: string, position: { line: number; column: number }): readonly string[] {
    const suggestions: string[] = [];
    const lines = input.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const beforeCursor = currentLine.slice(0, position.column - 1);

    // Sugerir secciones si está al inicio de línea
    if (beforeCursor.trim() === '' || beforeCursor.endsWith('@')) {
      suggestions.push(...DSL_KEYWORDS.sections);
    }

    // Sugerir campos comunes según la sección actual
    const sectionMatch = input.slice(0, input.indexOf(currentLine)).match(/@(\w+)/g);
    const currentSection = sectionMatch?.[sectionMatch.length - 1];

    if (currentSection === '@meta') {
      suggestions.push('n8n_version:', 'output_type:', 'name:', 'description:');
    } else if (currentSection === '@trigger') {
      suggestions.push('type:', 'config:');
    } else if (currentSection === '@workflow') {
      suggestions.push('1.', '2.', '3.', 'si', 'cuando', '-');
    } else if (currentSection === '@constraints') {
      suggestions.push('- max_nodes:', '- timeout:', '- allowed_nodes:');
    }

    return suggestions;
  }

  /**
   * Formatea el input según el estilo estándar
   */
  format(input: string): string {
    const lines = input.split('\n');
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Secciones sin indentación
      if (trimmed.startsWith('@')) {
        formatted.push('');
        formatted.push(trimmed);
        continue;
      }

      // Campos con indentación simple
      if (trimmed.includes(':') && !trimmed.startsWith('-') && !trimmed.match(/^\d+\./)) {
        formatted.push(`  ${trimmed}`);
        continue;
      }

      // Items de lista con indentación
      if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        formatted.push(`  ${trimmed}`);
        continue;
      }

      // Contenido normal
      if (trimmed) {
        formatted.push(`    ${trimmed}`);
      }
    }

    return formatted.join('\n').trim();
  }

  // ============================================================================
  // Métodos privados de extracción
  // ============================================================================

  private extractMetaFromAst(node: AstNode, _errors: ParserError[]): PromptMeta {
    let n8nVersion = '1.0.0';
    let output: 'json' | 'yaml' | 'pretty-json' = 'json';
    let strict = false;

    for (const child of node.children) {
      if (child.type === 'FIELD') {
        const fieldName = child.metadata?.fieldName?.toLowerCase();
        const value = child.children[0]?.value as string;

        switch (fieldName) {
          case 'n8n_version':
          case 'n8nversion':
          case 'version':
            n8nVersion = value || '1.0.0';
            break;
          case 'output_type':
          case 'outputtype':
          case 'output':
            if (value === 'json' || value === 'yaml' || value === 'pretty-json') {
              output = value;
            }
            break;
          case 'strict':
            strict = value?.toLowerCase() === 'true';
            break;
        }
      }
    }

    return { n8nVersion, output, strict };
  }

  private extractTriggerFromAst(node: AstNode, _errors: ParserError[]): PromptTrigger {
    let type: 'webhook' | 'cron' | 'manual' | 'custom' = 'manual';
    let method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | undefined;
    let path: string | undefined;
    let schedule: string | undefined;
    const options: Record<string, unknown> = {};

    for (const child of node.children) {
      if (child.type === 'FIELD') {
        const fieldName = child.metadata?.fieldName?.toLowerCase();
        const value = child.children[0]?.value as string;

        switch (fieldName) {
          case 'type':
          case 'tipo':
            if (value?.toLowerCase().includes('webhook')) {
              type = 'webhook';
            } else if (
              value?.toLowerCase().includes('cron') ||
              value?.toLowerCase().includes('schedule')
            ) {
              type = 'cron';
            } else if (value?.toLowerCase().includes('custom')) {
              type = 'custom';
            } else {
              type = 'manual';
            }
            break;
          case 'method':
            if (
              value &&
              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(
                value.toUpperCase()
              )
            ) {
              method = value.toUpperCase() as typeof method;
            }
            break;
          case 'path':
          case 'endpoint':
            path = value;
            break;
          case 'schedule':
          case 'cron':
            schedule = value;
            break;
          default:
            if (value) {
              options[fieldName ?? 'unknown'] = value;
            }
        }
      }
    }

    return {
      type,
      ...(method && { method }),
      ...(path && { path }),
      ...(schedule && { schedule }),
      ...(Object.keys(options).length > 0 && { options }),
    };
  }

  private extractWorkflowFromAst(node: AstNode, _errors: ParserError[]): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    for (const child of node.children) {
      if (child.type === 'STEP') {
        const stepNumber = child.metadata?.stepNumber ?? steps.length + 1;
        const action = (child.value as string) || '';

        // Detectar condicionales
        const hasCondition = /\b(si|cuando|if|when)\b/i.test(action);

        // Intentar detectar tipo de nodo
        let nodeType: string | undefined;
        const actionLower = action.toLowerCase();

        if (
          actionLower.includes('http') ||
          actionLower.includes('api') ||
          actionLower.includes('request') ||
          actionLower.includes('llamar')
        ) {
          nodeType = 'n8n-nodes-base.httpRequest';
        } else if (
          actionLower.includes('email') ||
          actionLower.includes('correo') ||
          actionLower.includes('gmail')
        ) {
          nodeType = 'n8n-nodes-base.gmail';
        } else if (actionLower.includes('slack')) {
          nodeType = 'n8n-nodes-base.slack';
        } else if (
          actionLower.includes('filtrar') ||
          actionLower.includes('filter') ||
          actionLower.includes('condicion') ||
          hasCondition
        ) {
          nodeType = 'n8n-nodes-base.if';
        } else if (
          actionLower.includes('transformar') ||
          actionLower.includes('transform') ||
          actionLower.includes('mapear') ||
          actionLower.includes('set')
        ) {
          nodeType = 'n8n-nodes-base.set';
        } else if (
          actionLower.includes('codigo') ||
          actionLower.includes('code') ||
          actionLower.includes('javascript') ||
          actionLower.includes('script')
        ) {
          nodeType = 'n8n-nodes-base.code';
        }

        steps.push({
          stepNumber,
          action,
          ...(nodeType && { nodeType }),
          ...(hasCondition && { conditions: action }),
        });
      }
    }

    return steps;
  }

  private extractConstraintsFromAst(node: AstNode, _errors: ParserError[]): PromptConstraints {
    let maxNodes: number | undefined;
    let timeoutSeconds: number | undefined;
    const customRules: string[] = [];

    for (const child of node.children) {
      if (child.type === 'LIST_ITEM' || child.type === 'FIELD') {
        const value = (child.value as string) || (child.children[0]?.value as string) || '';

        if (value.includes('max_nodes') || value.includes('maximo')) {
          const match = value.match(/\d+/);
          if (match) {
            maxNodes = parseInt(match[0], 10);
          }
        } else if (value.includes('timeout')) {
          const match = value.match(/\d+/);
          if (match) {
            timeoutSeconds = parseInt(match[0], 10);
          }
        } else if (value) {
          customRules.push(value);
        }
      }
    }

    return {
      ...(maxNodes !== undefined && { maxNodes }),
      ...(timeoutSeconds !== undefined && { timeoutSeconds }),
      ...(customRules.length > 0 && { customRules }),
    };
  }

  private extractAssumptionsFromAst(node: AstNode, _errors: ParserError[]): PromptAssumptions {
    const customAssumptions: string[] = [];

    for (const child of node.children) {
      if (child.type === 'LIST_ITEM') {
        const value = child.value as string;
        if (value) {
          customAssumptions.push(value);
        }
      }
    }

    return {
      ...(customAssumptions.length > 0 && { customAssumptions }),
    };
  }
}

/**
 * Factory para crear parser con opciones
 */
export function createPromptParser(options?: ParserOptions): ParserPort {
  return new PromptParserAdapter(options);
}
