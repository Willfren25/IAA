/**
 * Prompt Contract Adapter - Implementación del contrato de prompt
 *
 * Implementa PromptContractPort para procesar entrada DSL.
 */

import type {
  PromptContractPort,
  PromptSection,
  SectionParseState,
  SectionExtractionResult,
  PromptContractOptions,
  ContractValidationResult,
  ContractConversionResult,
} from '@ports/input/prompt-contract.port.js';

import {
  REQUIRED_SECTIONS_NORMAL,
  REQUIRED_SECTIONS_STRICT,
  ALL_SECTIONS,
} from '@ports/input/prompt-contract.port.js';

import type {
  PromptMeta,
  PromptTrigger,
  WorkflowStep,
  PromptConstraints,
  PromptAssumptions,
  PromptContract,
  OutputFormat,
  PromptTriggerType,
} from '@core/domain/types/prompt.types.js';

/**
 * Regex patterns para extraer secciones
 */
const SECTION_PATTERNS: Record<PromptSection, RegExp> = {
  '@meta': /@meta\b([\s\S]*?)(?=@(?:trigger|workflow|constraints|assumptions)\b|$)/i,
  '@trigger': /@trigger\b([\s\S]*?)(?=@(?:meta|workflow|constraints|assumptions)\b|$)/i,
  '@workflow': /@workflow\b([\s\S]*?)(?=@(?:meta|trigger|constraints|assumptions)\b|$)/i,
  '@constraints': /@constraints\b([\s\S]*?)(?=@(?:meta|trigger|workflow|assumptions)\b|$)/i,
  '@assumptions': /@assumptions\b([\s\S]*?)(?=@(?:meta|trigger|workflow|constraints)\b|$)/i,
};

/**
 * Implementación del PromptContractPort
 */
export class PromptContractAdapter implements PromptContractPort {
  /**
   * Extrae la sección @meta del prompt
   */
  extractMeta(rawInput: string): SectionExtractionResult<PromptMeta> {
    const match = rawInput.match(SECTION_PATTERNS['@meta']);

    if (!match) {
      return {
        success: false,
        errors: ['@meta section not found'],
      };
    }

    const content = match[1]?.trim() ?? '';
    let n8nVersion = '1.0.0';
    let output: OutputFormat = 'json';
    let strict = false;

    // Parsear campos
    const lines = content.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case 'n8n_version':
        case 'version':
          n8nVersion = value;
          break;
        case 'output_type':
        case 'output':
          if (value === 'json' || value === 'yaml' || value === 'pretty-json') {
            output = value;
          }
          break;
        case 'strict':
          strict = value.toLowerCase() === 'true';
          break;
      }
    }

    const meta: PromptMeta = {
      n8nVersion,
      output,
      strict,
    };

    return {
      success: true,
      data: meta,
      rawContent: content,
    };
  }

  /**
   * Extrae la sección @trigger del prompt
   */
  extractTrigger(rawInput: string): SectionExtractionResult<PromptTrigger> {
    const match = rawInput.match(SECTION_PATTERNS['@trigger']);

    if (!match) {
      return {
        success: false,
        errors: ['@trigger section not found'],
      };
    }

    const content = match[1]?.trim() ?? '';
    let type: PromptTriggerType = 'manual';
    let method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | undefined;
    let path: string | undefined;
    let schedule: string | undefined;
    const options: Record<string, unknown> = {};

    // Parsear tipo y configuración
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        // Sin dos puntos, puede ser tipo directo
        const lower = trimmed.toLowerCase();
        if (lower.includes('webhook')) {
          type = 'webhook';
        } else if (lower.includes('cron') || lower.includes('schedule')) {
          type = 'cron';
        } else if (lower.includes('manual')) {
          type = 'manual';
        }
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
      const value = trimmed.slice(colonIndex + 1).trim();

      switch (key) {
        case 'type':
        case 'tipo': {
          const lower = value.toLowerCase();
          if (lower.includes('webhook')) {
            type = 'webhook';
          } else if (lower.includes('cron') || lower.includes('schedule')) {
            type = 'cron';
          } else if (lower.includes('custom')) {
            type = 'custom';
          } else {
            type = 'manual';
          }
          break;
        }
        case 'method':
          if (
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
          options[key] = value;
      }
    }

    const trigger: PromptTrigger = {
      type,
      ...(method && { method }),
      ...(path && { path }),
      ...(schedule && { schedule }),
      ...(Object.keys(options).length > 0 && { options }),
    };

    return {
      success: true,
      data: trigger,
      rawContent: content,
    };
  }

  /**
   * Extrae la sección @workflow del prompt
   */
  extractWorkflow(rawInput: string): SectionExtractionResult<readonly WorkflowStep[]> {
    const match = rawInput.match(SECTION_PATTERNS['@workflow']);

    if (!match) {
      return {
        success: false,
        errors: ['@workflow section not found'],
      };
    }

    const content = match[1]?.trim() ?? '';
    const steps: WorkflowStep[] = [];

    // Parsear pasos numerados
    const stepRegex = /(\d+)\.\s*(.+?)(?=\d+\.|$)/gs;
    let stepMatch: RegExpExecArray | null;

    while ((stepMatch = stepRegex.exec(content)) !== null) {
      const stepNumber = parseInt(stepMatch[1] ?? '0', 10);
      const action = (stepMatch[2] ?? '').trim().replace(/\n/g, ' ').trim();

      // Detectar tipo de nodo basado en la acción
      let nodeType: string | undefined;
      const actionLower = action.toLowerCase();

      if (
        actionLower.includes('http') ||
        actionLower.includes('api') ||
        actionLower.includes('request')
      ) {
        nodeType = 'n8n-nodes-base.httpRequest';
      } else if (actionLower.includes('email') || actionLower.includes('gmail')) {
        nodeType = 'n8n-nodes-base.gmail';
      } else if (actionLower.includes('slack')) {
        nodeType = 'n8n-nodes-base.slack';
      } else if (
        actionLower.includes('if') ||
        actionLower.includes('si ') ||
        actionLower.includes('condicion')
      ) {
        nodeType = 'n8n-nodes-base.if';
      } else if (actionLower.includes('set') || actionLower.includes('transformar')) {
        nodeType = 'n8n-nodes-base.set';
      } else if (actionLower.includes('code') || actionLower.includes('javascript')) {
        nodeType = 'n8n-nodes-base.code';
      }

      // Detectar condiciones
      const hasCondition = /\b(si|cuando|if|when)\b/i.test(action);

      const step: WorkflowStep = {
        stepNumber,
        action,
        ...(nodeType && { nodeType }),
        ...(hasCondition && { conditions: action }),
      };

      steps.push(step);
    }

    // Si no hay pasos numerados, intentar con guiones
    if (steps.length === 0) {
      const lines = content.split('\n');
      let stepNumber = 1;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          steps.push({
            stepNumber: stepNumber++,
            action: trimmed.slice(1).trim(),
          });
        }
      }
    }

    if (steps.length === 0) {
      return {
        success: false,
        errors: ['No workflow steps found'],
        rawContent: content,
      };
    }

    return {
      success: true,
      data: steps,
      rawContent: content,
    };
  }

  /**
   * Extrae la sección @constraints del prompt (opcional)
   */
  extractConstraints(rawInput: string): SectionExtractionResult<PromptConstraints> {
    const match = rawInput.match(SECTION_PATTERNS['@constraints']);

    if (!match) {
      return {
        success: true,
        data: {},
        warnings: ['@constraints section not found (optional)'],
      };
    }

    const content = match[1]?.trim() ?? '';
    let maxNodes: number | undefined;
    const allowedNodeTypes: string[] = [];
    const forbiddenNodeTypes: string[] = [];
    let requireCredentials: boolean | undefined;
    let timeoutSeconds: number | undefined;
    const customRules: string[] = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Remover guión inicial si existe
      const cleanLine = trimmed.startsWith('-') ? trimmed.slice(1).trim() : trimmed;

      // Buscar max_nodes
      const maxNodesMatch = cleanLine.match(/max_nodes?\s*[:=]\s*(\d+)/i);
      if (maxNodesMatch?.[1]) {
        maxNodes = parseInt(maxNodesMatch[1], 10);
        continue;
      }

      // Buscar timeout
      const timeoutMatch = cleanLine.match(/timeout\s*[:=]\s*(\d+)/i);
      if (timeoutMatch?.[1]) {
        timeoutSeconds = parseInt(timeoutMatch[1], 10);
        continue;
      }

      // Buscar require_credentials
      if (cleanLine.toLowerCase().includes('require_credentials')) {
        requireCredentials = true;
        continue;
      }

      // Buscar allowed_nodes
      const allowedMatch = cleanLine.match(/allowed_nodes?\s*[:=]\s*(.+)/i);
      if (allowedMatch?.[1]) {
        allowedNodeTypes.push(...allowedMatch[1].split(',').map((s) => s.trim()));
        continue;
      }

      // Buscar forbidden_nodes
      const forbiddenMatch = cleanLine.match(/forbidden_nodes?\s*[:=]\s*(.+)/i);
      if (forbiddenMatch?.[1]) {
        forbiddenNodeTypes.push(...forbiddenMatch[1].split(',').map((s) => s.trim()));
        continue;
      }

      // Otro constraint personalizado
      if (cleanLine) {
        customRules.push(cleanLine);
      }
    }

    const constraints: PromptConstraints = {
      ...(maxNodes !== undefined && { maxNodes }),
      ...(allowedNodeTypes.length > 0 && { allowedNodeTypes }),
      ...(forbiddenNodeTypes.length > 0 && { forbiddenNodeTypes }),
      ...(requireCredentials !== undefined && { requireCredentials }),
      ...(timeoutSeconds !== undefined && { timeoutSeconds }),
      ...(customRules.length > 0 && { customRules }),
    };

    return {
      success: true,
      data: constraints,
      rawContent: content,
    };
  }

  /**
   * Extrae la sección @assumptions del prompt (opcional)
   */
  extractAssumptions(rawInput: string): SectionExtractionResult<PromptAssumptions> {
    const match = rawInput.match(SECTION_PATTERNS['@assumptions']);

    if (!match) {
      return {
        success: true,
        data: {},
        warnings: ['@assumptions section not found (optional)'],
      };
    }

    const content = match[1]?.trim() ?? '';
    let defaultErrorHandling: 'stop' | 'continue' | 'retry' | undefined;
    let defaultRetries: number | undefined;
    let assumeCredentialsExist: boolean | undefined;
    const environmentVariables: string[] = [];
    const customAssumptions: string[] = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Remover guión inicial si existe
      const cleanLine = trimmed.startsWith('-') ? trimmed.slice(1).trim() : trimmed;

      // Buscar error_handling
      const errorMatch = cleanLine.match(/error_handling\s*[:=]\s*(\w+)/i);
      if (errorMatch?.[1]) {
        const value = errorMatch[1].toLowerCase();
        if (value === 'stop' || value === 'continue' || value === 'retry') {
          defaultErrorHandling = value;
        }
        continue;
      }

      // Buscar retries
      const retriesMatch = cleanLine.match(/retries?\s*[:=]\s*(\d+)/i);
      if (retriesMatch?.[1]) {
        defaultRetries = parseInt(retriesMatch[1], 10);
        continue;
      }

      // Buscar credentials_exist
      if (cleanLine.toLowerCase().includes('credentials_exist')) {
        assumeCredentialsExist = true;
        continue;
      }

      // Buscar env_vars
      const envMatch = cleanLine.match(/env_vars?\s*[:=]\s*(.+)/i);
      if (envMatch?.[1]) {
        environmentVariables.push(...envMatch[1].split(',').map((s) => s.trim()));
        continue;
      }

      // Otra asunción personalizada
      if (cleanLine) {
        customAssumptions.push(cleanLine);
      }
    }

    const assumptions: PromptAssumptions = {
      ...(defaultErrorHandling && { defaultErrorHandling }),
      ...(defaultRetries !== undefined && { defaultRetries }),
      ...(assumeCredentialsExist !== undefined && { assumeCredentialsExist }),
      ...(environmentVariables.length > 0 && { environmentVariables }),
      ...(customAssumptions.length > 0 && { customAssumptions }),
    };

    return {
      success: true,
      data: assumptions,
      rawContent: content,
    };
  }

  /**
   * Valida el contrato completo
   */
  validateContract(rawInput: string, options?: PromptContractOptions): ContractValidationResult {
    const opts = options ?? {};
    const strictMode = opts.strictMode ?? false;
    const errors: string[] = [];
    const warnings: string[] = [];
    const sections: SectionParseState[] = [];

    // Determinar secciones requeridas
    const requiredSections = strictMode ? REQUIRED_SECTIONS_STRICT : REQUIRED_SECTIONS_NORMAL;

    // Verificar cada sección
    for (const section of ALL_SECTIONS) {
      const pattern = SECTION_PATTERNS[section];
      const match = rawInput.match(pattern);
      const found = !!match;
      const isRequired = requiredSections.includes(section);

      let valid = true;
      const sectionErrors: string[] = [];

      if (found) {
        // Validar contenido de la sección
        switch (section) {
          case '@meta': {
            const result = this.extractMeta(rawInput);
            valid = result.success;
            if (result.errors) {
              sectionErrors.push(...result.errors);
            }
            break;
          }
          case '@trigger': {
            const result = this.extractTrigger(rawInput);
            valid = result.success;
            if (result.errors) {
              sectionErrors.push(...result.errors);
            }
            break;
          }
          case '@workflow': {
            const result = this.extractWorkflow(rawInput);
            valid = result.success;
            if (result.errors) {
              sectionErrors.push(...result.errors);
            }
            break;
          }
          case '@constraints': {
            const result = this.extractConstraints(rawInput);
            valid = result.success;
            if (result.errors) {
              sectionErrors.push(...result.errors);
            }
            break;
          }
          case '@assumptions': {
            const result = this.extractAssumptions(rawInput);
            valid = result.success;
            if (result.errors) {
              sectionErrors.push(...result.errors);
            }
            break;
          }
        }
      } else if (isRequired) {
        errors.push(`Required section ${section} not found`);
      } else {
        warnings.push(`Optional section ${section} not found`);
      }

      sections.push({
        section,
        found,
        valid,
        errors: sectionErrors.length > 0 ? sectionErrors : undefined,
      });
    }

    // Agregar errores de secciones individuales
    for (const section of sections) {
      if (section.errors) {
        errors.push(...section.errors);
      }
    }

    const missingRequired = requiredSections.filter(
      (s) => !sections.find((sec) => sec.section === s && sec.found)
    );

    return {
      isValid: errors.length === 0,
      sections,
      missingRequired,
      errors,
      warnings,
    };
  }

  /**
   * Convierte input crudo a PromptContract estructurado
   */
  toContract(rawInput: string, options?: PromptContractOptions): ContractConversionResult {
    const startTime = performance.now();
    const validationResult = this.validateContract(rawInput, options);

    if (!validationResult.isValid) {
      return {
        success: false,
        validationResult,
        processingTimeMs: performance.now() - startTime,
      };
    }

    // Extraer cada sección
    const metaResult = this.extractMeta(rawInput);
    const triggerResult = this.extractTrigger(rawInput);
    const workflowResult = this.extractWorkflow(rawInput);
    const constraintsResult = this.extractConstraints(rawInput);
    const assumptionsResult = this.extractAssumptions(rawInput);

    // Construir contrato
    const contract: PromptContract = {
      meta: metaResult.data ?? { n8nVersion: '1.0.0', output: 'json', strict: false },
      trigger: triggerResult.data ?? { type: 'manual' },
      workflow: workflowResult.data ?? [],
      ...(constraintsResult.data &&
        Object.keys(constraintsResult.data).length > 0 && {
          constraints: constraintsResult.data,
        }),
      ...(assumptionsResult.data &&
        Object.keys(assumptionsResult.data).length > 0 && {
          assumptions: assumptionsResult.data,
        }),
      rawInput,
    };

    return {
      success: true,
      contract,
      validationResult,
      processingTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Verifica si el input contiene una sección específica
   */
  hasSection(rawInput: string, section: PromptSection): boolean {
    const pattern = SECTION_PATTERNS[section];
    return pattern.test(rawInput);
  }

  /**
   * Lista todas las secciones encontradas en el input
   */
  listSections(rawInput: string): readonly PromptSection[] {
    const found: PromptSection[] = [];

    for (const section of ALL_SECTIONS) {
      if (this.hasSection(rawInput, section)) {
        found.push(section);
      }
    }

    return found;
  }

  /**
   * Obtiene las secciones requeridas según el modo
   */
  getRequiredSections(strictMode: boolean): readonly PromptSection[] {
    return strictMode ? REQUIRED_SECTIONS_STRICT : REQUIRED_SECTIONS_NORMAL;
  }
}

/**
 * Factory para crear el adapter
 */
export function createPromptContractAdapter(): PromptContractPort {
  return new PromptContractAdapter();
}
