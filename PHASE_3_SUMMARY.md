# Phase 3 Summary: Puertos & Contratos

## Overview

Phase 3 implements the **Ports Layer** of our Hexagonal Architecture, defining all contracts (interfaces) that adapters must implement. This follows the Dependency Inversion Principle (SOLID D).

## Architecture

```
src/ports/
├── input/                        # Entry points for user input
│   ├── prompt-contract.port.ts   # DSL prompt contract
│   ├── parser.port.ts            # Tokenizer/Parser
│   ├── input-validator.port.ts   # Input validation
│   └── index.ts                  # Barrel export
├── output/                       # Exit points for generated output
│   ├── json-generator.port.ts    # JSON n8n generation
│   ├── output-formatter.port.ts  # Multi-format output
│   ├── workflow-exporter.port.ts # Export to n8n
│   └── index.ts                  # Barrel export
├── external/                     # External service interfaces
│   ├── llm.port.ts               # LLM integration (OpenAI/Anthropic)
│   ├── n8n-schema.port.ts        # n8n node definitions
│   └── index.ts                  # Barrel export
└── index.ts                      # Main barrel export
```

## Implemented Ports

### 3.1 Input Ports

#### PromptContractPort
- **Purpose**: Process semi-structured DSL prompts with sections (@meta, @trigger, @workflow, @constraints, @assumptions)
- **Key Methods**:
  - `extractMeta()`, `extractTrigger()`, `extractWorkflow()`
  - `validateContract()`, `toContract()`
  - `hasSection()`, `listSections()`
- **Constants**: `REQUIRED_SECTIONS_NORMAL`, `REQUIRED_SECTIONS_STRICT`, `ALL_SECTIONS`

#### ParserPort
- **Purpose**: Tokenize, parse, and transform DSL prompts to structured contracts
- **Key Methods**:
  - `tokenize()` - Lexical analysis
  - `parseToAst()` - AST generation
  - `transformToContract()` - AST to domain object
  - `parse()` - Full pipeline
  - `getSuggestions()` - Autocomplete support
  - `format()` - Code formatting
- **Token Types**: `SECTION_MARKER`, `FIELD_NAME`, `LIST_ITEM`, `ARROW`, `CONDITIONAL`, etc.
- **Constants**: `TOKEN_PATTERNS`, `DSL_KEYWORDS`

#### InputValidatorPort
- **Purpose**: Validate user input against contract and schemas
- **Validation Types**: `syntax`, `schema`, `semantic`, `completeness`, `consistency`, `compatibility`
- **Key Methods**:
  - `validate()`, `validateContract()`
  - `generateReport()` - Detailed validation report
  - `validateAgainstSchema()` - JSON Schema validation
  - `registerRule()`, `setRuleEnabled()` - Custom rules
- **Constants**: `VALIDATION_ERROR_CODES`, `DEFAULT_VALIDATION_OPTIONS`

### 3.2 Output Ports

#### JsonGeneratorPort
- **Purpose**: Generate valid n8n JSON from prompt contracts
- **Key Methods**:
  - `generate()` - Full workflow generation
  - `generateNode()`, `generateTrigger()`
  - `generateConnections()`
  - `serialize()` - JSON serialization
  - `calculateLayout()` - Auto-position nodes
  - `mapActionToNodeType()` - Natural language → node type
- **Features**: Auto-layout, deterministic IDs, node templates
- **Constants**: `DEFAULT_GENERATION_OPTIONS`, `GENERATION_ERROR_CODES`

#### OutputFormatterPort
- **Purpose**: Format output in multiple formats (JSON, YAML, JSON5, TOML)
- **Key Methods**:
  - `format()`, `toJson()`, `toYaml()`, `toJson5()`
  - `convert()` - Cross-format conversion
  - `detectFormat()` - Auto-detect format
  - `minify()`, `prettify()`
  - `registerTransformation()` - Custom transforms
- **Constants**: `FORMAT_INFO`, `DEFAULT_FORMAT_OPTIONS`, `FORMAT_ERROR_CODES`

#### WorkflowExporterPort
- **Purpose**: Export workflows for n8n import
- **Export Formats**: `n8n-native`, `n8n-community`, `clipboard`, `file`
- **Key Methods**:
  - `export()`, `exportToFile()`
  - `prepareForClipboard()`
  - `toN8nNative()`, `toN8nCommunity()`
  - `sanitize()` - Remove credentials/sensitive data
  - `compress()`, `decompress()` - Base64 compression
- **Features**: Checksum calculation, export templates, sanitization
- **Constants**: `DEFAULT_EXPORT_OPTIONS`, `EXPORT_ERROR_CODES`

### 3.3 External Ports

#### LlmPort
- **Purpose**: Agnostic interface for LLM reasoning (OpenAI, Anthropic, Azure, Ollama)
- **Supported Providers**: OpenAI, Anthropic, Azure OpenAI, Ollama, Custom
- **Key Methods**:
  - `complete()` - Chat completion
  - `completeStream()` - Streaming responses
  - `embed()` - Text embeddings
  - `countTokens()`, `countMessageTokens()`
  - `createWorkflowSystemMessage()` - Optimized system prompt
  - `parseJsonResponse()` - Safe JSON parsing
- **Features**: Tool calling, structured outputs (JSON schema), streaming
- **Constants**: `DEFAULT_LLM_CONFIG`, `MODEL_TOKEN_LIMITS`, `LLM_ERROR_CODES`

#### N8nSchemaPort
- **Purpose**: Access n8n node definitions and schemas
- **Key Methods**:
  - `getNodeDefinition()`, `getAllNodeDefinitions()`
  - `searchNodes()`, `getNodesByCategory()`
  - `getTriggerNodes()`
  - `validateNodeParameters()`
  - `checkVersionCompatibility()`
  - `suggestNodes()` - AI-powered node suggestions
  - `resolveAlias()` - Alias → node type mapping
- **Node Types**: 20+ common nodes defined
- **Constants**: `COMMON_NODE_TYPES`, `NODE_GROUPS`

## Type Safety Features

1. **Readonly Types**: All interfaces use `readonly` modifiers for immutability
2. **Discriminated Unions**: Success/failure results with proper typing
3. **Const Assertions**: Constants with `as const` for literal types
4. **Generic Constraints**: Proper type parameters where needed

## Integration with Core Domain

The ports properly integrate with Phase 2 types:
- `PromptContract`, `WorkflowStep` from prompt types
- `N8nWorkflow`, `N8nNode` from workflow types
- `WorkflowConnections` from connection types
- `ValidationResult` from validation types
- `NodeCategoryEnum` from node enums

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `input/prompt-contract.port.ts` | ~160 | DSL prompt processing |
| `input/parser.port.ts` | ~240 | Tokenizer/AST parser |
| `input/input-validator.port.ts` | ~320 | Multi-layer validation |
| `input/index.ts` | ~60 | Barrel exports |
| `output/json-generator.port.ts` | ~300 | JSON n8n generation |
| `output/output-formatter.port.ts` | ~270 | Multi-format output |
| `output/workflow-exporter.port.ts` | ~310 | Export functionality |
| `output/index.ts` | ~60 | Barrel exports |
| `external/llm.port.ts` | ~340 | LLM integration |
| `external/n8n-schema.port.ts` | ~480 | n8n definitions |
| `external/index.ts` | ~60 | Barrel exports |
| `index.ts` | ~160 | Main barrel exports |

**Total**: ~2,760 lines of TypeScript

## Next Steps (Phase 4)

- **Adapters Implementation**: Implement concrete adapters for each port
- **LLM Adapter**: OpenAI/Anthropic integration
- **Parser Adapter**: DSL tokenizer/parser implementation
- **Generator Adapter**: JSON workflow generation

## Commit Information

- **Branch**: `develop`
- **Type**: `feat`
- **Scope**: `ports`
- **Message**: "feat(ports): implement Phase 3 - Ports & Contracts layer"
