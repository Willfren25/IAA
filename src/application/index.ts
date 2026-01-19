/**
 * Application Layer
 *
 * Casos de uso, servicios de aplicación y orquestadores.
 * Aquí se implementa la lógica de coordinación entre puertos y el core.
 * Implementa principios SOLID: SRP, DIP.
 */

// Services
export {
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
  
  // Agent Orchestrator
  AgentOrchestrator,
  getAgentOrchestrator,
  createAgentOrchestrator,
  type AgentExecutionState,
  type AgentExecutionEvent,
  type AgentExecutionResult,
  type AgentOrchestratorOptions,
} from './services/index.js';
