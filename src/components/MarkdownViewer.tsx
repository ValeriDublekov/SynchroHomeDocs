import React, { useState } from 'react';
import { Copy, Check, FileText, Download } from 'lucide-react';
import { DocItem } from '../data/docsData';

interface Props {
  doc: DocItem;
}

export const MarkdownViewer: React.FC<Props> = ({ doc }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Basic custom markdown renderer to ensure gorgeous typography without heavy external markdown deps
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';

    lines.forEach((line, index) => {
      // Check for code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // Closing code block
          elements.push(
            <div key={`code-${index}`} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
              {codeBlockLang && (
                <div className="bg-slate-900 px-4 py-1.5 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                {codeBlockContent.trim()}
              </pre>
            </div>
          );
          codeBlockContent = '';
          codeBlockLang = '';
          inCodeBlock = false;
        } else {
          // Opening code block
          inCodeBlock = true;
          codeBlockLang = line.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-white mt-6 mb-3 tracking-tight border-b border-slate-800 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-lg font-semibold text-slate-100 mt-6 mb-2 text-indigo-300">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-base font-semibold text-slate-200 mt-5 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={index} className="text-sm font-semibold text-slate-300 mt-4 mb-1">
            {line.replace('#### ', '')}
          </h4>
        );
      } else if (line.startsWith('---')) {
        elements.push(<hr key={index} className="my-6 border-slate-800" />);
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="my-3 pl-4 border-l-2 border-indigo-500 text-slate-300 italic text-sm bg-indigo-950/20 py-2 rounded-r-lg">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-sm text-slate-300 my-1 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      } else if (line.trim() === '') {
        // empty space
      } else {
        elements.push(
          <p key={index} className="text-sm text-slate-300 my-2 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header Bar */}
      <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{doc.title}</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {doc.filePath}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{doc.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Копирано' : 'Копирай MD'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Изтегли .md</span>
          </button>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="p-6 text-slate-200 font-sans max-w-4xl mx-auto">
        {renderMarkdown(doc.content)}
      </div>
    </div>
  );
};
