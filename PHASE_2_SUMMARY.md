# Phase 2 Summary - Core Domain Module

## ✅ Completed: January 16, 2026

---

## Overview

Phase 2 establishes the **Core Domain Module** of the n8n Workflow Generator Agent, implementing:
- Domain Models (types, enums, constants, DTOs)
- Rules Engine with Strategy Pattern (25 rules across 5 categories)
- JSON Schema validation with AJV

---

## 2.1 Domain Models

### Types (`src/core/domain/types/`)

| File | Description |
|------|-------------|
| `node.types.ts` | n8n node definitions (BaseNode, N8nNode, TriggerNode, CoreNode) and specific parameter interfaces for Webhook, Cron, IF, Switch, HTTP Request, Set, Function, Merge nodes |
| `workflow.types.ts` | Workflow structure (N8nWorkflow, WorkflowSettings, WorkflowMeta, WorkflowTag, PinnedData) and validation results |
| `connection.types.ts` | Connection types (NodeConnection, WorkflowConnections, ConnectionGraph) for node connectivity |
| `prompt.types.ts` | Prompt contract DSL types (@meta, @trigger, @workflow, @constraints, @assumptions) |
| `rules.types.ts` | Rules engine types (Rule, RuleContext, RuleEngineConfig, RuleEngineResult, RuleExecutionResult) with `RuleCategory` enum |

### Enums (`src/core/domain/enums/`)

| File | Enums |
|------|-------|
| `node.enums.ts` | `NodeTypeEnum`, `TriggerTypeEnum`, `CoreNodeTypeEnum`, `NodeCategory` |
| `workflow.enums.ts` | `WorkflowStateEnum`, `ExecutionModeEnum`, `ErrorHandlingEnum` |
| `validation.enums.ts` | `ValidationStateEnum`, `RuleSeverityEnum`, `OutputFormatEnum` |

### Constants (`src/core/domain/constants/`)

| File | Description |
|------|-------------|
| `workflow.constants.ts` | `SUPPORTED_N8N_VERSIONS`, `DEFAULT_WORKFLOW_SETTINGS`, `WORKFLOW_LIMITS` |
| `node.constants.ts` | `NODE_METADATA` registry with required parameters for each node type, helper functions `getNodeMetadata()`, `getRequiredParams()` |

### DTOs (`src/core/domain/dtos/`)

| File | DTOs |
|------|------|
| `node.dto.ts` | `CreateNodeDTO`, `UpdateNodeDTO`, `NodeOutputDTO` |
| `workflow.dto.ts` | `CreateWorkflowDTO`, `UpdateWorkflowDTO`, `WorkflowOutputDTO`, `WorkflowSummaryDTO` |
| `connection.dto.ts` | `CreateConnectionDTO`, `ConnectionOutputDTO` |
| `prompt.dto.ts` | `ParsedPromptDTO`, `PromptInputDTO`, `PromptOutputDTO` |

---

## 2.2 Rules Engine with Strategy Pattern

### Architecture

```
src/core/rules/
├── base/
│   └── base-rule.ts          # Abstract base class for all rules
├── engine/
│   └── rule-engine.ts        # Main orchestrator with Registry pattern
├── categories/
│   ├── input-rules.ts        # 5 rules for input validation
│   ├── structural-rules.ts   # 5 rules for connectivity
│   ├── node-rules.ts         # 5 rules for node constraints
│   ├── flow-rules.ts         # 5 rules for flow validation
│   └── output-rules.ts       # 5 rules for output compatibility
└── index.ts                  # Public API + factory function
```

### Rules by Category (25 Total)

#### INPUT Rules (5)
| Rule | Description | Severity |
|------|-------------|----------|
| `MetaExistsRule` | Validates @meta section exists | error |
| `ValidN8nVersionRule` | Validates n8n version is supported | error |
| `TriggerExistsRule` | Validates @trigger section exists | error |
| `WorkflowStepsExistRule` | Validates @workflow steps exist | error |
| `StrictModeNoAmbiguityRule` | Rejects ambiguous inputs in strict mode | error |

#### STRUCTURAL Rules (5)
| Rule | Description | Severity |
|------|-------------|----------|
| `HasNodesRule` | Workflow has at least one node | error |
| `UniqueNodeNamesRule` | All node names are unique | error |
| `NoOrphanNodesRule` | Non-trigger nodes have incoming connections | warning |
| `ValidConnectionReferencesRule` | All connections reference existing nodes | error |
| `ConnectedWorkflowRule` | All nodes reachable from trigger | warning |

#### NODE Rules (5)
| Rule | Description | Severity |
|------|-------------|----------|
| `ValidNodeTypesRule` | All nodes have recognized types | warning |
| `RequiredParametersRule` | Required params present for each node type | error |
| `ValidNodeVersionRule` | Node versions are valid (>= 1) | warning |
| `ValidNodePositionsRule` | Node positions within bounds | info |
| `ValidNodeIdsRule` | All nodes have valid unique IDs | error |

#### FLOW Rules (5)
| Rule | Description | Severity |
|------|-------------|----------|
| `SingleTriggerRule` | Exactly one trigger node | error |
| `NoCyclesRule` | No circular dependencies (DFS algorithm) | error |
| `NoDeadEndsRule` | No unexpected dead-end nodes | info |
| `ValidWorkflowNameRule` | Valid workflow name (1-128 chars) | error |
| `NodeLimitRule` | Does not exceed 100 nodes | warning |

#### OUTPUT Rules (5)
| Rule | Description | Severity |
|------|-------------|----------|
| `ExportableWorkflowRule` | Has minimum required export structure | error |
| `NodesHaveIdsRule` | All nodes have IDs for n8n import | error |
| `ValidPositionsForRenderRule` | No overlapping/negative positions | warning |
| `ValidConnectionFormatRule` | Connections in correct n8n format | error |
| `JsonSerializableRule` | Workflow serializes to JSON | error |

### Usage Example

```typescript
import { createConfiguredRuleEngine, RuleCategory } from '@core/rules';

// Create engine with all 25 rules pre-registered
const engine = createConfiguredRuleEngine({
  strictMode: true,
  failFast: false,
  maxErrors: 100,
});

// Execute all rules
const result = await engine.execute({
  workflow: myWorkflow,
  promptContract: myPrompt,
  n8nVersion: '1.0.0',
  strictMode: true,
});

// Execute specific category
const flowResult = await engine.executeCategory(RuleCategory.FLOW, context);
```

---

## 2.3 JSON Schema + AJV Validation

### Schemas (`src/core/validation/schemas/`)

#### n8n Workflow Schema (`n8n-workflow.schema.ts`)
- `nodePositionSchema` - Position {x, y}
- `connectionInfoSchema` - Connection {node, type, index}
- `nodeCredentialsSchema` - Credentials reference
- `n8nNodeSchema` - Complete node structure
- `workflowConnectionsSchema` - Connections map
- `workflowSettingsSchema` - Execution settings
- `workflowTagSchema` - Tag {id, name}
- `workflowMetaSchema` - Metadata
- **`n8nWorkflowSchema`** - Complete workflow

#### Node Parameters Schema (`node-parameters.schema.ts`)
- `webhookParametersSchema` - httpMethod, path, responseMode
- `cronParametersSchema` - rule.interval configuration
- `httpRequestParametersSchema` - method, url, headers, body
- `ifParametersSchema` - conditions with operators
- `switchParametersSchema` - rules mode
- `setParametersSchema` - assignments
- `codeParametersSchema` - jsCode/pythonCode
- `mergeParametersSchema` - merge modes and options

#### Prompt Contract Schema (`prompt-contract.schema.ts`)
- `metaContractSchema` - n8n_version, strict_mode
- `triggerContractSchema` - webhook/cron/manual oneOf
- `workflowContractSchema` - name, steps[]
- `constraintsContractSchema` - forbidden_nodes, max_nodes, etc.
- `assumptionsContractSchema` - input_format, environment
- **`promptContractSchema`** - Complete DSL contract

### Validators (`src/core/validation/validators/`)

#### SchemaValidator (`schema-validator.ts`)
```typescript
export class SchemaValidator {
  validateWorkflow<T>(workflow: unknown): ValidationResult<T>
  validatePromptContract<T>(contract: unknown): ValidationResult<T>
  validateNodeParameters<T>(nodeType: string, params: unknown): ValidationResult<T>
  validateWorkflowDeep<T>(workflow: unknown): ValidationResult<T>  // Deep node validation
  registerSchema(name: string, schema: object): void
}

// Singleton access
export function getDefaultValidator(): SchemaValidator
export function createValidator(options?: ValidatorOptions): SchemaValidator
```

#### WorkflowValidator (`workflow-validator.ts`)
Combines schema validation with rules engine:
```typescript
export class WorkflowValidator {
  async validate(workflow: unknown): Promise<WorkflowValidationResult>
  validateSchemaOnly(workflow: unknown): ValidationResult
  async validateRulesOnly(workflow: unknown, promptContract?: unknown): Promise<RuleEngineResult>
}

// Result includes:
interface WorkflowValidationResult {
  isValid: boolean;
  schemaValidation: ValidationResult | undefined;
  rulesValidation: RuleEngineResult | undefined;
  errors: FormattedValidationError[];
  warnings: FormattedValidationError[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    schemaErrors: number;
    ruleErrors: number;
    passedRules: number;
    failedRules: number;
  };
}
```

### Validation Types (`src/core/validation/types/`)

```typescript
enum ValidationSeverity { ERROR, WARNING, INFO }

interface FormattedValidationError {
  path: string;
  message: string;
  severity: ValidationSeverity;
  value?: unknown;
  keyword: string;
  params?: Record<string, unknown>;
}

type ValidationResult<T> = 
  | ValidationSuccessResult<T>
  | ValidationFailureResult;

// Helpers
formatAjvErrors(errors: ErrorObject[]): FormattedValidationError[]
createSuccessResult<T>(data: T, warnings?: []): ValidationSuccessResult<T>
createFailureResult(errors: [], warnings?: []): ValidationFailureResult
isValidationSuccess<T>(result): result is ValidationSuccessResult<T>
isValidationFailure<T>(result): result is ValidationFailureResult
```

---

## File Structure

```
src/core/
├── domain/
│   ├── constants/
│   │   ├── index.ts
│   │   ├── node.constants.ts
│   │   └── workflow.constants.ts
│   ├── dtos/
│   │   ├── connection.dto.ts
│   │   ├── index.ts
│   │   ├── node.dto.ts
│   │   ├── prompt.dto.ts
│   │   └── workflow.dto.ts
│   ├── enums/
│   │   ├── index.ts
│   │   ├── node.enums.ts
│   │   ├── validation.enums.ts
│   │   └── workflow.enums.ts
│   ├── types/
│   │   ├── connection.types.ts
│   │   ├── index.ts
│   │   ├── node.types.ts
│   │   ├── prompt.types.ts
│   │   ├── rules.types.ts
│   │   └── workflow.types.ts
│   └── index.ts
├── rules/
│   ├── base/
│   │   ├── base-rule.ts
│   │   └── index.ts
│   ├── categories/
│   │   ├── flow-rules.ts
│   │   ├── index.ts
│   │   ├── input-rules.ts
│   │   ├── node-rules.ts
│   │   ├── output-rules.ts
│   │   └── structural-rules.ts
│   ├── engine/
│   │   ├── index.ts
│   │   └── rule-engine.ts
│   └── index.ts
├── validation/
│   ├── schemas/
│   │   ├── index.ts
│   │   ├── n8n-workflow.schema.ts
│   │   ├── node-parameters.schema.ts
│   │   └── prompt-contract.schema.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── validation.types.ts
│   ├── validators/
│   │   ├── index.ts
│   │   ├── schema-validator.ts
│   │   └── workflow-validator.ts
│   └── index.ts
└── index.ts

src/types/
└── ajv-formats.d.ts
```

---

## Design Patterns Used

| Pattern | Implementation | Purpose |
|---------|----------------|---------|
| **Strategy** | `BaseRule` abstract class + concrete rule implementations | Interchangeable validation rules |
| **Registry** | `RuleEngine.registry` Map | Dynamic rule registration/lookup |
| **Factory** | `createConfiguredRuleEngine()`, `createValidator()` | Object creation abstraction |
| **Singleton** | `getDefaultValidator()` | Shared validator instance |
| **Template Method** | `BaseRule.execute()` abstract + `createSuccessResult()`/`createFailureResult()` helpers | Common structure with customization |

---

## Dependencies Added (Phase 1)

- `ajv@^8.17.1` - JSON Schema validation
- `ajv-formats@^3.0.1` - Additional format validators (date-time, uri, email, etc.)
- `zod@^3.22.4` - Runtime type validation (for future use)

---

## Technical Decisions

### RuleCategory as Enum
Changed from `type RuleCategory = 'input' | 'structural' | ...` to `enum RuleCategory { INPUT = 'input', ... }` for:
- Better IDE autocomplete
- Runtime access to values
- Safer switch exhaustiveness checking

### Partial<N8nWorkflow> for Flexibility
Rule functions accept `Partial<N8nWorkflow>` instead of `N8nWorkflow` to allow:
- Validating incomplete workflows during construction
- Step-by-step validation as workflow is built
- More flexible integration with generators

### exactOptionalPropertyTypes Disabled
Temporarily disabled in tsconfig.json to ease initial development. Will re-enable in later phases with proper type guards.

---

## Next Steps (Phase 3)

Phase 3 will implement the **Prompt Parsing Module**:
- DSL Parser for @meta, @trigger, @workflow, @constraints, @assumptions
- Natural language understanding integration points
- Step-to-node mapping logic
- Prompt validation and error recovery

---

## Commit History

```
feat(core): complete Phase 2 - Core Domain Module
- Domain Models (types, enums, constants, DTOs)
- Rules Engine with Strategy Pattern (25 rules)
- JSON Schema + AJV Validation
```
