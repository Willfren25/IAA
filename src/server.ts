/**
 * IAA HTTP Server
 * 
 * Servidor HTTP para exponer la funcionalidad de IAA como API REST.
 * Permite generar workflows n8n desde el frontend web.
 */

import http from 'http';
import { URL } from 'url';
import { createAgentOrchestrator } from './application/index.js';

const PORT = parseInt(process.env['PORT'] || '3000', 10);
const HOST = process.env['HOST'] || '0.0.0.0';

interface RequestBody {
  prompt: string;
  options?: {
    llmProvider?: 'anthropic' | 'openai';
    n8nVersion?: string;
    strictMode?: boolean;
  };
}

/**
 * Logger utility for server
 */
const logger = {
  info: (message: string): void => {
    process.stdout.write(`[${new Date().toISOString()}] INFO: ${message}\n`);
  },
  error: (message: string, error?: unknown): void => {
    process.stderr.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
    if (error) {
      process.stderr.write(`${String(error)}\n`);
    }
  },
  request: (method: string, path: string): void => {
    process.stdout.write(`[${new Date().toISOString()}] ${method} ${path}\n`);
  },
};

/**
 * CORS headers for cross-origin requests
 */
function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Parse request body as JSON
 */
async function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handle POST /api/generate
 */
async function handleGenerate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseBody(req) as RequestBody;
    
    if (!body.prompt || typeof body.prompt !== 'string') {
      sendJson(res, 400, {
        success: false,
        errors: ['El prompt es requerido y debe ser una cadena de texto'],
      });
      return;
    }

    logger.info('Generating workflow...');
    const startTime = Date.now();

    // Create orchestrator and generate workflow
    const orchestrator = createAgentOrchestrator();

    const result = await orchestrator.executeFromText(body.prompt);
    const generationTimeMs = Date.now() - startTime;

    logger.info(`Generation completed in ${generationTimeMs}ms`);

    if (result.success && result.workflowResult?.workflow) {
      const workflow = result.workflowResult.workflow;
      const nodes = workflow['nodes'] as unknown[] | undefined;
      const connections = workflow['connections'] as Record<string, unknown> | undefined;
      sendJson(res, 200, {
        success: true,
        workflow,
        warnings: result.warnings || [],
        stats: {
          nodesGenerated: nodes?.length || 0,
          connectionsGenerated: Object.keys(connections || {}).length,
          generationTimeMs,
        },
      });
    } else {
      sendJson(res, 400, {
        success: false,
        errors: result.errors || ['Error desconocido en la generación'],
        warnings: result.warnings || [],
      });
    }
  } catch (error) {
    logger.error('Error in /api/generate:', error);
    sendJson(res, 500, {
      success: false,
      errors: [error instanceof Error ? error.message : 'Error interno del servidor'],
    });
  }
}

/**
 * Handle POST /api/validate
 */
async function handleValidate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await parseBody(req) as { prompt?: string };
    
    if (!body.prompt || typeof body.prompt !== 'string') {
      sendJson(res, 400, {
        valid: false,
        errors: ['El prompt es requerido'],
        warnings: [],
      });
      return;
    }

    // Basic validation - check for required sections
    const sections = ['@meta', '@trigger', '@workflow'];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const section of sections) {
      if (!body.prompt.includes(section)) {
        errors.push(`Sección ${section} no encontrada`);
      }
    }

    // Check optional sections
    if (!body.prompt.includes('@constraints')) {
      warnings.push('Sección @constraints no encontrada (opcional)');
    }
    if (!body.prompt.includes('@assumptions')) {
      warnings.push('Sección @assumptions no encontrada (opcional)');
    }

    sendJson(res, 200, {
      valid: errors.length === 0,
      errors,
      warnings,
    });
  } catch (error) {
    sendJson(res, 500, {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Error de validación'],
      warnings: [],
    });
  }
}

/**
 * Handle GET /health
 */
function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
  sendJson(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    llmProvider: process.env['LLM_PROVIDER'] || 'anthropic',
  });
}

/**
 * Handle GET /
 */
function handleRoot(_req: http.IncomingMessage, res: http.ServerResponse): void {
  sendJson(res, 200, {
    name: 'IAA - Generador de Workflows n8n',
    version: '1.0.0',
    endpoints: {
      'POST /api/generate': 'Genera un workflow n8n desde un prompt DSL',
      'POST /api/validate': 'Valida un prompt DSL',
      'GET /health': 'Estado del servidor',
    },
    documentation: 'https://github.com/Willfren25/IAA',
  });
}

/**
 * Request handler
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  logger.request(req.method || 'GET', path);

  try {
    // Route matching
    if (path === '/' && req.method === 'GET') {
      handleRoot(req, res);
    } else if (path === '/health' && req.method === 'GET') {
      handleHealth(req, res);
    } else if (path === '/api/generate' && req.method === 'POST') {
      await handleGenerate(req, res);
    } else if (path === '/api/validate' && req.method === 'POST') {
      await handleValidate(req, res);
    } else {
      sendJson(res, 404, {
        error: 'Not Found',
        path,
        availableEndpoints: ['/', '/health', '/api/generate', '/api/validate'],
      });
    }
  } catch (error) {
    logger.error('Unhandled error:', error);
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Print startup banner
 */
function printBanner(): void {
  const banner = `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 IAA Server Running                                    ║
║                                                            ║
║   Local:   http://localhost:${PORT}                          ║
║   Network: http://${HOST}:${PORT}                           ║
║                                                            ║
║   Endpoints:                                               ║
║   • GET  /           - API info                            ║
║   • GET  /health     - Health check                        ║
║   • POST /api/generate - Generate workflow                 ║
║   • POST /api/validate - Validate prompt                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`;
  process.stdout.write(banner);
}

/**
 * Start HTTP server
 */
export function startServer(): http.Server {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(error => {
      logger.error('Request handler error:', error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Internal Server Error' });
      }
    });
  });

  server.listen(PORT, HOST, () => {
    printBanner();
  });

  return server;
}

// Run if executed directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default startServer;
