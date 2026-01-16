/**
 * Parser Port - Interfaz para procesamiento de prompts
 *
 * Define el contrato para parsear prompts DSL en modo estricto.
 * Soporta tokenización, AST y transformación a estructuras de dominio.
 */

import type { PromptContract, PromptParseResult } from '@core/domain/types/prompt.types.js';

// Re-export types from prompt-contract.port for convenience
export type { PromptSection, SectionExtractionResult } from './prompt-contract.port.js';

/**
 * Token del lexer de prompts
 */
export interface PromptToken {
  readonly type: PromptTokenType;
  readonly value: string;
  readonly line: number;
  readonly column: number;
  readonly length: number;
}

/**
 * Tipos de tokens soportados
 */
export type PromptTokenType =
  | 'SECTION_MARKER' // @meta, @trigger, etc.
  | 'FIELD_NAME' // nombre:, tipo:, etc.
  | 'FIELD_VALUE' // valor del campo
  | 'LIST_ITEM' // - item de lista
  | 'NUMBERED_ITEM' // 1. item numerado
  | 'STRING_LITERAL' // "texto" o 'texto'
  | 'NUMBER_LITERAL' // 123, 3.14
  | 'BOOLEAN_LITERAL' // true, false
  | 'IDENTIFIER' // identificadores
  | 'ARROW' // ->
  | 'CONDITIONAL' // si/cuando/if/when
  | 'NEWLINE' // salto de línea
  | 'INDENT' // indentación
  | 'COMMENT' // # comentario
  | 'EOF'; // fin de archivo

/**
 * Nodo del AST
 */
export interface AstNode {
  readonly type: AstNodeType;
  readonly children: readonly AstNode[];
  readonly value?: string | number | boolean;
  readonly metadata?: AstNodeMetadata;
  readonly location: AstLocation;
}

/**
 * Tipos de nodos AST
 */
export type AstNodeType =
  | 'DOCUMENT'
  | 'SECTION'
  | 'FIELD'
  | 'LIST'
  | 'LIST_ITEM'
  | 'STEP'
  | 'CONDITION'
  | 'LITERAL'
  | 'REFERENCE'
  | 'EXPRESSION';

/**
 * Metadata del nodo AST
 */
export interface AstNodeMetadata {
  readonly section?: PromptSection;
  readonly fieldName?: string;
  readonly stepNumber?: number;
  readonly isOptional?: boolean;
}

/**
 * Ubicación en el código fuente
 */
export interface AstLocation {
  readonly start: { line: number; column: number };
  readonly end: { line: number; column: number };
}

/**
 * Resultado de tokenización
 */
export interface TokenizeResult {
  readonly success: boolean;
  readonly tokens: readonly PromptToken[];
  readonly errors: readonly ParserError[];
  readonly warnings: readonly ParserWarning[];
}

/**
 * Resultado de parsing a AST
 */
export interface ParseToAstResult {
  readonly success: boolean;
  readonly ast?: AstNode;
  readonly errors: readonly ParserError[];
  readonly warnings: readonly ParserWarning[];
}

/**
 * Error de parser
 */
export interface ParserError {
  readonly code: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly severity: 'error' | 'fatal';
  readonly suggestion?: string;
}

/**
 * Advertencia de parser
 */
export interface ParserWarning {
  readonly code: string;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly suggestion?: string;
}

/**
 * Opciones de parsing
 */
export interface ParserOptions {
  /** Modo estricto - sin tolerancia a ambigüedades */
  readonly strictMode?: boolean;
  /** Ignorar comentarios */
  readonly ignoreComments?: boolean;
  /** Preservar ubicaciones en AST */
  readonly preserveLocations?: boolean;
  /** Idioma del DSL (es/en) */
  readonly language?: 'es' | 'en';
  /** Máximo de errores antes de abortar */
  readonly maxErrors?: number;
  /** Habilitar recuperación de errores */
  readonly errorRecovery?: boolean;
}

/**
 * Contexto de parsing
 */
export interface ParserContext {
  readonly options: ParserOptions;
  readonly currentSection?: PromptSection;
  readonly errors: ParserError[];
  readonly warnings: ParserWarning[];
  readonly position: { line: number; column: number };
}

/**
 * Resultado de transformación AST a Contract
 */
export interface TransformResult {
  readonly success: boolean;
  readonly contract?: PromptContract;
  readonly errors: readonly ParserError[];
  readonly warnings: readonly ParserWarning[];
}

/**
 * Puerto de Parser
 *
 * Define el contrato para parsear prompts DSL.
 * Implementa pipeline: tokenize -> parse -> transform
 */
export interface ParserPort {
  /**
   * Tokeniza el input en tokens
   * @param input - Texto de entrada
   * @param options - Opciones de tokenización
   * @returns Resultado con tokens o errores
   */
  tokenize(input: string, options?: ParserOptions): TokenizeResult;

  /**
   * Parsea tokens a AST
   * @param tokens - Tokens de entrada
   * @param options - Opciones de parsing
   * @returns Resultado con AST o errores
   */
  parseToAst(tokens: readonly PromptToken[], options?: ParserOptions): ParseToAstResult;

  /**
   * Transforma AST a PromptContract
   * @param ast - Nodo raíz del AST
   * @param options - Opciones de transformación
   * @returns Resultado con PromptContract o errores
   */
  transformToContract(ast: AstNode, options?: ParserOptions): TransformResult;

  /**
   * Pipeline completo: input -> PromptContract
   * @param input - Texto de entrada
   * @param options - Opciones de processing
   * @returns Resultado con PromptContract o errores
   */
  parse(input: string, options?: ParserOptions): PromptParseResult;

  /**
   * Parsea solo una sección específica
   * @param input - Texto de entrada
   * @param section - Sección a parsear
   * @param options - Opciones de parsing
   * @returns Resultado de extracción
   */
  parseSection<T>(
    input: string,
    section: PromptSection,
    options?: ParserOptions
  ): SectionExtractionResult<T>;

  /**
   * Valida sintaxis sin generar AST completo
   * @param input - Texto de entrada
   * @param options - Opciones de validación
   * @returns true si la sintaxis es válida
   */
  validateSyntax(input: string, options?: ParserOptions): boolean;

  /**
   * Obtiene sugerencias de autocompletado
   * @param input - Texto de entrada
   * @param position - Posición del cursor
   * @returns Sugerencias de completado
   */
  getSuggestions(input: string, position: { line: number; column: number }): readonly string[];

  /**
   * Formatea el input según el estilo estándar
   * @param input - Texto de entrada
   * @returns Texto formateado
   */
  format(input: string): string;
}

/**
 * Patrones regex para tokenización
 */
export const TOKEN_PATTERNS = {
  SECTION_MARKER: /^@(meta|trigger|workflow|constraints|assumptions)\b/i,
  FIELD_NAME: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/,
  LIST_ITEM: /^-\s+/,
  NUMBERED_ITEM: /^(\d+)\.\s+/,
  STRING_LITERAL: /^["']([^"']*?)["']/,
  NUMBER_LITERAL: /^-?\d+(\.\d+)?/,
  BOOLEAN_LITERAL: /^(true|false|verdadero|falso)\b/i,
  ARROW: /^->/,
  CONDITIONAL: /^(si|cuando|if|when)\b/i,
  COMMENT: /^#.*/,
  IDENTIFIER: /^[a-zA-Z_][a-zA-Z0-9_-]*/,
  WHITESPACE: /^[ \t]+/,
  NEWLINE: /^\r?\n/,
} as const;

/**
 * Palabras clave del DSL
 */
export const DSL_KEYWORDS = {
  sections: ['@meta', '@trigger', '@workflow', '@constraints', '@assumptions'],
  conditionals: ['si', 'cuando', 'if', 'when', 'entonces', 'then'],
  operators: ['->', '=>', '|', '&', '||', '&&'],
  booleans: ['true', 'false', 'verdadero', 'falso'],
} as const;
