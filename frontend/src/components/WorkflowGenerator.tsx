import React, { useState, useCallback } from 'react';
import { Play, Download, Copy, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import PromptEditor from './PromptEditor';
import WorkflowPreview from './WorkflowPreview';

const SAMPLE_PROMPT = `@meta
n8n_version: 1.0.0
output: json
strict: false

@trigger
type: webhook
method: POST
path: /api/create-workflow

@workflow
1. Recibir datos del webhook con información del cliente
2. Validar que el email tenga formato correcto
3. Si el cliente es nuevo, crear registro en la base de datos
4. Enviar email de bienvenida con Gmail
5. Notificar al equipo de ventas por Slack
6. Retornar respuesta de éxito

@constraints
- max_nodes: 10
- timeout: 30
- require_credentials

@assumptions
- credentials_exist
- error_handling: retry
- retries: 3`;

interface GenerationResult {
  success: boolean;
  workflow?: object;
  errors?: string[];
  warnings?: string[];
}

export default function WorkflowGenerator() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'preview'>('json');

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        errors: ['Error de conexión con el servidor. Verifica que el backend esté ejecutándose.'],
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handleCopy = useCallback(async () => {
    if (result?.workflow) {
      await navigator.clipboard.writeText(JSON.stringify(result.workflow, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (result?.workflow) {
      const blob = new Blob([JSON.stringify(result.workflow, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workflow.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [result]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="card flex flex-col">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-n8n-primary" />
            <h2 className="font-semibold">Prompt DSL</h2>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generar
              </>
            )}
          </button>
        </div>
        <div className="flex-1 min-h-[500px]">
          <PromptEditor value={prompt} onChange={setPrompt} />
        </div>
      </div>

      {/* Output Panel */}
      <div className="card flex flex-col">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'json'
                  ? 'bg-n8n-primary/20 text-n8n-primary'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              JSON Output
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-n8n-accent/20 text-n8n-accent'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Preview
            </button>
          </div>
          {result?.success && result.workflow && (
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="btn-secondary flex items-center gap-2 text-sm">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-n8n-success" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
              <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-[500px] overflow-hidden">
          {result === null && !isGenerating && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Escribe tu prompt y presiona "Generar"</p>
                <p className="text-sm mt-2">El workflow aparecerá aquí</p>
              </div>
            </div>
          )}
          
          {isGenerating && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-n8n-primary animate-spin" />
                <p className="text-gray-400">Generando workflow...</p>
                <p className="text-sm text-gray-500 mt-2">La IA está procesando tu prompt</p>
              </div>
            </div>
          )}
          
          {result && !isGenerating && (
            <>
              {result.errors && result.errors.length > 0 && (
                <div className="m-4 p-4 bg-n8n-error/10 border border-n8n-error/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-n8n-error flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-n8n-error mb-1">Errores</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {result.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {result.warnings && result.warnings.length > 0 && (
                <div className="mx-4 mt-4 p-4 bg-n8n-warning/10 border border-n8n-warning/30 rounded-lg">
                  <h4 className="font-medium text-n8n-warning mb-1">Advertencias</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {result.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.success && result.workflow && (
                <div className="h-full">
                  {activeTab === 'json' ? (
                    <pre className="h-full p-4 overflow-auto text-sm font-mono text-gray-300 bg-n8n-dark">
                      {JSON.stringify(result.workflow, null, 2)}
                    </pre>
                  ) : (
                    <WorkflowPreview workflow={result.workflow} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
