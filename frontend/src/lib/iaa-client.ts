/**
 * IAA Client - Comunicación con el backend de generación de workflows
 */

// URL del backend - configurada en tiempo de build
const BACKEND_URL = 'http://localhost:3000';

export interface GenerateRequest {
  prompt: string;
  options?: {
    llmProvider?: 'anthropic' | 'openai';
    n8nVersion?: string;
    strictMode?: boolean;
  };
}

export interface GenerateResponse {
  success: boolean;
  workflow?: object;
  errors?: string[];
  warnings?: string[];
  stats?: {
    nodesGenerated: number;
    connectionsGenerated: number;
    generationTimeMs: number;
  };
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Genera un workflow n8n a partir de un prompt DSL
 */
export async function generateWorkflow(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        errors: [`Error del servidor: ${response.status} - ${error}`],
      };
    }
    
    return await response.json();
  } catch (error) {
    // Si el backend no está disponible
    console.warn('Backend no disponible:', error);
    return {
      success: false,
      errors: [
        'El servidor backend no está disponible.',
        'Ejecuta el backend con: npm run server (desde la raíz del proyecto)',
        'O usa el CLI directamente: npm start -- generate -i <archivo.prompt>',
      ],
    };
  }
}

/**
 * Valida un prompt DSL sin generar el workflow
 */
export async function validatePrompt(prompt: string): Promise<ValidateResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      return {
        valid: false,
        errors: [`Error del servidor: ${response.status}`],
        warnings: [],
      };
    }
    
    return await response.json();
  } catch {
    return {
      valid: false,
      errors: ['No se pudo conectar con el servidor de validación'],
      warnings: [],
    };
  }
}
