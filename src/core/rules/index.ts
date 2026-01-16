/**
 * Rules Module Index
 *
 * Exporta el motor de reglas y todas las categorías
 */

export * from './base/index.js';
export * from './engine/index.js';
export * from './categories/index.js';

// Re-export rule types for convenience
export type {
  Rule,
  RuleContext,
  RuleEngineConfig,
  RuleEngineResult,
  RuleExecutionResult,
  RuleSeverity,
} from '../domain/types/rules.types.js';

export { RuleCategory } from '../domain/types/rules.types.js';

// Factory para crear motor pre-configurado con todas las reglas
import { RuleEngine } from './engine/rule-engine.js';
import { createInputRules } from './categories/input-rules.js';
import { createStructuralRules } from './categories/structural-rules.js';
import { createNodeRules } from './categories/node-rules.js';
import { createFlowRules } from './categories/flow-rules.js';
import { createOutputRules } from './categories/output-rules.js';
import type { RuleEngineConfig } from '../domain/types/rules.types.js';

/**
 * Crea un motor de reglas completamente configurado con todas las reglas
 */
export function createConfiguredRuleEngine(config?: Partial<RuleEngineConfig>): RuleEngine {
  const engine = new RuleEngine(config);

  // Registrar todas las reglas por categoría
  engine.registerRules(createInputRules());
  engine.registerRules(createStructuralRules());
  engine.registerRules(createNodeRules());
  engine.registerRules(createFlowRules());
  engine.registerRules(createOutputRules());

  return engine;
}
