import React, { useRef, useEffect } from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Syntax highlighting rules for DSL
const highlightSyntax = (code: string): string => {
  return code
    // Section markers
    .replace(/(@meta|@trigger|@workflow|@constraints|@assumptions)/g, 
      '<span class="text-n8n-primary font-semibold">$1</span>')
    // Field names (word followed by colon)
    .replace(/^(\s*)([a-z_]+)(:)/gm, 
      '$1<span class="text-n8n-accent">$2</span><span class="text-gray-500">$3</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, 
      '<span class="text-amber-400">$1</span>')
    // Booleans
    .replace(/\b(true|false)\b/gi, 
      '<span class="text-emerald-400">$1</span>')
    // List items
    .replace(/^(\s*)(-)(\s)/gm, 
      '$1<span class="text-n8n-primary">$2</span>$3')
    // Numbered steps
    .replace(/^(\s*)(\d+\.)(\s)/gm, 
      '$1<span class="text-n8n-primary font-semibold">$2</span>$3')
    // Comments
    .replace(/(#.*)$/gm, 
      '<span class="text-gray-500 italic">$1</span>')
    // Strings in quotes
    .replace(/(".*?"|'.*?')/g, 
      '<span class="text-emerald-400">$1</span>')
    // Keywords
    .replace(/\b(webhook|POST|GET|PUT|DELETE|cron|manual|email|slack|gmail|http)\b/gi,
      '<span class="text-sky-400">$1</span>');
};

export default function PromptEditor({ value, onChange }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Set cursor position after React updates the value
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="relative h-full w-full font-mono text-sm">
      {/* Syntax highlighted overlay */}
      <div
        ref={highlightRef}
        className="absolute inset-0 p-4 overflow-hidden whitespace-pre-wrap break-words pointer-events-none text-transparent"
        style={{ 
          lineHeight: '1.5rem',
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightSyntax(value) + '\n' }}
      />
      
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full p-4 bg-transparent text-gray-300 caret-n8n-primary resize-none outline-none"
        style={{ 
          lineHeight: '1.5rem',
          caretColor: '#ff6d5a'
        }}
        spellCheck={false}
        placeholder="Escribe tu prompt DSL aquí..."
      />
      
      {/* Line numbers gutter */}
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-n8n-dark/50 border-r border-gray-800 pointer-events-none">
        <div className="py-4 text-right pr-2 text-gray-600 select-none" style={{ lineHeight: '1.5rem' }}>
          {value.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      </div>
      
      {/* Adjust textarea padding for line numbers */}
      <style>{`
        .relative > textarea,
        .relative > div:first-of-type {
          padding-left: 3.5rem !important;
        }
      `}</style>
    </div>
  );
}
