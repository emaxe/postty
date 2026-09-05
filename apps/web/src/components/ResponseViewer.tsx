import React, { useState } from 'react';
import { HttpResponse } from '@postty/contracts';
import { Copy, Check, Terminal, Clock, HardDrive, AlertCircle } from 'lucide-react';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
}

type ResponseTab = 'body' | 'headers' | 'raw';

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, isLoading }) => {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBody = (body: string): string => {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  const getStatusColorClass = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-400 bg-emerald-950/70 border-emerald-800/50';
    if (code >= 300 && code < 400) return 'text-cyan-400 bg-cyan-950/70 border-cyan-800/50';
    if (code >= 400 && code < 500) return 'text-amber-400 bg-amber-950/70 border-amber-800/50';
    return 'text-rose-400 bg-rose-950/70 border-rose-800/50';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Executing network request...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs gap-2">
        <Terminal className="w-10 h-10 text-slate-600 mb-2 stroke-[1.5]" />
        <p className="font-medium text-slate-400">No response yet</p>
        <p>Click <span className="text-indigo-400 font-semibold">Send</span> or press <kbd className="px-1.5 py-0.5 bg-postty-card border border-postty-border rounded text-[10px]">Ctrl+Enter</kbd> to inspect the API</p>
      </div>
    );
  }

  const isNetworkError = response.statusCode === 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-postty-bg overflow-hidden">
      {/* Response Status Bar */}
      <div className="px-4 py-2.5 border-b border-postty-border bg-postty-card/50 flex items-center justify-between text-xs">
        {/* Left: Status Badge & Metrics */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            {isNetworkError ? (
              <span className="px-2 py-0.5 rounded border font-semibold flex items-center gap-1 text-rose-400 bg-rose-950/70 border-rose-800/50">
                <AlertCircle className="w-3.5 h-3.5" /> Network Error
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded border font-semibold ${getStatusColorClass(
                  response.statusCode
                )}`}
              >
                {response.statusCode} {response.statusText}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{response.timing.totalDurationMs} ms</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{(response.sizeBytes / 1024).toFixed(2)} KB</span>
          </div>
        </div>

        {/* Right: Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy Response</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-postty-border px-4 gap-6 text-xs font-medium bg-postty-sidebar/30">
        <button
          onClick={() => setActiveTab('body')}
          className={`py-2 transition-colors border-b-2 ${
            activeTab === 'body'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`py-2 transition-colors border-b-2 ${
            activeTab === 'headers'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Headers ({Object.keys(response.headers).length})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-2 transition-colors border-b-2 ${
            activeTab === 'raw'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Raw
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'body' && (
          <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap break-all">
            {formatBody(response.body)}
          </pre>
        )}

        {activeTab === 'headers' && (
          <div className="border border-postty-border rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-postty-card border-b border-postty-border text-slate-400 font-medium">
                <tr>
                  <th className="p-2.5">Header</th>
                  <th className="p-2.5">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-postty-border font-mono">
                {Object.entries(response.headers).map(([key, val]) => (
                  <tr key={key} className="hover:bg-postty-card/50">
                    <td className="p-2.5 text-indigo-300 font-semibold w-1/3">{key}</td>
                    <td className="p-2.5 text-slate-300 break-all">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'raw' && (
          <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap break-all">
            {response.body}
          </pre>
        )}
      </div>
    </div>
  );
};
