import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HttpResponse, RequestItem } from '@postty/contracts';
import { Layers, Send, ShieldCheck, Sparkles, Terminal, Laptop } from 'lucide-react';

export const App: React.FC = () => {
  const [version, setVersion] = useState<string>('Postty Desktop');
  const [url, setUrl] = useState<string>('https://jsonplaceholder.typicode.com/todos/1');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    invoke<string>('get_desktop_version')
      .then((v) => setVersion(v))
      .catch(() => setVersion('Postty Desktop (Tauri v2)'));
  }, []);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const request: RequestItem = {
        id: crypto.randomUUID(),
        collectionId: crypto.randomUUID(),
        folderId: null,
        name: 'Native Call',
        method,
        url,
        queryParams: [],
        headers: [
          { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
          { id: 'h2', key: 'User-Agent', value: 'PosttyDesktop/1.0', enabled: true },
        ],
        body: { mode: 'none' },
        auth: { type: 'none' },
        preRequestScript: '',
        testScript: '',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call Rust backend directly via Tauri IPC
      const res = await invoke<HttpResponse>('execute_native_http', {
        request,
        variables: {},
      });

      setResponse(res);
    } catch (err: any) {
      setResponse({
        statusCode: 0,
        statusText: 'Error',
        headers: {},
        body: err?.toString() || 'Native execution failed',
        sizeBytes: 0,
        timing: { totalDurationMs: 0 },
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-postty-bg text-slate-100 font-sans select-none overflow-hidden">
      {/* Titlebar */}
      <header className="h-12 border-b border-postty-border bg-postty-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {version}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Native Rust Engine (Zero CORS)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 pl-2 border-l border-postty-border">
            <Laptop className="w-3.5 h-3.5" />
            <span>macOS / Desktop</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full space-y-6 overflow-y-auto">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-900/30 via-slate-900 to-indigo-950/20 border border-indigo-500/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Native Desktop API Testing
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Запросы выполняются напрямую через нативный сетевой стек Rust (reqwest/tokio) без ограничений браузера CORS, с поддержкой mTLS и самоподписанных SSL сертификатов.
            </p>
          </div>
        </div>

        {/* Request Configurator */}
        <div className="bg-postty-card border border-postty-border rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="bg-postty-sidebar border border-postty-border rounded-l-lg px-3 py-2.5 text-xs font-bold text-indigo-400 cursor-pointer h-11 focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter endpoint URL..."
              className="flex-1 bg-postty-sidebar border border-postty-border px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 h-11 transition-colors"
            />

            <button
              onClick={handleSend}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-r-lg h-11 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Request</span>
            </button>
          </div>
        </div>

        {/* Response Viewer */}
        <div className="bg-postty-card border border-postty-border rounded-xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-[350px]">
          <div className="px-4 py-3 border-b border-postty-border bg-postty-sidebar/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">Response</span>
              {response && (
                <>
                  <span
                    className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                      response.statusCode >= 200 && response.statusCode < 300
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800/50'
                        : 'text-rose-400 bg-rose-950/70 border-rose-800/50'
                    }`}
                  >
                    {response.statusCode} {response.statusText}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {response.timing?.totalDurationMs ?? 0} ms
                  </span>
                  <span className="text-slate-400 font-medium">
                    {response.sizeBytes} bytes
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {response ? (
              <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(response.body), null, 2);
                  } catch {
                    return response.body;
                  }
                })()}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 p-8">
                <Terminal className="w-8 h-8 text-slate-600 mb-2" />
                <p>Click "Send Request" to test native Rust network execution.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
