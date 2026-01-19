import React, { useMemo } from 'react';
import { Box, ArrowRight, Zap, Database, Mail, MessageSquare, Globe, Code } from 'lucide-react';

interface WorkflowPreviewProps {
  workflow: any;
}

// Map n8n node types to icons
const getNodeIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'n8n-nodes-base.webhook': <Globe className="w-5 h-5" />,
    'n8n-nodes-base.manualTrigger': <Zap className="w-5 h-5" />,
    'n8n-nodes-base.httpRequest': <Globe className="w-5 h-5" />,
    'n8n-nodes-base.code': <Code className="w-5 h-5" />,
    'n8n-nodes-base.if': <Box className="w-5 h-5" />,
    'n8n-nodes-base.set': <Database className="w-5 h-5" />,
    'n8n-nodes-base.gmail': <Mail className="w-5 h-5" />,
    'n8n-nodes-base.slack': <MessageSquare className="w-5 h-5" />,
    'n8n-nodes-base.postgres': <Database className="w-5 h-5" />,
    'n8n-nodes-base.respondToWebhook': <ArrowRight className="w-5 h-5" />,
  };
  return iconMap[type] || <Box className="w-5 h-5" />;
};

// Get color based on node type
const getNodeColor = (type: string): string => {
  if (type.includes('Trigger') || type.includes('webhook')) return 'from-emerald-500 to-emerald-600';
  if (type.includes('if') || type.includes('switch')) return 'from-amber-500 to-amber-600';
  if (type.includes('gmail') || type.includes('slack')) return 'from-blue-500 to-blue-600';
  if (type.includes('postgres') || type.includes('mysql')) return 'from-purple-500 to-purple-600';
  if (type.includes('code')) return 'from-pink-500 to-pink-600';
  if (type.includes('respond')) return 'from-red-500 to-red-600';
  return 'from-gray-500 to-gray-600';
};

export default function WorkflowPreview({ workflow }: WorkflowPreviewProps) {
  const nodes = useMemo(() => workflow?.nodes || [], [workflow]);
  const connections = useMemo(() => workflow?.connections || {}, [workflow]);

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No hay nodos en el workflow</p>
      </div>
    );
  }

  // Calculate node positions for visualization
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node: any, index: number) => {
      positions[node.name] = {
        x: node.position?.[0] || (150 + (index % 4) * 200),
        y: node.position?.[1] || (100 + Math.floor(index / 4) * 150),
      };
    });
    return positions;
  }, [nodes]);

  // Find min/max positions for viewport
  const viewport = useMemo(() => {
    const posValues = Object.values(nodePositions) as { x: number; y: number }[];
    const xs = posValues.map((p) => p.x);
    const ys = posValues.map((p) => p.y);
    return {
      minX: Math.min(...xs) - 50,
      minY: Math.min(...ys) - 50,
      maxX: Math.max(...xs) + 200,
      maxY: Math.max(...ys) + 150,
    };
  }, [nodePositions]);

  return (
    <div className="h-full overflow-auto bg-n8n-dark p-4">
      {/* Workflow Stats */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="badge-success">
          {nodes.length} nodos
        </div>
        <div className="badge-warning">
          {Object.keys(connections).length} conexiones
        </div>
        {workflow.name && (
          <div className="text-gray-400">
            <span className="text-gray-500">Nombre:</span> {workflow.name}
          </div>
        )}
      </div>

      {/* Visual Preview */}
      <div 
        className="relative bg-n8n-secondary/50 rounded-xl border border-gray-800 overflow-hidden"
        style={{
          width: '100%',
          height: Math.max(400, viewport.maxY - viewport.minY + 100),
        }}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Connections (SVG lines) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {Object.entries(connections).map(([sourceName, outputs]: [string, any]) => {
            const sourcePos = nodePositions[sourceName];
            if (!sourcePos || !outputs?.main) return null;

            return outputs.main.flatMap((targets: any[], outputIndex: number) =>
              targets.map((target: any, targetIndex: number) => {
                const targetPos = nodePositions[target.node];
                if (!targetPos) return null;

                const startX = sourcePos.x - viewport.minX + 140;
                const startY = sourcePos.y - viewport.minY + 35;
                const endX = targetPos.x - viewport.minX + 10;
                const endY = targetPos.y - viewport.minY + 35;

                // Calculate control points for curved line
                const midX = (startX + endX) / 2;

                return (
                  <g key={`${sourceName}-${target.node}-${outputIndex}-${targetIndex}`}>
                    <path
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="#ff6d5a"
                      strokeWidth="2"
                      strokeOpacity="0.6"
                    />
                    {/* Arrow head */}
                    <circle cx={endX} cy={endY} r="4" fill="#ff6d5a" />
                  </g>
                );
              })
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node: any) => {
          const pos = nodePositions[node.name];
          return (
            <div
              key={node.id || node.name}
              className="absolute group"
              style={{
                left: pos.x - viewport.minX,
                top: pos.y - viewport.minY,
                width: 150,
              }}
            >
              <div 
                className={`
                  bg-gradient-to-br ${getNodeColor(node.type)}
                  rounded-lg p-3 shadow-lg border border-white/10
                  transform transition-transform group-hover:scale-105
                  cursor-default
                `}
              >
                <div className="flex items-center gap-2 text-white">
                  {getNodeIcon(node.type)}
                  <span className="text-sm font-medium truncate">{node.name}</span>
                </div>
                <div className="mt-1 text-xs text-white/60 truncate">
                  {node.type.split('.').pop()}
                </div>
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 top-0 z-10 hidden group-hover:block">
                <div className="bg-n8n-dark border border-gray-700 rounded-lg p-3 shadow-xl text-sm min-w-[200px]">
                  <div className="font-medium text-white mb-1">{node.name}</div>
                  <div className="text-gray-400 text-xs">{node.type}</div>
                  {node.parameters && Object.keys(node.parameters).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Parámetros:</div>
                      {Object.entries(node.parameters).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="text-xs text-gray-400 truncate">
                          <span className="text-n8n-primary">{key}:</span> {String(value).substring(0, 20)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Node List */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Lista de Nodos</h4>
        <div className="space-y-2">
          {nodes.map((node: any, index: number) => (
            <div 
              key={node.id || index}
              className="flex items-center gap-3 p-2 rounded-lg bg-n8n-secondary/50 border border-gray-800"
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${getNodeColor(node.type)}`}>
                {getNodeIcon(node.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{node.name}</div>
                <div className="text-xs text-gray-500 truncate">{node.type}</div>
              </div>
              <div className="text-xs text-gray-600">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
